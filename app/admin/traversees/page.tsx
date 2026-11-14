import type { Metadata } from "next"
import { ListeTraversees } from "@/components/gestion/liste-traversees"

export const metadata: Metadata = { title: "Traversées" }

export default function PageTraversees() {
  return <ListeTraversees />
}
