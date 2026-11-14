/**
 * Dates, heures et durées.
 * Un « jour » est une chaîne AAAA-MM-JJ (date locale du Gabon) ; un « instant » est une
 * chaîne ISO 8601 avec décalage. Le Gabon est à UTC+1 toute l'année (pas d'heure d'été).
 */

export const FUSEAU_GABON = "Africa/Libreville"
export const DECALAGE_GABON = "+01:00"

const RE_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/
const RE_HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/
const MS_PAR_JOUR = 86_400_000

export const NOMS_JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
export const NOMS_MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]

function versDateUTC(jour: string): Date {
  const m = RE_JOUR.exec(jour)
  if (!m) throw new Error(`Jour invalide : ${jour}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

export function estJour(valeur: string): boolean {
  const m = RE_JOUR.exec(valeur)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toISOString().slice(0, 10) === valeur
}

export function estHeure(valeur: string): boolean {
  return RE_HEURE.test(valeur)
}

export function ajouterJours(jour: string, n: number): string {
  return new Date(versDateUTC(jour).getTime() + n * MS_PAR_JOUR).toISOString().slice(0, 10)
}

/** 0 = dimanche … 6 = samedi. */
export function jourSemaine(jour: string): number {
  return versDateUTC(jour).getUTCDay()
}

/** Nombre de jours de `a` à `b` (positif si `b` est après `a`). */
export function ecartJours(a: string, b: string): number {
  return Math.round((versDateUTC(b).getTime() - versDateUTC(a).getTime()) / MS_PAR_JOUR)
}

/** Tous les jours de `du` à `au` inclus. */
export function joursEntre(du: string, au: string): string[] {
  const jours: string[] = []
  for (let j = du; j <= au; j = ajouterJours(j, 1)) jours.push(j)
  return jours
}

export function instant(jour: string, heure: string, decalage: string = DECALAGE_GABON): string {
  if (!estJour(jour)) throw new Error(`Jour invalide : ${jour}`)
  if (!estHeure(heure)) throw new Error(`Heure invalide : ${heure}`)
  return `${jour}T${heure}:00${decalage}`
}

export function dureeMinutes(debut: string, fin: string): number {
  return Math.round((Date.parse(fin) - Date.parse(debut)) / 60_000)
}

/** 210 → « 3 h 30 », 180 → « 3 h », 45 → « 45 min ». */
export function formatDuree(minutes: number): string {
  if (minutes < 0) throw new Error("Durée négative")
  const h = Math.floor(minutes / 60)
  const min = minutes % 60
  if (h === 0) return `${min} min`
  if (min === 0) return `${h} h`
  return `${h} h ${String(min).padStart(2, "0")}`
}

const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: FUSEAU_GABON,
})

const formatJourISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: FUSEAU_GABON,
})

/** « 12:15 », à l'heure du Gabon. */
export function heureLocale(instantISO: string | Date): string {
  const d = typeof instantISO === "string" ? new Date(instantISO) : instantISO
  return formatHeure.format(d)
}

/** Jour (AAAA-MM-JJ) à l'heure du Gabon. */
export function jourLocal(instantISO: string | Date): string {
  const d = typeof instantISO === "string" ? new Date(instantISO) : instantISO
  const parts = formatJourISO.formatToParts(d)
  const val = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${val("year")}-${val("month")}-${val("day")}`
}

const formatCourt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** « Mar. 17 nov. » */
export function formatJourCourt(jour: string): string {
  const parts = formatCourt.formatToParts(versDateUTC(jour))
  const val = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${majuscule(val("weekday"))} ${val("day")} ${val("month")}`
}

/** « Mardi 17 novembre » (avec l'année si demandé). */
export function formatJourLong(jour: string, avecAnnee = false): string {
  const d = versDateUTC(jour)
  const base = `${NOMS_JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${NOMS_MOIS[d.getUTCMonth()].toLowerCase()}`
  return avecAnnee ? `${base} ${d.getUTCFullYear()}` : base
}

/** « Novembre 2026 » ; `mois` de 1 à 12. */
export function formatMoisAnnee(annee: number, mois: number): string {
  return `${NOMS_MOIS[mois - 1]} ${annee}`
}

/** Année et mois (1 à 12) d'un jour. */
export function anneeMois(jour: string): { annee: number; mois: number } {
  const d = versDateUTC(jour)
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1 }
}

const formatMoisCourtIntl = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" })

/** « nov. », « déc. », « janv. » */
export function formatMoisCourt(jour: string): string {
  return formatMoisCourtIntl.format(versDateUTC(jour))
}
