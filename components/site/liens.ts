import { CalendarDays, CircleHelp, Search, Ticket, type LucideIcon } from "lucide-react"

export interface LienNavigation {
  href: string
  libelle: string
  icone: LucideIcon
}

export const liensNavigation: LienNavigation[] = [
  { href: "/", libelle: "Réserver", icone: Search },
  { href: "/horaires", libelle: "Horaires", icone: CalendarDays },
  { href: "/mes-billets", libelle: "Mes billets", icone: Ticket },
  { href: "/aide", libelle: "Aide", icone: CircleHelp },
]

/** Écrans rattachés à une rubrique de la navigation (ex. le compte est sous « Mes billets »). */
const RUBRIQUES: Record<string, string> = { "/compte": "/mes-billets" }

export function rubriqueActive(chemin: string): string {
  return RUBRIQUES[chemin] ?? chemin
}

/** La navigation basse n'apparaît que sur ces écrans ; le parcours de réservation a sa propre barre. */
export function afficheNavigation(chemin: string): boolean {
  return liensNavigation.some((l) => l.href === rubriqueActive(chemin))
}
