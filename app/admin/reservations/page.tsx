import type { Metadata } from "next"
import { Suspense } from "react"
import { Chargement } from "@/components/gestion/elements"
import { ListeReservations } from "@/components/gestion/liste-reservations"

export const metadata: Metadata = { title: "Réservations" }

export default function PageReservations() {
  return (
    <Suspense fallback={<Chargement />}>
      <ListeReservations />
    </Suspense>
  )
}
