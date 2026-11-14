/**
 * Calendriers : grille d'un mois (sélecteur de date) et jours de traversée regroupés par jour de semaine (Horaires).
 */
import { anneeMois, jourSemaine, joursEntre } from "./temps"

export interface Mois {
  annee: number
  /** 1 à 12 */
  mois: number
}

export function premierJour({ annee, mois }: Mois): string {
  return `${annee}-${String(mois).padStart(2, "0")}-01`
}

export function dernierJour({ annee, mois }: Mois): string {
  const d = new Date(Date.UTC(annee, mois, 0))
  return d.toISOString().slice(0, 10)
}

export function moisSuivant({ annee, mois }: Mois, n = 1): Mois {
  const index = annee * 12 + (mois - 1) + n
  return { annee: Math.floor(index / 12), mois: (index % 12) + 1 }
}

export function comparerMois(a: Mois, b: Mois): number {
  return a.annee * 12 + a.mois - (b.annee * 12 + b.mois)
}

export function moisDuJour(jour: string): Mois {
  return anneeMois(jour)
}

/** Semaines du mois, du lundi au dimanche ; null pour les cases hors du mois. */
export function semainesDuMois(m: Mois): (string | null)[][] {
  const jours = joursEntre(premierJour(m), dernierJour(m))
  const decalage = (jourSemaine(jours[0]) + 6) % 7 // lundi = 0
  const cases: (string | null)[] = [...Array<null>(decalage).fill(null), ...jours]
  while (cases.length % 7 !== 0) cases.push(null)
  const semaines: (string | null)[][] = []
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7))
  return semaines
}

/** Mois couverts par une liste de jours (triés). */
export function moisCouverts(jours: string[]): Mois[] {
  const vus = new Map<string, Mois>()
  for (const j of [...jours].sort()) {
    const m = moisDuJour(j)
    vus.set(`${m.annee}-${m.mois}`, m)
  }
  return [...vus.values()]
}

/**
 * Jours d'un mois regroupés par jour de semaine, dans l'ordre du programme (ex. mardi, vendredi, dimanche).
 * Seuls les jours de semaine présents dans `ordreJoursSemaine` sont retenus.
 */
export function joursParJourSemaine(
  joursDeTraversee: string[],
  m: Mois,
  ordreJoursSemaine: number[],
): { jourSemaine: number; jours: string[] }[] {
  const debut = premierJour(m)
  const fin = dernierJour(m)
  const duMois = joursDeTraversee.filter((j) => j >= debut && j <= fin)
  return ordreJoursSemaine.map((js) => ({
    jourSemaine: js,
    jours: duMois.filter((j) => jourSemaine(j) === js).sort(),
  }))
}
