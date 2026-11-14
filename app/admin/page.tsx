import type { Metadata } from "next"
import { TableauDeBord } from "@/components/gestion/tableau-de-bord"

export const metadata: Metadata = { title: { absolute: "Tableau de bord — Gestion LOGIMAR 241" } }

export default function PageTableauDeBord() {
  return <TableauDeBord />
}
