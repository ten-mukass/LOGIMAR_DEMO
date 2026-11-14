import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranPaiement } from "@/components/parcours/ecran-paiement"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Paiement" }

export default async function PagePaiement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const referentiel = await repository.getReferentiel()
  return (
    <Suspense fallback={<div className="h-28 border-b border-bordure bg-white" />}>
      <EcranPaiement id={id} referentiel={referentiel} />
    </Suspense>
  )
}
