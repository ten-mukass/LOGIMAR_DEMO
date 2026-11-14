import type { Metadata } from "next"
import { EcranApercuEmail } from "@/components/compte/ecran-apercu-email"

export const metadata: Metadata = { title: "Aperçu de l’e-mail" }

export default async function PageApercuEmail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EcranApercuEmail id={id} />
}
