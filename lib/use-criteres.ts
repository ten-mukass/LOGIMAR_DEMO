"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { lireCriteres } from "@/domain/recherche"
import type { Port } from "@/domain/types"

/** Critères de recherche lus dans l'URL, plus les paramètres du parcours (traversée, famille). */
export function useCriteres(ports: Port[], passagersMax: number) {
  const params = useSearchParams()
  return useMemo(() => {
    const lu = lireCriteres(
      params,
      ports.map((p) => p.code),
      passagersMax,
    )
    return { ...lu, traverseeId: params.get("t"), famille: params.get("f") }
  }, [params, ports, passagersMax])
}
