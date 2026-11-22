/**
 * Types du domaine LOGIMAR 241.
 * Alignés sur le modèle de données de docs/CAHIER_DES_CHARGES_RESERVATION.md (section 7).
 * Aucune dépendance à React ni au stockage : ces types servent à la démo comme à la production.
 */

export type CodePort = "LBV" | "POG"

export interface Port {
  id: string
  code: CodePort
  nom: string
  ville: string
}

export interface Terminal {
  id: string
  portId: string
  nom: string
  adresse: string | null
  lienItineraire: string | null
  actif: boolean
}

export interface Navire {
  id: string
  nom: string
  type: string
  capaciteTotale: number
  /** Capacité proposée à la vente par défaut sur chaque traversée. */
  capaciteVendable: number
  atouts: string[]
  photo: string
  bagageSouteKg: number
  bagageCabineKg: number
}

export interface Ligne {
  id: string
  portDepartId: string
  portArriveeId: string
}

export type StatutTraversee = "programmee" | "ouverte" | "fermee" | "annulee" | "partie"

export interface Traversee {
  id: string
  ligneId: string
  navireId: string
  terminalDepartId: string
  terminalArriveeId: string
  /** Instants ISO 8601 avec décalage horaire (heure du Gabon, +01:00). */
  departAt: string
  arriveeAt: string
  enregistrementOuvertureAt: string
  /** Inconnu tant que LOGIMAR ne l'a pas fourni. */
  enregistrementFermetureAt: string | null
  statut: StatutTraversee
  capaciteVendable: number
}

export type CodeFamille = "ECO" | "VIP"

export interface FamilleTarifaire {
  id: string
  code: CodeFamille
  nom: string
  modifiable: boolean
  remboursable: boolean
  /** Frais de modification en FCFA (0 = gratuit, null = non modifiable). */
  fraisModif: number | null
  /** Délai limite de modification avant le départ, en heures. */
  delaiModifH: number | null
  avantages: string[]
}

export interface Prix {
  adulte: number
  enfant: number
  bebe: number
}

/**
 * Palier de prix (classe de réservation) d'une famille tarifaire sur une traversée.
 * Le nombre de places vendues n'est pas stocké ici : il se calcule à partir des réservations.
 */
export interface ClasseReservation {
  id: string
  traverseeId: string
  familleCode: CodeFamille
  rang: number
  prix: Prix
  /** Nombre de places du palier ; null = sans limite propre (borné par la capacité du navire). */
  quota: number | null
  /** Ouvert ou fermé à la main par le revenue manager. */
  ouverte: boolean
}

export type Categorie = "adulte" | "enfant" | "bebe"

export interface CompositionPassagers {
  adultes: number
  enfants: number
  bebes: number
}

export type TypePiece = "cni" | "passeport" | "carte-sejour"

export interface Passager {
  id: string
  categorie: Categorie
  nom: string
  prenom: string
  dateNaissance: string | null
  typePiece: TypePiece | null
  numeroPiece: string | null
}

export type StatutReservation =
  | "brouillon"
  | "bloquee"
  | "payee"
  | "emise"
  | "expiree"
  | "annulee"
  | "remboursee"
  | "embarquee"
  | "absente"

export type Canal = "web" | "agence" | "telephone"

export type MoyenPaiement = "airtel" | "moov" | "especes"

export type CodeOption = "BAGAGE" | "GARANTIE"

/** Option choisie sur une réservation, au prix du moment. */
export interface LigneOption {
  code: CodeOption
  quantite: number
  prixUnitaire: number
}

export interface Reservation {
  id: string
  /** Commande (paiement, facture) à laquelle appartient la réservation ; null pour les ventes d'agence. */
  commandeId: string | null
  /** Référence du billet, attribuée à l'émission (vide avant). */
  reference: string
  traverseeId: string
  familleCode: CodeFamille
  classeId: string
  statut: StatutReservation
  telephone: string | null
  email: string | null
  passagers: Passager[]
  /** Prix par catégorie, figés au moment du blocage. */
  prixUnitaires: Prix
  options: LigneOption[]
  /** Passagers et options. */
  total: number
  devise: "XAF"
  bloqueeJusquA: string | null
  canal: Canal
  moyenPaiement: MoyenPaiement | null
  creeLe: string
}

export type StatutPaiement = "en-attente" | "reussi" | "refuse" | "rembourse"

export interface Paiement {
  id: string
  commandeId: string
  moyen: "airtel" | "moov"
  /** Numéro Mobile Money débité (peut être celui d'un tiers). */
  numero: string
  montant: number
  statut: StatutPaiement
  /** Référence unique de la tentative, envoyée à l'opérateur. */
  refTransaction: string
  refOperateur: string | null
  creeLe: string
  majLe: string
}

export type NiveauInfoTrafic = "information" | "alerte"

export interface InfoTrafic {
  id: string
  message: string
  lien: string | null
  libelleLien: string | null
  niveau: NiveauInfoTrafic
  debutAt: string
  finAt: string
  actif: boolean
}

export interface Agence {
  id: string
  ville: string
  telephones: string[]
}

export interface OptionCatalogue {
  code: CodeOption
  libelle: string
  detail: string
  prix: number
  /** Familles pour lesquelles l'option est proposée. */
  familles: CodeFamille[]
  /** Quantité maximale par réservation (1 = case à cocher). */
  quantiteMax: number
}

/** Règle de programme : une ligne, des jours de la semaine et des horaires. */
export interface RegleProgramme {
  ligneId: string
  navireId: string
  terminalDepartId: string
  terminalArriveeId: string
  /** Jours de la semaine : 0 = dimanche … 6 = samedi. */
  joursSemaine: number[]
  enregistrement: string
  depart: string
  arrivee: string
  /** Heure de fermeture de l'enregistrement, inconnue pour l'instant. */
  fermetureEnregistrement: string | null
}

export interface Periode {
  du: string
  au: string
}

/** Opérateur Mobile Money proposé au paiement. */
export interface OperateurMobile {
  code: "airtel" | "moov"
  nom: string
  logo: string
}

/**
 * Commande : une ou deux réservations (aller, retour) payées en une fois, avec une facture.
 * Ajout au modèle du cahier des charges (docs/PLAN_DEMO.md, décision 2).
 */
export type StatutCommande = "en-cours" | "payee" | "abandonnee" | "expiree"

export interface Commande {
  id: string
  /** Aller, puis retour éventuel. */
  reservationIds: string[]
  telephone: string | null
  email: string | null
  statut: StatutCommande
  total: number
  /** Numéro séquentiel sans trou, attribué au paiement (ex. F-2026-000123). */
  numeroFacture: string | null
  factureEmiseLe: string | null
  clientId: string | null
  creeLe: string
}

export type CanalEnvoi = "email" | "sms" | "whatsapp"

/** Journal des envois (cahier des charges §4.5). */
export interface Envoi {
  id: string
  commandeId: string | null
  clientId: string | null
  canal: CanalEnvoi
  destinataire: string
  objet: string
  texte: string
  /** Documents joints (générés à la demande). */
  pieces: { nom: string; type: "billet" | "facture" }[]
  /** Démo : « apercu » (rien n'est envoyé). */
  statut: "apercu" | "envoye" | "echec"
  tentatives: number
  erreur: string | null
  creeLe: string
}

export interface PassagerEnregistre {
  id: string
  categorie: Categorie
  nom: string
  prenom: string
  dateNaissance: string | null
  typePiece: TypePiece | null
  numeroPiece: string | null
}

export interface Client {
  id: string
  telephone: string | null
  email: string | null
  emailVerifieLe: string | null
  motDePasseHash: string
  sel: string
  langue: "fr" | "en"
  reservationIds: string[]
  passagers: PassagerEnregistre[]
  creeLe: string
}

export interface CodeVerification {
  id: string
  clientId: string
  objet: "verification" | "reinitialisation"
  canal: "email" | "sms"
  destinataire: string
  codeHash: string
  expireAt: string
  tentatives: number
}

/**
 * Ouverture ou fermeture manuelle d'un palier par le revenue manager, avec son motif
 * (CAHIER_DES_CHARGES_GESTION §3.3 ; en production, inscrite au journal d'audit).
 * L'état d'un palier est celui du dernier changement ; sans changement, il est ouvert.
 */
export interface ChangementPalier {
  id: string
  traverseeId: string
  classeId: string
  ouverte: boolean
  motif: string
  /** Démo : libellé fixe (pas de comptes) ; production : l'utilisateur connecté. */
  auteur: string
  le: string
}

/** Comment un billet a été contrôlé à l'embarquement. */
export type ModeControle = "scan" | "manuel"

/**
 * Passager monté à bord (CAHIER_DES_CHARGES_GESTION §3.5 ; `embarque_at` du modèle de la phase 1).
 * Un enregistrement par passager : le manifeste de bord est la liste de ces enregistrements.
 */
export interface Embarquement {
  id: string
  traverseeId: string
  reservationId: string
  passagerId: string
  reference: string
  mode: ModeControle
  /** Démo : libellé fixe (pas de comptes) ; production : l'agent d'embarquement connecté. */
  agent: string
  embarqueLe: string
}

export type ResultatControle =
  | "valide"
  | "deja-scanne"
  | "autre-traversee"
  | "non-valable"
  | "invalide"
  | "embarquement-clos"

/** Journal de chaque contrôle à l'embarquement, quel qu'en soit le résultat (ScanEmbarquement du cahier des charges). */
export interface ScanEmbarquement {
  id: string
  traverseeId: string
  reference: string | null
  resultat: ResultatControle
  mode: ModeControle
  agent: string
  le: string
}

/** Fin de l'embarquement d'une traversée : plus de contrôle possible, les passagers non embarqués sont absents. */
export interface ClotureEmbarquement {
  traverseeId: string
  agent: string
  le: string
}
