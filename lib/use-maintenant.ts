"use client"

import { useMemo, useSyncExternalStore } from "react"
import { maintenant } from "@/services/horloge"

const PAS_MS = 30_000

function abonner(rappel: () => void): () => void {
  const id = window.setInterval(rappel, PAS_MS)
  return () => window.clearInterval(id)
}

function instantArrondi(): number {
  return Math.floor(maintenant().getTime() / PAS_MS) * PAS_MS
}

/**
 * Heure courante côté navigateur, rafraîchie toutes les 30 s ; null pendant le rendu serveur
 * (les dates passées, les ventes ouvertes, etc. dépendent de l'heure du visiteur).
 */
export function useMaintenant(): Date | null {
  const instant = useSyncExternalStore(abonner, instantArrondi, () => null)
  return useMemo(() => (instant === null ? null : new Date(instant)), [instant])
}
