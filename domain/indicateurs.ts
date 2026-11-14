/**
 * Indicateurs du back-office (CAHIER_DES_CHARGES_GESTION §3.1), fonctions pures.
 *
 * Tout se calcule à partir de la liste des réservations, pour que chaque chiffre se recalcule à
 * l'identique à partir de la liste détaillée qui le compose (§8).
 * Conventions :
 * - « vendue » : réservation payée ou émise (embarquée, absente) créée avant l'instant considéré ;
 *   les blocages en cours ne comptent pas dans les ventes ;
 * - « places » : adultes et enfants (les bébés n'occupent pas de place, PLAN_DEMO décision 4) ;
 *   « passagers » : tous, bébés compris ;
 * - recette billets : prix des passagers figé à la réservation, hors options ; recette options à part.
 */
import { compositionDe, estBlocageActif, placesReservation, STATUTS_VENDUS } from "./occupation"
import { jourDeDepart } from "./programme"
import { montantPassagers, ORDRE_FAMILLES } from "./tarifs"
import { ajouterJours, jourLocal } from "./temps"
import type {
  Canal,
  CodeFamille,
  MoyenPaiement,
  Periode,
  Reservation,
  StatutReservation,
  Traversee,
} from "./types"

const MS_JOUR = 86_400_000

export function estVendue(r: Pick<Reservation, "statut" | "creeLe">, maintenant: Date): boolean {
  return Date.parse(r.creeLe) <= maintenant.getTime() && STATUTS_VENDUS.includes(r.statut)
}

/** Statut à afficher : un blocage dépassé est « expiré ». */
export function statutAffiche(r: Pick<Reservation, "statut" | "bloqueeJusquA">, maintenant: Date): StatutReservation {
  return r.statut === "bloquee" && !estBlocageActif(r, maintenant) ? "expiree" : r.statut
}

export function recetteBillets(r: Pick<Reservation, "prixUnitaires" | "passagers">): number {
  return montantPassagers(r.prixUnitaires, compositionDe(r.passagers))
}

export function recetteOptions(r: Pick<Reservation, "options">): number {
  return r.options.reduce((s, o) => s + o.prixUnitaire * o.quantite, 0)
}

export function grouperParTraversee(reservations: Reservation[]): Map<string, Reservation[]> {
  const groupes = new Map<string, Reservation[]>()
  for (const r of reservations) {
    const liste = groupes.get(r.traverseeId)
    if (liste) liste.push(r)
    else groupes.set(r.traverseeId, [r])
  }
  return groupes
}

export interface Indicateurs {
  traversees: number
  /** Somme des capacités vendables. */
  capacite: number
  reservations: number
  places: number
  passagers: number
  recetteBillets: number
  recetteOptions: number
  /** Places vendues ÷ capacité vendable ; null sans capacité. */
  remplissage: number | null
  /** Recette billets ÷ capacité vendable, arrondie au franc : l'indicateur principal du yield. */
  recetteParSiege: number | null
  /** Recette billets ÷ passagers, arrondie au franc. */
  recetteParPassager: number | null
}

/** Indicateurs d'un ensemble de traversées, à partir des réservations vendues de ces traversées. */
export function calculerIndicateurs(
  traversees: Traversee[],
  reservations: Reservation[],
  maintenant: Date,
): Indicateurs {
  const ids = new Set(traversees.map((t) => t.id))
  const capacite = traversees.reduce((s, t) => s + t.capaciteVendable, 0)
  let nombre = 0
  let places = 0
  let passagers = 0
  let billets = 0
  let options = 0
  for (const r of reservations) {
    if (!ids.has(r.traverseeId) || !estVendue(r, maintenant)) continue
    nombre += 1
    places += placesReservation(r)
    passagers += r.passagers.length
    billets += recetteBillets(r)
    options += recetteOptions(r)
  }
  return {
    traversees: traversees.length,
    capacite,
    reservations: nombre,
    places,
    passagers,
    recetteBillets: billets,
    recetteOptions: options,
    remplissage: capacite > 0 ? places / capacite : null,
    recetteParSiege: capacite > 0 ? Math.round(billets / capacite) : null,
    recetteParPassager: passagers > 0 ? Math.round(billets / passagers) : null,
  }
}

export interface Part {
  reservations: number
  places: number
  passagers: number
  recette: number
}

const PART_VIDE: Part = { reservations: 0, places: 0, passagers: 0, recette: 0 }

/** Répartition des réservations vendues selon une clé (famille, canal, moyen de paiement…). */
export function repartir<K extends string>(
  reservations: Reservation[],
  maintenant: Date,
  cles: readonly K[],
  cle: (r: Reservation) => K | null,
): Record<K, Part> {
  const resultat = Object.fromEntries(cles.map((k) => [k, { ...PART_VIDE }])) as Record<K, Part>
  for (const r of reservations) {
    if (!estVendue(r, maintenant)) continue
    const k = cle(r)
    if (k === null || !(k in resultat)) continue
    const part = resultat[k]
    part.reservations += 1
    part.places += placesReservation(r)
    part.passagers += r.passagers.length
    part.recette += recetteBillets(r) + recetteOptions(r)
  }
  return resultat
}

export function repartitionParFamille(reservations: Reservation[], maintenant: Date): Record<CodeFamille, Part> {
  return repartir(reservations, maintenant, ORDRE_FAMILLES, (r) => r.familleCode)
}

export const CANAUX: readonly Canal[] = ["web", "agence", "telephone"]
export const MOYENS: readonly MoyenPaiement[] = ["airtel", "moov", "especes"]

export function repartitionParCanal(reservations: Reservation[], maintenant: Date): Record<Canal, Part> {
  return repartir(reservations, maintenant, CANAUX, (r) => r.canal)
}

export function repartitionParMoyen(reservations: Reservation[], maintenant: Date): Record<MoyenPaiement, Part> {
  return repartir(reservations, maintenant, MOYENS, (r) => r.moyenPaiement)
}

export interface PointRythme {
  /** Jour de réservation (AAAA-MM-JJ, heure du Gabon). */
  jour: string
  reservations: number
  places: number
}

/** Rythme de réservation : places vendues par jour de réservation, sur les `jours` derniers jours (aujourd'hui compris). */
export function rythmeReservation(reservations: Reservation[], maintenant: Date, jours: number): PointRythme[] {
  const aujourdhui = jourLocal(maintenant)
  const points: PointRythme[] = []
  const index = new Map<string, PointRythme>()
  for (let n = jours - 1; n >= 0; n--) {
    const point = { jour: ajouterJours(aujourdhui, -n), reservations: 0, places: 0 }
    points.push(point)
    index.set(point.jour, point)
  }
  for (const r of reservations) {
    if (!estVendue(r, maintenant)) continue
    const point = index.get(jourLocal(r.creeLe))
    if (!point) continue
    point.reservations += 1
    point.places += placesReservation(r)
  }
  return points
}

/** Pick-up : places vendues pendant les `jours` derniers jours (24 h × jours avant maintenant). */
export function pickUp(reservations: Reservation[], maintenant: Date, jours: number): number {
  const debut = maintenant.getTime() - jours * MS_JOUR
  return reservations
    .filter((r) => estVendue(r, maintenant) && Date.parse(r.creeLe) > debut)
    .reduce((s, r) => s + placesReservation(r), 0)
}

export interface PointCourbe {
  /** Jours avant le départ (30 … 0). */
  joursAvant: number
  /** Places vendues cumulées à ce moment ; null s'il est encore dans le futur. */
  places: number | null
}

/** Courbe des places vendues cumulées de J-`jours` à J0 (le départ), pour une traversée. */
export function courbeCumulee(
  traversee: Traversee,
  reservations: Reservation[],
  maintenant: Date,
  jours: number,
): PointCourbe[] {
  const depart = Date.parse(traversee.departAt)
  const ventes = reservations
    .filter((r) => r.traverseeId === traversee.id && STATUTS_VENDUS.includes(r.statut))
    .map((r) => ({ t: Date.parse(r.creeLe), places: placesReservation(r) }))
  const points: PointCourbe[] = []
  for (let n = jours; n >= 0; n--) {
    const instant = depart - n * MS_JOUR
    if (instant > maintenant.getTime()) {
      points.push({ joursAvant: n, places: null })
      continue
    }
    points.push({ joursAvant: n, places: ventes.filter((v) => v.t <= instant).reduce((s, v) => s + v.places, 0) })
  }
  return points
}

export interface CourbeReference {
  points: { joursAvant: number; places: number }[]
  /** Nombre de traversées déjà parties sur lesquelles la moyenne est calculée. */
  nombre: number
}

/**
 * Courbe de référence : moyenne des courbes des traversées déjà parties (même sens en général).
 * Null tant qu'il n'y en a pas au moins `minimum` : aucun chiffre sans historique suffisant (§8).
 */
export function courbeReference(
  traverseesParties: Traversee[],
  parTraversee: Map<string, Reservation[]>,
  maintenant: Date,
  jours: number,
  minimum: number,
): CourbeReference | null {
  const parties = traverseesParties.filter((t) => Date.parse(t.departAt) <= maintenant.getTime())
  if (parties.length === 0 || parties.length < minimum) return null
  const sommes = new Array<number>(jours + 1).fill(0)
  for (const t of parties) {
    courbeCumulee(t, parTraversee.get(t.id) ?? [], maintenant, jours).forEach((p, i) => {
      sommes[i] += p.places ?? 0
    })
  }
  return {
    points: sommes.map((s, i) => ({ joursAvant: jours - i, places: s / parties.length })),
    nombre: parties.length,
  }
}

/** Valeur de la référence à `joursAvant` (décimal), par interpolation linéaire ; null hors de la courbe. */
export function referenceA(reference: CourbeReference, joursAvant: number): number | null {
  const max = reference.points[0]?.joursAvant ?? 0
  if (joursAvant < 0 || joursAvant > max) return null
  const valeur = (n: number) => reference.points.find((p) => p.joursAvant === n)?.places ?? 0
  const bas = Math.floor(joursAvant)
  const haut = Math.ceil(joursAvant)
  if (bas === haut) return valeur(bas)
  const f = joursAvant - bas
  return valeur(bas) * (1 - f) + valeur(haut) * f
}

/**
 * Écart relatif entre les places vendues à cet instant et la référence au même moment avant le départ
 * (+0,2 = 20 % d'avance) ; null si la traversée est partie, hors de la courbe ou si la référence est nulle.
 */
export function ecartAReference(
  traversee: Traversee,
  placesVendues: number,
  reference: CourbeReference | null,
  maintenant: Date,
): number | null {
  if (!reference) return null
  const joursAvant = (Date.parse(traversee.departAt) - maintenant.getTime()) / MS_JOUR
  const ref = referenceA(reference, joursAvant)
  if (ref === null || ref <= 0) return null
  return (placesVendues - ref) / ref
}

export type Alerte = "complete" | "presque-pleine" | "en-avance" | "en-retard" | "paliers-fermes"

export interface SeuilsAlertes {
  /** Remplissage (0 à 1) à partir duquel une traversée est « presque pleine ». */
  presquePlein: number
  /** Écart à la référence (0 à 1) à partir duquel une traversée est en avance ou en retard. */
  ecartReference: number
}

export function alertesTraversee(
  etat: { placesOccupees: number; capacite: number; ecart: number | null; paliersFermes: number },
  seuils: SeuilsAlertes,
): Alerte[] {
  const alertes: Alerte[] = []
  if (etat.capacite > 0 && etat.placesOccupees >= etat.capacite) alertes.push("complete")
  else if (etat.capacite > 0 && etat.placesOccupees / etat.capacite >= seuils.presquePlein) alertes.push("presque-pleine")
  if (etat.ecart !== null && etat.ecart >= seuils.ecartReference) alertes.push("en-avance")
  if (etat.ecart !== null && etat.ecart <= -seuils.ecartReference) alertes.push("en-retard")
  if (etat.paliersFermes > 0) alertes.push("paliers-fermes")
  return alertes
}

/** Mois couverts par une période, au format AAAA-MM. */
export function moisDeLaPeriode(periode: Periode): string[] {
  const mois: string[] = []
  for (let m = periode.du.slice(0, 7); m <= periode.au.slice(0, 7); ) {
    mois.push(m)
    const [a, n] = m.split("-").map(Number)
    m = n === 12 ? `${a + 1}-01` : `${a}-${String(n + 1).padStart(2, "0")}`
  }
  return mois
}

export interface FiltreTableauDeBord {
  /** AAAA-MM, ou null pour tout le programme. */
  mois: string | null
  /** Sens, ou null pour les deux. */
  ligneId: string | null
}

export function filtrerTraversees(traversees: Traversee[], filtre: FiltreTableauDeBord): Traversee[] {
  return traversees.filter(
    (t) =>
      (filtre.mois === null || jourDeDepart(t).startsWith(filtre.mois)) &&
      (filtre.ligneId === null || t.ligneId === filtre.ligneId),
  )
}
