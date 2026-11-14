import type { Metadata } from "next"
import { EnPreparation } from "@/components/site/en-preparation"

export const metadata: Metadata = { title: "Aide" }

export default function Aide() {
  return <EnPreparation titre="Aide" etape={3} />
}
