/**
 * Back-office de la démo : code d'accès et réglages des tableaux de bord.
 * En production : comptes nominatifs, rôles et double facteur (CAHIER_DES_CHARGES_GESTION §2).
 */
import type { ParametresGestion } from "@/domain/config"

export const gestion: {
  codeAccesDemo: string
  dureeSessionHeures: number
  auteurDemo: string
  parametres: ParametresGestion
} = {
  codeAccesDemo: "241241", // EXEMPLE — à remplacer par LOGIMAR (simple code de démonstration, pas de rôles)
  dureeSessionHeures: 8, // EXEMPLE — à remplacer par LOGIMAR
  auteurDemo: "Accès démo", // démo : pas de comptes, les changements de paliers portent ce libellé
  parametres: {
    seuilPresquePlein: 0.9, // EXEMPLE — à remplacer par LOGIMAR
    seuilEcartReference: 0.2, // EXEMPLE — à remplacer par LOGIMAR (exemple de règle à 20 % du cahier des charges §3.3)
    traverseesMinReference: 3, // EXEMPLE — à remplacer par LOGIMAR
    joursCourbe: 30, // cahier des charges §3.1 : de J-30 à J0
    joursRythme: 30, // EXEMPLE — à remplacer par LOGIMAR
    joursPickUp: [1, 7, 14], // cahier des charges §3.1
    joursPickUpPrincipal: 7, // EXEMPLE — à remplacer par LOGIMAR
    prochainesTraversees: 8, // EXEMPLE — à remplacer par LOGIMAR
  },
}
