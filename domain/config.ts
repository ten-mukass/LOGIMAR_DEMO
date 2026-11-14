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
