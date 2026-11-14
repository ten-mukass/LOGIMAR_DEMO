import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranResultats } from "@/components/parcours/ecran-resultats"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Résultats" }

export default async function Resultats() {
  const referentiel = await repository.getReferentiel()
  return (
    <Suspense fallback={<div className="h-56 bg-marine" />}>
      <EcranResultats referentiel={referentiel} />
    </Suspense>
  )
}
