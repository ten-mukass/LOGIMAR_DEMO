/**
 * Repository du navigateur quand les données du site sont en base (étape 7B, docs/PLAN_BASE_DE_DONNEES.md).
 *
 * - Référentiel, traversées, inventaires, réservations, commandes, paiements, e-mails de confirmation :
 *   lus sur le serveur par les actions de `services/serveur/actions-site.ts`.
 * - Le navigateur n'écrit rien dans la base par ce Repository : blocage, paiement, émission passent par
 *   ServiceReservationDistant (calculs et transaction sur le serveur).
 * - Comptes clients, codes de vérification et leurs e-mails restent sur l'appareil (DemoRepository local),
 *   comme prévu au plan.
 * - L'appareil garde les identifiants des réservations qu'il a faites ou retrouvées (et leur référence) :
 *   c'est ce qui l'autorise à relire un billet, le serveur ne rendant rien sur la seule référence.
 */
import type { ParametresGestion } from "@/domain/config"
import type {
  ChangementPalier,
  Client,
  ClotureEmbarquement,
  CodeFamille,
  CodeVerification,
  Commande,
  Embarquement,
  Envoi,
  InfoTrafic,
  Paiement,
  Reservation,
  ScanEmbarquement,
  Traversee,
} from "@/domain/types"
import * as actions from "../serveur/actions-site"
import { lireJson, type Stockage } from "../stockage"
import type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository"

const CLE = "logimar-demo:v1:reservations-base"

interface Memoire {
  /** Identifiants des réservations faites ou retrouvées sur cet appareil. */
  ids: string[]
  /** Référence de billet → identifiant de la réservation. */
  references: Record<string, string>
}

function interdit(quoi: string): never {
  throw new Error(`${quoi} : se fait sur le serveur, pas depuis le navigateur.`)
}

export class RepositoryDistant implements Repository {
  private referentiel: Promise<Referentiel> | null = null

  constructor(
    /** Comptes clients, codes et leurs e-mails (sur l'appareil). */
    private readonly local: Repository,
    private readonly stockage: Stockage,
  ) {}

  // Mémoire de l'appareil --------------------------------------------------

  private memoire(): Memoire {
    const m = lireJson<Partial<Memoire>>(this.stockage, CLE, {})
    return { ids: m.ids ?? [], references: m.references ?? {} }
  }

  /** Retient les réservations reçues du serveur : l'appareil pourra les relire. */
  memoriser(reservations: Reservation[]): void {
    if (reservations.length === 0) return
    const m = this.memoire()
    const ids = new Set(m.ids)
    const references = { ...m.references }
    for (const r of reservations) {
      ids.add(r.id)
      if (r.reference) references[r.reference] = r.id
    }
    this.stockage.ecrire(CLE, JSON.stringify({ ids: [...ids], references }))
  }

  /** « Mes billets » : recherche sur le serveur par référence et contact ; le billet trouvé est retenu. */
  async rechercherBillet(reference: string, contact: string): Promise<Reservation | null> {
    const resultat = await actions.rechercherBillet(reference, contact)
    if (!resultat.ok) return null
    this.memoriser([resultat.valeur])
    return resultat.valeur
  }

  private async reservations(ids: string[]): Promise<Reservation[]> {
    if (ids.length === 0) return []
    const lues = await actions.lireReservations(ids)
    this.memoriser(lues)
    return lues
  }

  // Transaction : uniquement sur le serveur ------------------------------------

  async transaction<R>(): Promise<R> {
    interdit("Transaction")
  }

  // Référentiel et ventes (l'heure est celle du serveur) ----------------------------

  getReferentiel(): Promise<Referentiel> {
    this.referentiel ??= actions.lireReferentiel().catch((e) => {
      this.referentiel = null
      throw e
    })
    return this.referentiel
  }

  getInfosTrafic(): Promise<InfoTrafic[]> {
    return actions.lireInfosTrafic()
  }

  listerTraversees(filtre?: FiltreTraversees): Promise<Traversee[]> {
    return actions.lireTraversees(filtre ?? {})
  }

  getTraversee(id: string): Promise<Traversee | null> {
    return actions.lireTraversee(id)
  }

  async listerInventaires(traverseeIds: string[]): Promise<Inventaire[]> {
    return traverseeIds.length === 0 ? [] : actions.lireInventaires(traverseeIds)
  }

  repartitionParFamille(): Promise<Record<CodeFamille, number>> {
    return actions.lireRepartitionParFamille()
  }

  async exempleBillet(): Promise<{ reference: string; contact: string } | null> {
    return actions.lireExempleBillet()
  }

  // Back-office et embarquement : restent sur la démo du navigateur jusqu'à l'étape D -----

  async listerReservations(): Promise<Reservation[]> {
    interdit("Liste des réservations")
  }

  async listerChangementsPaliers(): Promise<ChangementPalier[]> {
    interdit("Changements de paliers")
  }

  async enregistrerChangementPalier(): Promise<void> {
    interdit("Changement de palier")
  }

  async getParametresGestion(): Promise<ParametresGestion> {
    interdit("Paramètres de gestion")
  }

  /** Le scan reste sur l'appareil du contrôleur jusqu'à l'étape D : rien à montrer sur le billet du client. */
  async listerEmbarquements(): Promise<Embarquement[]> {
    return []
  }

  async enregistrerEmbarquements(): Promise<void> {
    interdit("Embarquement")
  }

  async supprimerEmbarquement(): Promise<void> {
    interdit("Embarquement")
  }

  async listerScans(): Promise<ScanEmbarquement[]> {
    return []
  }

  async enregistrerScan(): Promise<void> {
    interdit("Scan")
  }

  async getClotureEmbarquement(): Promise<ClotureEmbarquement | null> {
    return null
  }

  async definirClotureEmbarquement(): Promise<void> {
    interdit("Clôture de l'embarquement")
  }

  // Réservations, commandes, paiements : par identifiant ---------------------------

  async getReservation(id: string): Promise<Reservation | null> {
    return (await this.reservations([id]))[0] ?? null
  }

  /** Seulement pour un billet déjà connu de l'appareil (réservé ou retrouvé ici). */
  async trouverReservationParReference(reference: string): Promise<Reservation | null> {
    const id = this.memoire().references[reference]
    if (!id) return null
    const r = await this.getReservation(id)
    return r?.reference === reference ? r : null
  }

  async referenceExiste(): Promise<boolean> {
    interdit("Contrôle des références")
  }

  async enregistrerReservation(): Promise<void> {
    interdit("Enregistrement d'une réservation")
  }

  async listerReservationsLocales(): Promise<Reservation[]> {
    return this.reservations(this.memoire().ids)
  }

  getCommande(id: string): Promise<Commande | null> {
    return actions.lireCommande(id)
  }

  /** Seul cas venu du navigateur : rattacher la commande au compte client créé sur l'appareil. */
  async enregistrerCommande(commande: Commande): Promise<void> {
    if (commande.clientId) await actions.rattacherCommandeAuCompte(commande.id, commande.clientId)
  }

  async prochainNumeroFacture(): Promise<string> {
    interdit("Numéro de facture")
  }

  async getPaiement(): Promise<Paiement | null> {
    interdit("Lecture d'un paiement")
  }

  async trouverPaiementParTransaction(): Promise<Paiement | null> {
    interdit("Lecture d'un paiement")
  }

  listerPaiements(commandeId: string): Promise<Paiement[]> {
    return actions.lirePaiements(commandeId)
  }

  async enregistrerPaiement(): Promise<void> {
    interdit("Enregistrement d'un paiement")
  }

  // E-mails : confirmations sur le serveur, codes des comptes sur l'appareil -----------

  async getEnvoi(id: string): Promise<Envoi | null> {
    return (await this.local.getEnvoi(id)) ?? actions.lireEnvoi(id)
  }

  async listerEnvois(filtre: { commandeId?: string; clientId?: string }): Promise<Envoi[]> {
    if (filtre.commandeId) return actions.lireEnvoisCommande(filtre.commandeId)
    return this.local.listerEnvois(filtre)
  }

  enregistrerEnvoi(envoi: Envoi): Promise<void> {
    return this.local.enregistrerEnvoi(envoi)
  }

  // Comptes clients : sur l'appareil -----------------------------------------------

  getClient(id: string): Promise<Client | null> {
    return this.local.getClient(id)
  }

  trouverClient(identifiant: string): Promise<Client | null> {
    return this.local.trouverClient(identifiant)
  }

  enregistrerClient(client: Client): Promise<void> {
    return this.local.enregistrerClient(client)
  }

  supprimerClient(id: string): Promise<void> {
    return this.local.supprimerClient(id)
  }

  enregistrerCode(code: CodeVerification): Promise<void> {
    return this.local.enregistrerCode(code)
  }

  dernierCode(clientId: string, objet: CodeVerification["objet"]): Promise<CodeVerification | null> {
    return this.local.dernierCode(clientId, objet)
  }

  supprimerCodes(clientId: string): Promise<void> {
    return this.local.supprimerCodes(clientId)
  }
}
