/**
 * Agences et numéros d'appel, repris des affiches « Programme du mois » (à confirmer par LOGIMAR).
 */
import type { Agence } from "@/domain/types"

export const agences: Agence[] = [
  { id: "AG-LBV", ville: "Libreville", telephones: ["+241 65 95 90 15", "+241 65 95 90 16"] },
  { id: "AG-POG", ville: "Port-Gentil", telephones: ["+241 65 95 90 20", "+241 65 95 90 21"] },
]
