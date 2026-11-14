import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranMesBillets } from "@/components/compte/ecran-mes-billets"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Mes billets" }

export default async function MesBillets() {
  const referentiel = await repository.getReferentiel()
  return (
    <Suspense fallback={<div className="h-28 bg-marine" />}>
      <EcranMesBillets referentiel={referentiel} />
    </Suspense>
  )
}
