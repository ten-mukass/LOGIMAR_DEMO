/**
 * Familles tarifaires et grille de prix par paliers, appliquée à chaque traversée.
 * Deux familles, Éco et VIP (décision du fondateur de LOGIMAR, 22/11/2026 : le Standard est retiré,
 * le VIP reprend les conditions de l'ancien Flex). Conditions détaillées et prix : exemples.
 * Prix différents de ceux de NGV Lines.
 */
import type { PalierGrille } from "@/domain/tarifs"
import type { FamilleTarifaire } from "@/domain/types"

export const familles: FamilleTarifaire[] = [
  {
    id: "ECO",
    code: "ECO",
    nom: "Éco",
    modifiable: false,
    remboursable: false,
    fraisModif: null,
    delaiModifH: null,
    avantages: [],
  },
  {
    id: "VIP",
    code: "VIP",
    nom: "VIP",
    modifiable: true, // à confirmer par LOGIMAR (conditions reprises de l'ancien Flex)
    remboursable: true, // à confirmer par LOGIMAR
    fraisModif: 0,
    delaiModifH: null,
    avantages: ["Embarquement prioritaire"], // EXEMPLE — à remplacer par LOGIMAR
  },
]

/** Grille modèle, identique dans les deux sens. Quotas Éco = capacité ; VIP sans quota propre (toujours vendable). */
export const grille: PalierGrille[] = [
  { familleCode: "ECO", rang: 1, prix: { adulte: 25000, enfant: 15000, bebe: 5000 }, quota: 30 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 2, prix: { adulte: 28000, enfant: 17000, bebe: 5000 }, quota: 30 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 3, prix: { adulte: 31000, enfant: 19000, bebe: 5000 }, quota: 30 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 4, prix: { adulte: 35000, enfant: 21000, bebe: 5000 }, quota: 30 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 5, prix: { adulte: 39000, enfant: 23000, bebe: 5000 }, quota: 30 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "VIP", rang: 1, prix: { adulte: 55000, enfant: 33000, bebe: 5000 }, quota: null }, // EXEMPLE — à remplacer par LOGIMAR
]
