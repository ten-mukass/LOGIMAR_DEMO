/**
 * Options payantes proposées à l'étape paiement.
 */
import type { OptionCatalogue } from "@/domain/types"

export const options: OptionCatalogue[] = [
  {
    code: "BAGAGE",
    libelle: "Bagage supplémentaire",
    detail: "20 kg", // EXEMPLE — à remplacer par LOGIMAR
    prix: 5000, // EXEMPLE — à remplacer par LOGIMAR
    familles: ["ECO", "VIP"],
    quantiteMax: 9, // EXEMPLE — à remplacer par LOGIMAR
  },
  {
    code: "GARANTIE",
    libelle: "Garantie modification",
    detail: "Modification sans frais jusqu’à 24 h avant le départ", // EXEMPLE — à remplacer par LOGIMAR
    prix: 3000, // EXEMPLE — à remplacer par LOGIMAR
    familles: ["ECO"], // non proposée avec le VIP, déjà modifiable sans frais (docs/PLAN_DEMO.md, décision 5)
    quantiteMax: 1,
  },
]
