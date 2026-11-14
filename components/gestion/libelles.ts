/**
 * Libellés du back-office.
 */
import type { Alerte } from "@/domain/indicateurs"
import type { EtatPalier } from "@/domain/paliers"
import type { Canal, Ligne, MoyenPaiement, Port, StatutReservation, StatutTraversee } from "@/domain/types"

export const LIBELLES_STATUT: Record<StatutReservation, string> = {
  brouillon: "Brouillon",
  bloquee: "Paiement en cours",
  payee: "Payée",
  emise: "Émise",
  expiree: "Expirée",
  annulee: "Abandonnée",
  remboursee: "Remboursée",
  embarquee: "Embarquée",
  absente: "Absente",
}

export const LIBELLES_CANAL: Record<Canal, string> = { web: "Site", agence: "Agence", telephone: "Téléphone" }

export const LIBELLES_MOYEN: Record<MoyenPaiement, string> = {
  airtel: "Airtel Money",
  moov: "Moov Money",
  especes: "Espèces",
}

export const LIBELLES_MOYEN_COURTS: Record<MoyenPaiement, string> = { airtel: "Airtel", moov: "Moov", especes: "Espèces" }

export const LIBELLES_ALERTE: Record<Alerte, string> = {
  complete: "Complète",
  "presque-pleine": "Presque pleine",
  "en-avance": "En avance",
  "en-retard": "En retard",
  "paliers-fermes": "Palier fermé",
}

export const LIBELLES_ETAT_PALIER: Record<EtatPalier, string> = {
  "en-vente": "En vente",
  "en-attente": "En attente",
  epuise: "Épuisé",
  ferme: "Fermé",
}

export function libelleStatutTraversee(statut: StatutTraversee, ouverteALaVente: boolean): string {
  if (statut === "partie") return "Partie"
  if (statut === "annulee") return "Annulée"
  return ouverteALaVente ? "En vente" : "Vente en ligne close"
}

/** « Libreville → Port-Gentil », ou « LBV → POG » en version courte. */
export function nomLigne(ligneId: string, lignes: Ligne[], ports: Port[], court = false): string {
  const ligne = lignes.find((l) => l.id === ligneId)
  const port = (id: string | undefined) => ports.find((p) => p.id === id)
  const depart = port(ligne?.portDepartId)
  const arrivee = port(ligne?.portArriveeId)
  if (!depart || !arrivee) return ligneId
  return court ? `${depart.code} → ${arrivee.code}` : `${depart.nom} → ${arrivee.nom}`
}
