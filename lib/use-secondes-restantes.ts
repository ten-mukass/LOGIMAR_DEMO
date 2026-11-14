"use client"

import { useSyncExternalStore } from "react"
import { secondesRestantes } from "@/domain/occupation"
import { maintenant } from "@/services/horloge"

function abonner(rappel: () => void): () => void {
  const id = window.setInterval(rappel, 1000)
  return () => window.clearInterval(id)
}

/** Secondes restantes avant `fin` (ISO), rafraîchies chaque seconde ; null côté serveur ou sans échéance. */
export function useSecondesRestantes(fin: string | null): number | null {
  return useSyncExternalStore(
    abonner,
    () => (fin === null ? null : secondesRestantes(fin, maintenant())),
    () => null,
  )
}
