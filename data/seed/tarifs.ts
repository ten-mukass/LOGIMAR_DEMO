/**
 * Familles tarifaires et grille de prix par paliers, appliquée à chaque traversée.
 * Les trois familles (Éco, Standard, Flex) sont validées ; leurs conditions détaillées et tous
 * les prix sont des exemples. Prix différents de ceux de NGV Lines.
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
    id: "STD",
    code: "STD",
    nom: "Standard",
    modifiable: true,
    remboursable: false, // à confirmer par LOGIMAR
    fraisModif: 5000, // EXEMPLE — à remplacer par LOGIMAR
    delaiModifH: 24, // EXEMPLE — à remplacer par LOGIMAR
    avantages: [],
  },
  {
    id: "FLEX",
    code: "FLEX",
    nom: "Flex",
    modifiable: true,
    remboursable: true,
    fraisModif: 0,
    delaiModifH: null,
    avantages: ["Embarquement prioritaire"],
  },
]

/** Grille modèle, identique dans les deux sens. Quotas Éco + Standard = capacité ; Flex sans quota propre. */
export const grille: PalierGrille[] = [
  { familleCode: "ECO", rang: 1, prix: { adulte: 25000, enfant: 15000, bebe: 5000 }, quota: 20 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 2, prix: { adulte: 28000, enfant: 17000, bebe: 5000 }, quota: 20 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "ECO", rang: 3, prix: { adulte: 31000, enfant: 19000, bebe: 5000 }, quota: 20 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "STD", rang: 1, prix: { adulte: 35000, enfant: 21000, bebe: 5000 }, quota: 25 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "STD", rang: 2, prix: { adulte: 39000, enfant: 23000, bebe: 5000 }, quota: 25 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "STD", rang: 3, prix: { adulte: 43000, enfant: 26000, bebe: 5000 }, quota: 20 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "STD", rang: 4, prix: { adulte: 47000, enfant: 28000, bebe: 5000 }, quota: 20 }, // EXEMPLE — à remplacer par LOGIMAR
  { familleCode: "FLEX", rang: 1, prix: { adulte: 55000, enfant: 33000, bebe: 5000 }, quota: null }, // EXEMPLE — à remplacer par LOGIMAR
]
