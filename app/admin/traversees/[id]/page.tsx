import type { Metadata } from "next"
import { FicheTraversee } from "@/components/gestion/fiche-traversee"

export const metadata: Metadata = { title: "Fiche traversée" }

export default async function PageFicheTraversee({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FicheTraversee id={decodeURIComponent(id)} />
}
