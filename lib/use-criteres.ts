"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { lireCriteres } from "@/domain/recherche"
import type { Port } from "@/domain/types"

/** Critères de recherche lus dans l'URL, plus les choix du parcours : traversée et famille (aller « t », « f » ; retour « tr », « fr »). */
export function useCriteres(ports: Port[], passagersMax: number) {
  const params = useSearchParams()
  return useMemo(() => {
    const lu = lireCriteres(
      params,
      ports.map((p) => p.code),
      passagersMax,
    )
    return {
      ...lu,
      traverseeId: params.get("t"),
      famille: params.get("f"),
      traverseeRetourId: params.get("tr"),
      familleRetour: params.get("fr"),
    }
  }, [params, ports, passagersMax])
}
