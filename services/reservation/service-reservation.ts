/**
 * Parcours de réservation : blocage des places, paiement, émission du billet.
 * En production, ce service tourne côté serveur, dans une transaction de base de données ;
 * dans la démo, il tourne dans le navigateur avec le DemoRepository et l'opérateur simulé.
 *
 * Règles : prix figé au blocage pendant la durée configurée (15 min) ; billet émis seulement après
 * confirmation de l'opérateur (callback ou consultation), une seule fois par paiement (idempotence).
 */
import { formaterTelephone, validerContact } from "@/domain/contact"
import { choisirOptions, lignesPassagers, totalLignes, lignesOptions } from "@/domain/montants"
import { compositionDe, estBlocageActif, finDeBlocage } from "@/domain/occupation"
import { validerPassager, type SaisiePassager } from "@/domain/passagers"
import { estOuverteALaVente, jourDeDepart } from "@/domain/programme"
import { genererReference } from "@/domain/reference"
import { meilleureOffre } from "@/domain/tarifs"
import type { CodeFamille, LigneOption, Paiement, Reservation } from "@/domain/types"
import type { EvenementPaiement, Operateur, PaymentProvider } from "../paiement/payment-provider"
import type { Repository } from "../repository/repository"

export interface DemandeBlocage {
  traverseeId: string
  familleCode: CodeFamille
  passagers: SaisiePassager[]
  telephone: string
  email: string
  /** Total affiché au client avant le blocage, pour l'avertir si le prix a changé. */
  totalAffiche: number
}

export type RaisonRefus =
  | "introuvable"
  | "vente-close"
  | "complet"
  | "places-insuffisantes"
  | "famille-epuisee"
  | "donnees-invalides"
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
  horloge: () => Date
  /** Aléa pour les références de billet (cryptographique dans le navigateur). */
  aleatoire: () => number
  genererId: () => string
}

export class ServiceReservation {
  constructor(private readonly d: DependancesService) {}

  /** Bloque les places et fige le prix du palier ouvert le moins cher. */
  async bloquer(demande: DemandeBlocage): Promise<Resultat<{ reservation: Reservation; prixModifie: boolean }>> {
    const { repository, horloge } = this.d
    const maintenant = horloge()
    const { config } = await repository.getReferentiel()
    const traversee = await repository.getTraversee(demande.traverseeId)
    if (!traversee) return refus("introuvable")
    if (!estOuverteALaVente(traversee, maintenant, config.ventesEnLigneJusqua)) return refus("vente-close")

    const contact = validerContact({ telephone: demande.telephone, email: demande.email })
    const jour = jourDeDepart(traversee)
    const passagersInvalides = demande.passagers.some(
      (p) => Object.keys(validerPassager(p, jour, config.bornesAge)).length > 0,
    )
    const composition = compositionDe(demande.passagers)
    if (Object.keys(contact).length > 0 || passagersInvalides || composition.adultes < 1) {
      return refus("donnees-invalides")
    }

    const [inventaire] = await repository.listerInventaires([traversee.id], maintenant)
    const offre = meilleureOffre(
      inventaire.classes,
      demande.familleCode,
      composition,
      traversee.capaciteVendable,
      inventaire.occupation,
    )
    if (!offre.disponible) return refus(offre.raison)

    const id = this.d.genererId()
    const reservation: Reservation = {
      id,
      reference: "",
      traverseeId: traversee.id,
      familleCode: demande.familleCode,
      classeId: offre.classe.id,
      statut: "bloquee",
      telephone: demande.telephone.trim() ? formaterTelephone(demande.telephone) : null,
      email: demande.email.trim() ? demande.email.trim().toLowerCase() : null,
      passagers: demande.passagers.map((p, i) => ({
        id: `${id}-p${i + 1}`,
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
      bloqueeJusquA: finDeBlocage(maintenant, config.dureeBlocageMinutes),
      canal: "web",
      moyenPaiement: null,
      creeLe: maintenant.toISOString(),
    }
    await repository.enregistrerReservation(reservation)
    return { ok: true, valeur: { reservation, prixModifie: offre.total !== demande.totalAffiche } }
  }

  /** Lit une réservation en passant au statut « expirée » si son blocage est dépassé. */
  async lireReservation(id: string): Promise<Reservation | null> {
    const r = await this.d.repository.getReservation(id)
    if (r && r.statut === "bloquee" && !estBlocageActif(r, this.d.horloge())) {
      const expiree: Reservation = { ...r, statut: "expiree" }
      await this.d.repository.enregistrerReservation(expiree)
      return expiree
    }
    return r
  }

  /** Le client abandonne le paiement : les places sont libérées tout de suite. */
  async liberer(id: string): Promise<void> {
    const r = await this.d.repository.getReservation(id)
    if (r && r.statut === "bloquee") await this.d.repository.enregistrerReservation({ ...r, statut: "annulee" })
  }

  /** Total d'une réservation avec les options choisies (prix des passagers figé au blocage). */
  totalAvecOptions(reservation: Reservation, options: LigneOption[], catalogue: Parameters<typeof lignesOptions>[1]): number {
    const composition = compositionDe(reservation.passagers)
    return totalLignes([...lignesPassagers(reservation.prixUnitaires, composition), ...lignesOptions(options, catalogue)])
  }

  /** Demande le paiement à l'opérateur. Le billet n'est pas émis ici. */
  async payer(
    reservationId: string,
    saisie: { operateur: Operateur; numero: string; options: Partial<Record<LigneOption["code"], number>> },
  ): Promise<Resultat<Paiement>> {
    const { repository, horloge } = this.d
    const referentiel = await repository.getReferentiel()
    const reservation = await this.lireReservation(reservationId)
    if (!reservation) return refus("introuvable")
    if (reservation.statut === "expiree") return refus("blocage-expire")
    if (reservation.statut !== "bloquee") return refus("statut-invalide")
    if (!referentiel.operateurs.some((o) => o.code === saisie.operateur)) return refus("operateur-inactif")
    if (!formaterTelephone(saisie.numero)) return refus("donnees-invalides", "Numéro Mobile Money invalide.")

    const { options, erreurs } = choisirOptions(saisie.options, referentiel.options, reservation.familleCode)
    if (erreurs.length > 0) return refus("donnees-invalides", erreurs[0])

    const maintenant = horloge()
    const total = this.totalAvecOptions(reservation, options, referentiel.options)
    const id = this.d.genererId()
    const paiement: Paiement = {
      id,
      reservationId,
      moyen: saisie.operateur,
      numero: formaterTelephone(saisie.numero) as string,
      montant: total,
      statut: "en-attente",
      refTransaction: `TX-${id.replace(/-/g, "").slice(0, 16).toUpperCase()}`,
      refOperateur: null,
      creeLe: maintenant.toISOString(),
      majLe: maintenant.toISOString(),
    }
    await repository.enregistrerReservation({ ...reservation, options, total, moyenPaiement: saisie.operateur })
    await repository.enregistrerPaiement(paiement)
    await this.d.operateurs[saisie.operateur].initierPaiement({
      refTransaction: paiement.refTransaction,
      montant: total,
      numero: paiement.numero,
      description: `Traversée LOGIMAR 241 — ${reservation.passagers.length} passager(s)`,
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
    const maintenant = horloge().toISOString()
    await repository.enregistrerPaiement({
      ...paiement,
      statut: evenement.statut,
      refOperateur: evenement.refOperateur,
      majLe: maintenant,
    })
    if (evenement.statut !== "reussi") return

    const reservation = await repository.getReservation(paiement.reservationId)
    // En production : un paiement confirmé après expiration du blocage déclenche un remboursement.
    if (!reservation || reservation.statut !== "bloquee") return
    await repository.enregistrerReservation({
      ...reservation,
      statut: "emise",
      reference: await this.nouvelleReference(),
      bloqueeJusquA: null,
    })
  }

  private async nouvelleReference(): Promise<string> {
    let reference = genererReference(this.d.aleatoire)
    while (await this.d.repository.referenceExiste(reference)) reference = genererReference(this.d.aleatoire)
    return reference
  }
}
