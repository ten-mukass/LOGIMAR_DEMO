/**
 * Paramètres commerciaux (administrables en production).
 */
import type { BornesAge } from "./passagers"
import type { ClotureVentes } from "./programme"
import type { Periode } from "./types"

export interface ConfigCommerciale {
  devise: "XAF"
  /** Durée du blocage des places et du tarif à l'étape paiement. */
  dureeBlocageMinutes: number
  /** En dessous de ce nombre de places à un prix, on affiche « Plus que N places à ce prix ». */
  seuilAlertePlaces: number
  passagersMax: number
  bornesAge: BornesAge
  /** Période couverte par le programme publié. */
  periode: Periode
  ventesEnLigneJusqua: ClotureVentes
  moyensPaiementActifs: { airtel: boolean; moov: boolean }
}

/** Comportement du paiement simulé de la démo (PERIMETRE_DEMO). */
export interface ConfigPaiementSimule {
  delaiMs: number
  /** Un numéro se terminant par ce suffixe simule un refus. */
  suffixeRefus: string
}

/** Réglages du back-office (administrables en production). */
export interface ParametresGestion {
  /** Remplissage (0 à 1) à partir duquel une traversée est signalée « presque pleine ». */
  seuilPresquePlein: number
  /** Écart à la courbe de référence (0 à 1) à partir duquel une traversée est en avance ou en retard. */
  seuilEcartReference: number
  /** Nombre minimal de traversées parties pour afficher une courbe de référence. */
  traverseesMinReference: number
  /** Courbe de réservation : de J-N à J0. */
  joursCourbe: number
  /** Rythme de réservation du tableau de bord : N derniers jours. */
  joursRythme: number
  /** Pick-up : réservations des N derniers jours (fiche traversée). */
  joursPickUp: number[]
  /** Pick-up affiché dans les tableaux et le tableau de bord. */
  joursPickUpPrincipal: number
  /** Nombre de traversées à venir affichées sur le tableau de bord. */
  prochainesTraversees: number
}
