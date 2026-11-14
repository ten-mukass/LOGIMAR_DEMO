/**
 * Toutes les données d'exemple de la démo, en un seul endroit (PERIMETRE_DEMO).
 * Pour passer aux vraies données : remplacer ces fichiers, ou brancher un autre Repository.
 */
import { agences } from "./agences"
import { rubriquesAide } from "./aide"
import { config } from "./config"
import { gestion } from "./gestion"
import { infosTrafic } from "./info-trafic"
import { navires } from "./navire"
import { options } from "./options"
import { cleSignatureBilletDemo, operateurs, paiementSimule } from "./paiement"
import { lignes, ports, terminaux } from "./ports"
import { regles } from "./programme"
import { societe } from "./societe"
import { familles, grille } from "./tarifs"
import { textes } from "./textes"
import { parametresVentes } from "./ventes"

export const seed = {
  config,
  ports,
  terminaux,
  lignes,
  navires,
  regles,
  familles,
  grille,
  options,
  agences,
  infosTrafic,
  textes,
  parametresVentes,
  operateurs,
  paiementSimule,
  cleSignatureBilletDemo,
  societe,
  rubriquesAide,
  gestion,
}

export type Seed = typeof seed
