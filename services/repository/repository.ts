/**
 * Accès aux données. Les écrans ne connaissent que cette interface.
 * Démo : DemoRepository (données d'exemple + navigateur). Production : implémentation serveur (PostgreSQL).
 * Toutes les méthodes sont asynchrones pour que le passage au serveur ne change pas les écrans.
 */
import type { ConfigCommerciale, ConfigPaiementSimule, ParametresGestion } from "@/domain/config"
import type { Occupation } from "@/domain/tarifs"
import type { RubriqueAide } from "@/data/seed/aide"
import type { Societe } from "@/data/seed/societe"
import type {
  Agence,
  ChangementPalier,
  ClotureEmbarquement,
  Embarquement,
  ScanEmbarquement,
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

/** Lignes verrouillées pendant une transaction (jusqu'à sa fin). */
export interface Verrous {
  /** Traversées dont on vend des places : deux ventes simultanées passent l'une après l'autre. */
  traversees?: string[]
  /** Paiements dont on applique la confirmation : un paiement n'émet ses billets qu'une fois. */
  paiements?: string[]
}

export interface Repository {
  /**
   * Exécute `travail` d'un seul tenant : tout est enregistré, ou rien. Les lignes de `verrous` restent
   * verrouillées jusqu'à la fin. `travail` doit utiliser le Repository qu'il reçoit.
   * Démo (un seul navigateur) : exécution directe.
   */
  transaction<R>(verrous: Verrous, travail: (repository: Repository) => Promise<R>): Promise<R>

  getReferentiel(): Promise<Referentiel>
  /** Messages d'info trafic actifs à cet instant. */
  getInfosTrafic(maintenant: Date): Promise<InfoTrafic[]>
  listerTraversees(filtre?: FiltreTraversees): Promise<Traversee[]>
  getTraversee(id: string): Promise<Traversee | null>
  listerInventaires(traverseeIds: string[], maintenant: Date): Promise<Inventaire[]>
  /** Passagers vendus par famille tarifaire jusqu'à cet instant (« Le plus choisi », tableaux de bord). */
  repartitionParFamille(maintenant: Date): Promise<Record<CodeFamille, number>>

  /**
   * Back-office : réservations qui comptent à cet instant, toutes origines, cohérentes avec l'occupation
   * de listerInventaires (démo : celles du visiteur et les ventes d'exemple retenues ; production : requête en base).
   */
  listerReservations(maintenant: Date, filtre?: { traverseeIds?: string[] }): Promise<Reservation[]>
  /** Ouvertures et fermetures manuelles de paliers, de la plus ancienne à la plus récente. */
  listerChangementsPaliers(traverseeId?: string): Promise<ChangementPalier[]>
  /** Enregistre l'ouverture ou la fermeture d'un palier : listerInventaires en tient compte aussitôt. */
  enregistrerChangementPalier(changement: ChangementPalier): Promise<void>
  getParametresGestion(): Promise<ParametresGestion>

  /** Embarquement : passagers montés à bord d'une traversée (le manifeste de bord). */
  listerEmbarquements(traverseeId: string): Promise<Embarquement[]>
  /** Ajoute des passagers à bord ; un passager déjà à bord sur cette traversée n'est pas ajouté deux fois. */
  enregistrerEmbarquements(embarquements: Embarquement[]): Promise<void>
  /** Correction : retire un passager du bord. */
  supprimerEmbarquement(id: string): Promise<void>
  /** Journal des contrôles, du plus ancien au plus récent. */
  listerScans(traverseeId: string): Promise<ScanEmbarquement[]>
  enregistrerScan(scan: ScanEmbarquement): Promise<void>
  getClotureEmbarquement(traverseeId: string): Promise<ClotureEmbarquement | null>
  /** Clôture l'embarquement, ou le rouvre avec null. */
  definirClotureEmbarquement(traverseeId: string, cloture: ClotureEmbarquement | null): Promise<void>

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
