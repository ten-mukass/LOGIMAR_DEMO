import type { Metadata } from "next"
import { EnPreparation } from "@/components/site/en-preparation"

export const metadata: Metadata = { title: "Mes billets" }

export default function MesBillets() {
  return <EnPreparation titre="Mes billets" etape={3} />
}
