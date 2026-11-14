/**
 * Paramètres commerciaux de la démo.
 * Les valeurs inventées portent le commentaire « EXEMPLE — à remplacer par LOGIMAR ».
 */
import type { ConfigCommerciale } from "@/domain/config"

export const config: ConfigCommerciale = {
  devise: "XAF",
  dureeBlocageMinutes: 15, // cahier des charges §4.3
  seuilAlertePlaces: 5, // EXEMPLE — à remplacer par LOGIMAR
  passagersMax: 9, // EXEMPLE — à remplacer par LOGIMAR
  bornesAge: { enfantDes: 3, adulteDes: 12 }, // cahier des charges §4.1, bornes à confirmer par LOGIMAR
  periode: { du: "2026-11-01", au: "2027-01-31" }, // PERIMETRE_DEMO : novembre 2026 à janvier 2027
  ventesEnLigneJusqua: "ouverture-enregistrement", // EXEMPLE — à remplacer par LOGIMAR
  moyensPaiementActifs: { airtel: true, moov: true }, // démo : les deux opérateurs simulés
}
