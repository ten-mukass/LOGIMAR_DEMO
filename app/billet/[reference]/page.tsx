import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranBillet } from "@/components/parcours/ecran-billet"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Billet" }

export default async function PageBillet({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const referentiel = await repository.getReferentiel()
  return (
    <Suspense fallback={<main className="min-h-dvh bg-marine" />}>
      <EcranBillet reference={decodeURIComponent(reference)} referentiel={referentiel} />
    </Suspense>
  )
}
