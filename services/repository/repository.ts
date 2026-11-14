/**
 * Accès aux données. Les écrans ne connaissent que cette interface.
 * Démo : DemoRepository (données d'exemple + navigateur). Production : implémentation serveur (PostgreSQL).
 * Toutes les méthodes sont asynchrones pour que le passage au serveur ne change pas les écrans.
 */
import type { ConfigCommerciale, ConfigPaiementSimule } from "@/domain/config"
import type { Occupation } from "@/domain/tarifs"
import type { RubriqueAide } from "@/data/seed/aide"
import type { Societe } from "@/data/seed/societe"
import type {
  Agence,
  ClasseReservation,
  Client,
  CodeFamille,
  CodeVerification,
  Commande,
  Envoi,
  FamilleTarifaire,
  InfoTrafic,
  Ligne,
  Navire,
  OperateurMobile,
  OptionCatalogue,
  Paiement,
  Port,
  RegleProgramme,
  Reservation,
  Terminal,
  Traversee,
} from "@/domain/types"

export interface Referentiel {
  config: ConfigCommerciale
  ports: Port[]
  terminaux: Terminal[]
  lignes: Ligne[]
  navires: Navire[]
  /** Programme type (affiché sur la page Horaires). */
  regles: RegleProgramme[]
  familles: FamilleTarifaire[]
  options: OptionCatalogue[]
  agences: Agence[]
  /** Opérateurs Mobile Money actifs. */
  operateurs: OperateurMobile[]
  textes: { regleEnregistrement: string }
  /** Démo seulement : réglages du paiement simulé, affichés pour le présentateur (null en production). */
  paiementSimule: ConfigPaiementSimule | null
  /** Émetteur des factures. */
  societe: Societe
  rubriquesAide: RubriqueAide[]
}

export interface FiltreTraversees {
  ligneId?: string
  /** Jour de départ minimal (AAAA-MM-JJ, inclus). */
  du?: string
  /** Jour de départ maximal (inclus). */
  au?: string
}

/** État des ventes d'une traversée à un instant donné. */
export interface Inventaire {
  traversee: Traversee
  classes: ClasseReservation[]
  occupation: Occupation
  placesRestantes: number
}

export interface Repository {
  getReferentiel(): Promise<Referentiel>
  /** Messages d'info trafic actifs à cet instant. */
  getInfosTrafic(maintenant: Date): Promise<InfoTrafic[]>
  listerTraversees(filtre?: FiltreTraversees): Promise<Traversee[]>
  getTraversee(id: string): Promise<Traversee | null>
  listerInventaires(traverseeIds: string[], maintenant: Date): Promise<Inventaire[]>
  /** Passagers vendus par famille tarifaire jusqu'à cet instant (« Le plus choisi », tableaux de bord). */
  repartitionParFamille(maintenant: Date): Promise<Record<CodeFamille, number>>

  getReservation(id: string): Promise<Reservation | null>
  trouverReservationParReference(reference: string): Promise<Reservation | null>
  referenceExiste(reference: string): Promise<boolean>
  /** Crée ou remplace une réservation. */
  enregistrerReservation(reservation: Reservation): Promise<void>

  /** Réservations faites ou payées sur cet appareil (démo) ; en production : celles du client connecté. */
  listerReservationsLocales(): Promise<Reservation[]>

  getCommande(id: string): Promise<Commande | null>
  enregistrerCommande(commande: Commande): Promise<void>
  /** Numéro de facture suivant, séquentiel et sans trou pour l'année. */
  prochainNumeroFacture(annee: number): Promise<string>

  getPaiement(id: string): Promise<Paiement | null>
  trouverPaiementParTransaction(refTransaction: string): Promise<Paiement | null>
  listerPaiements(commandeId: string): Promise<Paiement[]>
  /** Crée ou remplace un paiement. */
  enregistrerPaiement(paiement: Paiement): Promise<void>

  getEnvoi(id: string): Promise<Envoi | null>
  listerEnvois(filtre: { commandeId?: string; clientId?: string }): Promise<Envoi[]>
  enregistrerEnvoi(envoi: Envoi): Promise<void>

  getClient(id: string): Promise<Client | null>
  /** Recherche par e-mail (minuscules) ou téléphone (format +241 …). */
  trouverClient(identifiant: string): Promise<Client | null>
  enregistrerClient(client: Client): Promise<void>
  supprimerClient(id: string): Promise<void>

  enregistrerCode(code: CodeVerification): Promise<void>
  dernierCode(clientId: string, objet: CodeVerification["objet"]): Promise<CodeVerification | null>
  supprimerCodes(clientId: string): Promise<void>

  /** Démo seulement : un billet d'exemple (référence et contact) pour essayer « Mes billets ». */
  exempleBillet?(maintenant: Date): Promise<{ reference: string; contact: string } | null>
}
