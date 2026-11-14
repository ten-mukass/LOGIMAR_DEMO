/**
 * Occupation des traversées à partir des réservations, et blocage temporaire des places.
 */
import { placesNecessaires, type Occupation } from "./tarifs"
import type { CompositionPassagers, Passager, Reservation, StatutReservation } from "./types"

/** Statuts qui consomment définitivement des places. */
const STATUTS_VENDUS: StatutReservation[] = ["payee", "emise", "embarquee", "absente"]

export function compositionDe(passagers: Pick<Passager, "categorie">[]): CompositionPassagers {
  return {
    adultes: passagers.filter((p) => p.categorie === "adulte").length,
    enfants: passagers.filter((p) => p.categorie === "enfant").length,
    bebes: passagers.filter((p) => p.categorie === "bebe").length,
  }
}

export function placesReservation(reservation: Pick<Reservation, "passagers">): number {
  return placesNecessaires(compositionDe(reservation.passagers))
}

export function estBlocageActif(reservation: Pick<Reservation, "statut" | "bloqueeJusquA">, maintenant: Date): boolean {
  return (
    reservation.statut === "bloquee" &&
    reservation.bloqueeJusquA !== null &&
    Date.parse(reservation.bloqueeJusquA) > maintenant.getTime()
  )
}

/** Une réservation occupe des places si elle est vendue, ou bloquée et pas encore expirée. */
export function occupeDesPlaces(
  reservation: Pick<Reservation, "statut" | "bloqueeJusquA" | "creeLe">,
  maintenant: Date,
): boolean {
  if (Date.parse(reservation.creeLe) > maintenant.getTime()) return false
  return STATUTS_VENDUS.includes(reservation.statut) || estBlocageActif(reservation, maintenant)
}

/** Occupation par traversée. */
export function calculerOccupations(reservations: Reservation[], maintenant: Date): Map<string, Occupation> {
  const resultat = new Map<string, Occupation>()
  for (const r of reservations) {
    if (!occupeDesPlaces(r, maintenant)) continue
    const places = placesReservation(r)
    const occ = resultat.get(r.traverseeId) ?? { total: 0, parClasse: {} }
    occ.total += places
    occ.parClasse[r.classeId] = (occ.parClasse[r.classeId] ?? 0) + places
    resultat.set(r.traverseeId, occ)
  }
  return resultat
}

/** Fin d'un blocage commencé à `debut` (ISO). */
export function finDeBlocage(debut: Date, dureeMinutes: number): string {
  return new Date(debut.getTime() + dureeMinutes * 60_000).toISOString()
}

export function secondesRestantes(bloqueeJusquA: string, maintenant: Date): number {
  return Math.max(0, Math.ceil((Date.parse(bloqueeJusquA) - maintenant.getTime()) / 1000))
}
