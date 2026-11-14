/**
 * Mentions de l'émetteur des factures (cahier des charges §4.5) : à fournir par LOGIMAR.
 */

export interface Societe {
  raisonSociale: string
  adresse: string
  nif: string
  rccm: string
  regimeTva: string
  mentionsLegales: string
  /** Préfixe des numéros de facture, suivi de l'année et d'un compteur sans trou. */
  prefixeFacture: string
}

export const societe: Societe = {
  raisonSociale: "LOGIMAR 241 (Logistique Maritime 241)",
  adresse: "[ADRESSE À FOURNIR PAR LOGIMAR]",
  nif: "[NIF À FOURNIR]",
  rccm: "[RCCM À FOURNIR]",
  regimeTva: "[RÉGIME DE TVA DU TRANSPORT DE PASSAGERS À CONFIRMER]",
  mentionsLegales: "[MENTIONS LÉGALES OBLIGATOIRES À FOURNIR]",
  prefixeFacture: "F", // format proposé par le cahier des charges : F-2026-000123
}
