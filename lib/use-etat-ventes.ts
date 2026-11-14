"use client"

import { useEffect, useState } from "react"
import { serviceGestion, type EtatVentes } from "@/services"
import { useMaintenant } from "./use-maintenant"

/**
 * État des ventes pour le back-office, relu toutes les 30 s, au retour sur l'onglet et dès qu'un autre
 * onglet du même navigateur modifie les données (une réservation faite sur le site apparaît aussitôt).
 */
export function useEtatVentes(traverseeIds?: string[]): { etat: EtatVentes | null; recharger: () => void } {
  const tic = useMaintenant()
  const [version, setVersion] = useState(0)
  const [etat, setEtat] = useState<EtatVentes | null>(null)
  const cle = traverseeIds?.join("|") ?? null

  useEffect(() => {
    const relire = () => setVersion((v) => v + 1)
    window.addEventListener("storage", relire)
    window.addEventListener("focus", relire)
    return () => {
      window.removeEventListener("storage", relire)
      window.removeEventListener("focus", relire)
    }
  }, [])

  useEffect(() => {
    if (tic === null) return
    let actif = true
    // Heure exacte (et non arrondie) : une réservation faite il y a quelques secondes compte déjà.
    serviceGestion.etatVentes(new Date(), cle === null ? undefined : cle.split("|")).then((e) => {
      if (actif) setEtat(e)
    })
    return () => {
      actif = false
    }
  }, [tic, version, cle])

  return { etat, recharger: () => setVersion((v) => v + 1) }
}
