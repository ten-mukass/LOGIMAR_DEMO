import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranPassagers } from "@/components/parcours/ecran-passagers"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Passagers" }

export default async function Passagers() {
  const referentiel = await repository.getReferentiel()
  return (
    <Suspense fallback={<div className="h-28 border-b border-bordure bg-white" />}>
      <EcranPassagers referentiel={referentiel} />
    </Suspense>
  )
}
