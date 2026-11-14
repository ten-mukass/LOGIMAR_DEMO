/**
 * Critères de recherche, conservés dans l'URL d'un écran à l'autre
 * (docs/CAHIER_DES_CHARGES_RESERVATION.md §4.1 : le nombre et le type de passagers ne doivent pas se perdre).
 */
import { validerComposition } from "./passagers"
import { estJour } from "./temps"
import type { CodePort, CompositionPassagers } from "./types"

export interface CriteresRecherche {
  depart: CodePort
  arrivee: CodePort
  date: string
  /** Jour du retour pour un aller-retour, sinon null. */
  dateRetour: string | null
  passagers: CompositionPassagers
}

const CLES = {
  depart: "de",
  arrivee: "a",
  date: "date",
  dateRetour: "retour",
  adultes: "ad",
  enfants: "enf",
  bebes: "beb",
} as const

interface LecteurParametres {
  get(nom: string): string | null
}

function lireEntier(valeur: string | null, defaut: number): number {
  if (valeur === null || valeur === "") return defaut
  return /^\d+$/.test(valeur) ? Number(valeur) : Number.NaN
}

export function lireCriteres(
  params: LecteurParametres,
  codesPorts: readonly CodePort[],
  passagersMax: number,
): { criteres: CriteresRecherche | null; erreurs: string[] } {
  const erreurs: string[] = []
  const depart = params.get(CLES.depart) as CodePort | null
  const arrivee = params.get(CLES.arrivee) as CodePort | null
  const date = params.get(CLES.date)
  const dateRetour = params.get(CLES.dateRetour)

  if (!depart || !codesPorts.includes(depart)) erreurs.push("Port de départ inconnu.")
  if (!arrivee || !codesPorts.includes(arrivee)) erreurs.push("Port d’arrivée inconnu.")
  if (depart && depart === arrivee) erreurs.push("Le départ et l’arrivée doivent être différents.")
  if (!date || !estJour(date)) erreurs.push("Date de départ invalide.")
  if (dateRetour !== null && dateRetour !== "") {
    if (!estJour(dateRetour)) erreurs.push("Date de retour invalide.")
    else if (date && estJour(date) && dateRetour < date) erreurs.push("Le retour doit suivre l’aller.")
  }

  const passagers: CompositionPassagers = {
    adultes: lireEntier(params.get(CLES.adultes), 1),
    enfants: lireEntier(params.get(CLES.enfants), 0),
    bebes: lireEntier(params.get(CLES.bebes), 0),
  }
  erreurs.push(...validerComposition(passagers, passagersMax))

  if (erreurs.length > 0) return { criteres: null, erreurs }
  return {
    criteres: {
      depart: depart as CodePort,
      arrivee: arrivee as CodePort,
      date: date as string,
      dateRetour: dateRetour || null,
      passagers,
    },
    erreurs,
  }
}

export function versParametres(criteres: CriteresRecherche): string {
  const p = new URLSearchParams()
  p.set(CLES.depart, criteres.depart)
  p.set(CLES.arrivee, criteres.arrivee)
  p.set(CLES.date, criteres.date)
  if (criteres.dateRetour) p.set(CLES.dateRetour, criteres.dateRetour)
  p.set(CLES.adultes, String(criteres.passagers.adultes))
  if (criteres.passagers.enfants > 0) p.set(CLES.enfants, String(criteres.passagers.enfants))
  if (criteres.passagers.bebes > 0) p.set(CLES.bebes, String(criteres.passagers.bebes))
  return p.toString()
}
