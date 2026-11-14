/**
 * Paiement Mobile Money (docs/CAHIER_DES_CHARGES_RESERVATION.md §4.4).
 * Le parcours ne connaît que cette interface. Implémentations : SimulatedProvider (démo, tests) ;
 * en production AirtelMoneyProvider et MoovMoneyProvider, côté serveur, avec leurs clés en variables d'environnement.
 *
 * Déroulé : le serveur demande le paiement (initierPaiement) → le client valide sur son téléphone →
 * l'opérateur confirme par callback (traiterCallback). Filet de sécurité : consulterStatut.
 */

export type Operateur = "airtel" | "moov"

export type StatutTransaction = "en-attente" | "reussi" | "refuse"

export interface DemandePaiement {
  /** Référence unique de la tentative (idempotence). */
  refTransaction: string
  montant: number
  /** Numéro Mobile Money à débiter. */
  numero: string
  description: string
}

/** Résultat normalisé d'un callback ou d'une consultation. */
export interface EvenementPaiement {
  refTransaction: string
  statut: Exclude<StatutTransaction, "en-attente">
  refOperateur: string | null
}

export interface PaymentProvider {
  readonly operateur: Operateur
  initierPaiement(demande: DemandePaiement): Promise<{ statut: StatutTransaction }>
  consulterStatut(refTransaction: string): Promise<{ statut: StatutTransaction; refOperateur: string | null }>
  /** Vérifie et lit un callback de l'opérateur ; null s'il est invalide. */
  traiterCallback(contenu: unknown): Promise<EvenementPaiement | null>
  rembourser(refTransaction: string, montant: number): Promise<{ statut: "reussi" | "refuse" }>
}
