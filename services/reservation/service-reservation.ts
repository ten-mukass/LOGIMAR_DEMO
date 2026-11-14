/**
 * Parcours de réservation : blocage des places, paiement, émission des billets et de la facture.
 * En production, ce service tourne côté serveur, dans une transaction de base de données ;
 * dans la démo, il tourne dans le navigateur avec le DemoRepository et l'opérateur simulé.
 *
 * Une commande regroupe une réservation (aller simple) ou deux (aller-retour) : un paiement, une facture.
 * Règles : prix figé au blocage pendant la durée configurée (15 min) ; billets émis seulement après
 * confirmation de l'opérateur (callback ou consultation), une seule fois par paiement (idempotence) ;
 * un échec d'envoi d'e-mail ne bloque jamais l'émission.
 */
import { formaterTelephone, validerContact } from "@/domain/contact"
import { emailConfirmation } from "@/domain/messages"
import { choisirOptions, lignesOptions, lignesPassagers, totalLignes } from "@/domain/montants"
import { compositionDe, estBlocageActif, finDeBlocage } from "@/domain/occupation"
import { validerPassager, type SaisiePassager } from "@/domain/passagers"
import { estOuverteALaVente, jourDeDepart } from "@/domain/programme"
import { genererReference } from "@/domain/reference"
import { meilleureOffre } from "@/domain/tarifs"
import { jourLocal } from "@/domain/temps"
import type {
  CodeFamille,
  Commande,
  LigneOption,
  OptionCatalogue,
  Paiement,
  Reservation,
  Traversee,
} from "@/domain/types"
import type { NotificationService } from "../notification/notification-service"
import type { EvenementPaiement, Operateur, PaymentProvider } from "../paiement/payment-provider"
import type { Repository } from "../repository/repository"

export interface SegmentDemande {
  traverseeId: string
  familleCode: CodeFamille
  /** Total affiché au client avant le blocage, pour l'avertir si le prix a changé. */
  totalAffiche: number
}

export interface DemandeBlocage {
  /** Aller, puis retour éventuel. */
  segments: SegmentDemande[]
  passagers: SaisiePassager[]
  telephone: string
  email: string
  clientId?: string | null
}

export type RaisonRefus =
  | "introuvable"
  | "vente-close"
  | "complet"
  | "places-insuffisantes"
  | "famille-epuisee"
  | "donnees-invalides"
  | "retour-invalide"
  | "blocage-expire"
  | "statut-invalide"
  | "operateur-inactif"

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; raison: RaisonRefus; message: string }

const MESSAGES: Record<RaisonRefus, string> = {
  introuvable: "Réservation ou traversée introuvable.",
  "vente-close": "La vente en ligne est close pour cette traversée.",
  complet: "Cette traversée est complète.",
  "places-insuffisantes": "Il ne reste plus assez de places pour tous les passagers.",
  "famille-epuisee": "Ce tarif n’est plus disponible : choisissez-en un autre.",
  "donnees-invalides": "Certaines informations sont incomplètes ou invalides.",
  "retour-invalide": "Le retour doit partir dans l’autre sens, après l’arrivée de l’aller.",
  "blocage-expire": "Le délai de 15 minutes est dépassé : les places ont été libérées.",
  "statut-invalide": "Cette réservation ne peut plus être payée.",
  "operateur-inactif": "Ce moyen de paiement n’est pas disponible.",
}

function refus<T>(raison: RaisonRefus, message = MESSAGES[raison]): Resultat<T> {
  return { ok: false, raison, message }
}

export interface DependancesService {
  repository: Repository
  operateurs: Record<Operateur, PaymentProvider>
  notifications: NotificationService
  horloge: () => Date
  /** Aléa pour les références de billet (cryptographique dans le navigateur). */
  aleatoire: () => number
  genererId: () => string
}

export interface CommandeDetaillee {
  commande: Commande
  reservations: Reservation[]
}

/** Total de réservations avec des options identiques sur chaque trajet (prix des passagers figés au blocage). */
export function totalAvecOptions(reservations: Reservation[], options: LigneOption[], catalogue: OptionCatalogue[]): number {
  return reservations.reduce(
    (total, r) =>
      total +
      totalLignes([...lignesPassagers(r.prixUnitaires, compositionDe(r.passagers)), ...lignesOptions(options, catalogue)]),
    0,
  )
}

export class ServiceReservation {
  constructor(private readonly d: DependancesService) {}

  /** Bloque les places de chaque trajet et fige le prix du palier ouvert le moins cher. */
  async bloquer(demande: DemandeBlocage): Promise<Resultat<CommandeDetaillee & { prixModifie: boolean }>> {
    const { repository, horloge } = this.d
    const maintenant = horloge()
    const { config, lignes } = await repository.getReferentiel()
    if (demande.segments.length < 1 || demande.segments.length > 2) return refus("donnees-invalides")

    const traversees: Traversee[] = []
    for (const s of demande.segments) {
      const t = await repository.getTraversee(s.traverseeId)
      if (!t) return refus("introuvable")
      if (!estOuverteALaVente(t, maintenant, config.ventesEnLigneJusqua)) return refus("vente-close")
      traversees.push(t)
    }
    if (traversees.length === 2) {
      const [aller, retour] = traversees.map((t) => lignes.find((l) => l.id === t.ligneId))
      const sensInverse = aller && retour && aller.portDepartId === retour.portArriveeId && aller.portArriveeId === retour.portDepartId
      if (!sensInverse || Date.parse(traversees[1].departAt) <= Date.parse(traversees[0].arriveeAt)) {
        return refus("retour-invalide")
      }
    }

    const contact = validerContact({ telephone: demande.telephone, email: demande.email })
    const composition = compositionDe(demande.passagers)
    const passagersInvalides = traversees.some((t) =>
      demande.passagers.some((p) => Object.keys(validerPassager(p, jourDeDepart(t), config.bornesAge)).length > 0),
    )
    if (Object.keys(contact).length > 0 || passagersInvalides || composition.adultes < 1) {
      return refus("donnees-invalides")
    }

    const commandeId = this.d.genererId()
    const telephone = demande.telephone.trim() ? formaterTelephone(demande.telephone) : null
    const email = demande.email.trim() ? demande.email.trim().toLowerCase() : null
    const bloqueeJusquA = finDeBlocage(maintenant, config.dureeBlocageMinutes)
    const inventaires = await repository.listerInventaires(
      traversees.map((t) => t.id),
      maintenant,
    )
    const reservations: Reservation[] = []
    let prixModifie = false
    for (const [i, traversee] of traversees.entries()) {
      const segment = demande.segments[i]
      const inventaire = inventaires.find((inv) => inv.traversee.id === traversee.id)
      if (!inventaire) return refus("introuvable")
      const offre = meilleureOffre(
        inventaire.classes,
        segment.familleCode,
        composition,
        traversee.capaciteVendable,
        inventaire.occupation,
      )
      if (!offre.disponible) return refus(offre.raison)
      if (offre.total !== segment.totalAffiche) prixModifie = true
      const id = this.d.genererId()
      reservations.push({
        id,
        commandeId,
        reference: "",
        traverseeId: traversee.id,
        familleCode: segment.familleCode,
        classeId: offre.classe.id,
        statut: "bloquee",
        telephone,
        email,
        passagers: demande.passagers.map((p, n) => ({
          id: `${id}-p${n + 1}`,
          categorie: p.categorie,
          nom: p.nom.trim().toUpperCase(),
          prenom: p.prenom.trim(),
          dateNaissance: p.categorie === "adulte" ? null : p.dateNaissance,
          typePiece: p.categorie === "adulte" && p.typePiece ? p.typePiece : null,
          numeroPiece: p.categorie === "adulte" ? p.numeroPiece.trim().toUpperCase() : null,
        })),
        prixUnitaires: offre.prixUnitaires,
        options: [],
        total: offre.total,
        devise: "XAF",
        bloqueeJusquA,
        canal: "web",
        moyenPaiement: null,
        creeLe: maintenant.toISOString(),
      })
    }

    const commande: Commande = {
      id: commandeId,
      reservationIds: reservations.map((r) => r.id),
      telephone,
      email,
      statut: "en-cours",
      total: reservations.reduce((s, r) => s + r.total, 0),
      numeroFacture: null,
      factureEmiseLe: null,
      clientId: demande.clientId ?? null,
      creeLe: maintenant.toISOString(),
    }
    // Tout ou rien : rien n'est enregistré si un trajet n'est pas disponible.
    for (const r of reservations) await repository.enregistrerReservation(r)
    await repository.enregistrerCommande(commande)
    return { ok: true, valeur: { commande, reservations, prixModifie } }
  }

  /** Lit une commande et ses réservations, en passant à « expirée » ce dont le blocage est dépassé. */
  async lireCommande(id: string): Promise<CommandeDetaillee | null> {
    const { repository, horloge } = this.d
    const commande = await repository.getCommande(id)
    if (!commande) return null
    const reservations: Reservation[] = []
    for (const rid of commande.reservationIds) {
      const r = await repository.getReservation(rid)
      if (!r) continue
      if (r.statut === "bloquee" && !estBlocageActif(r, horloge())) {
        const expiree: Reservation = { ...r, statut: "expiree" }
        await repository.enregistrerReservation(expiree)
        reservations.push(expiree)
      } else reservations.push(r)
    }
    if (commande.statut === "en-cours" && reservations.some((r) => r.statut === "expiree")) {
      const expiree: Commande = { ...commande, statut: "expiree" }
      await repository.enregistrerCommande(expiree)
      return { commande: expiree, reservations }
    }
    return { commande, reservations }
  }

  /** Le client abandonne le paiement : les places sont libérées tout de suite. */
  async liberer(commandeId: string): Promise<void> {
    const detail = await this.lireCommande(commandeId)
    if (!detail || detail.commande.statut !== "en-cours") return
    for (const r of detail.reservations) {
      if (r.statut === "bloquee") await this.d.repository.enregistrerReservation({ ...r, statut: "annulee" })
    }
    await this.d.repository.enregistrerCommande({ ...detail.commande, statut: "abandonnee" })
  }

  /** Demande le paiement à l'opérateur. Les billets ne sont pas émis ici. */
  async payer(
    commandeId: string,
    saisie: { operateur: Operateur; numero: string; options: Partial<Record<LigneOption["code"], number>> },
  ): Promise<Resultat<Paiement>> {
    const { repository, horloge } = this.d
    const referentiel = await repository.getReferentiel()
    const detail = await this.lireCommande(commandeId)
    if (!detail) return refus("introuvable")
    const { commande, reservations } = detail
    if (commande.statut === "expiree") return refus("blocage-expire")
    if (commande.statut !== "en-cours" || reservations.some((r) => r.statut !== "bloquee")) return refus("statut-invalide")
    if (!referentiel.operateurs.some((o) => o.code === saisie.operateur)) return refus("operateur-inactif")
    if (!formaterTelephone(saisie.numero)) return refus("donnees-invalides", "Numéro Mobile Money invalide.")

    // Mêmes options sur chaque trajet ; la famille du premier trajet décide de ce qui est proposé.
    const options: LigneOption[] = []
    for (const r of reservations) {
      const choix = choisirOptions(saisie.options, referentiel.options, r.familleCode)
      if (choix.erreurs.length > 0) return refus("donnees-invalides", choix.erreurs[0])
      if (options.length === 0) options.push(...choix.options)
    }

    const maintenant = horloge()
    for (const r of reservations) {
      await repository.enregistrerReservation({
        ...r,
        options,
        total: totalAvecOptions([r], options, referentiel.options),
        moyenPaiement: saisie.operateur,
      })
    }
    const total = totalAvecOptions(reservations, options, referentiel.options)
    await repository.enregistrerCommande({ ...commande, total })

    const id = this.d.genererId()
    const paiement: Paiement = {
      id,
      commandeId,
      moyen: saisie.operateur,
      numero: formaterTelephone(saisie.numero) as string,
      montant: total,
      statut: "en-attente",
      refTransaction: `TX-${id.replace(/-/g, "").slice(-16).toUpperCase()}`,
      refOperateur: null,
      creeLe: maintenant.toISOString(),
      majLe: maintenant.toISOString(),
    }
    await repository.enregistrerPaiement(paiement)
    await this.d.operateurs[saisie.operateur].initierPaiement({
      refTransaction: paiement.refTransaction,
      montant: total,
      numero: paiement.numero,
      description: `LOGIMAR 241 — ${reservations.length > 1 ? "aller-retour" : "traversée"}`,
    })
    return { ok: true, valeur: paiement }
  }

  /** Point d'entrée des callbacks des opérateurs (webhook en production). */
  async traiterCallback(operateur: Operateur, contenu: unknown): Promise<void> {
    const evenement = await this.d.operateurs[operateur].traiterCallback(contenu)
    if (evenement) await this.appliquer(evenement)
  }

  /** Filet de sécurité : interroge l'opérateur si le callback n'est pas arrivé. Renvoie le paiement à jour. */
  async verifierPaiement(paiementId: string): Promise<Paiement | null> {
    const paiement = await this.d.repository.getPaiement(paiementId)
    if (!paiement || paiement.statut !== "en-attente") return paiement
    const { statut, refOperateur } = await this.d.operateurs[paiement.moyen].consulterStatut(paiement.refTransaction)
    if (statut !== "en-attente") await this.appliquer({ refTransaction: paiement.refTransaction, statut, refOperateur })
    return this.d.repository.getPaiement(paiementId)
  }

  /** Applique une confirmation ou un refus, une seule fois. */
  private async appliquer(evenement: EvenementPaiement): Promise<void> {
    const { repository, horloge } = this.d
    const paiement = await repository.trouverPaiementParTransaction(evenement.refTransaction)
    if (!paiement || paiement.statut !== "en-attente") return // déjà traité : idempotence
    const maintenant = horloge()
    await repository.enregistrerPaiement({
      ...paiement,
      statut: evenement.statut,
      refOperateur: evenement.refOperateur,
      majLe: maintenant.toISOString(),
    })
    if (evenement.statut !== "reussi") return

    const commande = await repository.getCommande(paiement.commandeId)
    // En production : un paiement confirmé après expiration du blocage déclenche un remboursement.
    if (!commande || commande.statut !== "en-cours") return
    const emises: Reservation[] = []
    for (const rid of commande.reservationIds) {
      const r = await repository.getReservation(rid)
      if (!r || r.statut !== "bloquee") continue
      const emise: Reservation = { ...r, statut: "emise", reference: await this.nouvelleReference(), bloqueeJusquA: null }
      await repository.enregistrerReservation(emise)
      emises.push(emise)
    }
    const payee: Commande = {
      ...commande,
      statut: "payee",
      numeroFacture: await repository.prochainNumeroFacture(Number(jourLocal(maintenant).slice(0, 4))),
      factureEmiseLe: maintenant.toISOString(),
    }
    await repository.enregistrerCommande(payee)
    await this.envoyerConfirmation(payee, emises)
  }

  /** E-mail avec billet et facture si une adresse a été donnée. Ne bloque jamais l'émission. */
  private async envoyerConfirmation(commande: Commande, reservations: Reservation[]): Promise<void> {
    if (!commande.email) return
    try {
      const { ports, lignes } = await this.d.repository.getReferentiel()
      const segments = []
      for (const reservation of reservations) {
        const traversee = await this.d.repository.getTraversee(reservation.traverseeId)
        if (!traversee) continue
        const ligne = lignes.find((l) => l.id === traversee.ligneId)
        segments.push({
          reservation,
          traversee,
          depart: ports.find((p) => p.id === ligne?.portDepartId),
          arrivee: ports.find((p) => p.id === ligne?.portArriveeId),
        })
      }
      const { objet, texte } = emailConfirmation(commande, segments)
      await this.d.notifications.envoyerEmail({
        destinataire: commande.email,
        objet,
        texte,
        pieces: [
          { nom: `billet-${reservations[0]?.reference ?? commande.id}.pdf`, type: "billet" },
          { nom: `facture-${commande.numeroFacture}.pdf`, type: "facture" },
        ],
        commandeId: commande.id,
        clientId: commande.clientId,
      })
    } catch {
      // Journalisé par le service d'envoi en production ; le billet reste émis.
    }
  }

  private async nouvelleReference(): Promise<string> {
    let reference = genererReference(this.d.aleatoire)
    while (await this.d.repository.referenceExiste(reference)) reference = genererReference(this.d.aleatoire)
    return reference
  }
}
