"use client"

import { useEffect, useState } from "react"

/**
 * Charge des données asynchrones (Repository) et les renvoie quand elles arrivent.
 * `charger` doit être stable (useCallback) ; null = rien à charger pour l'instant.
 */
export function useDonnees<T>(charger: (() => Promise<T>) | null): { donnees: T | undefined; erreur: Error | null } {
  const [etat, setEtat] = useState<{ donnees: T | undefined; erreur: Error | null }>({
    donnees: undefined,
    erreur: null,
  })

  useEffect(() => {
    if (charger === null) return
    let actif = true
    charger().then(
      (donnees) => {
        if (actif) setEtat({ donnees, erreur: null })
      },
      (erreur: unknown) => {
        if (actif) setEtat((e) => ({ ...e, erreur: erreur instanceof Error ? erreur : new Error(String(erreur)) }))
      },
    )
    return () => {
      actif = false
    }
  }, [charger])

  return etat
}
