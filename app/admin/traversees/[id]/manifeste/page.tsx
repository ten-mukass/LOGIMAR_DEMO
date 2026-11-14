import type { Metadata } from "next"
import { EcranManifeste } from "@/components/gestion/ecran-manifeste"

export const metadata: Metadata = { title: "Manifeste" }

export default async function PageManifeste({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EcranManifeste id={decodeURIComponent(id)} />
}
