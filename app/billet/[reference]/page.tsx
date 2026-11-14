import type { Metadata } from "next"
import { Suspense } from "react"
import { EcranBillet } from "@/components/parcours/ecran-billet"

export const metadata: Metadata = { title: "Billet" }

export default async function PageBillet({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return (
    <Suspense fallback={<main className="min-h-dvh bg-marine" />}>
      <EcranBillet reference={decodeURIComponent(reference)} />
    </Suspense>
  )
}
