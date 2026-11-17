/**
 * Contrôle des billets à l'embarquement (CAHIER_DES_CHARGES_GESTION §3.5), fonctions pures.
 *
 * Règles (besoin exprimé le 18/11/2026) :
 * - un scan valide fait monter à bord tous les passagers du billet qui n'y sont pas encore ;
 * - le billet n'est plus valable ensuite : un second scan donne « déjà scanné » ;
 * - le manifeste de bord est la liste des passagers embarqués, distincte de la liste des billets vendus ;
 * - après la clôture de l'embarquement, plus aucun contrôle n'est possible.
 */
import { estVendue } from "./indicateurs"
import type {
  ClotureEmbarquement,
  Embarquement,
  ModeControle,
  Passager,
  Reservation,
} from "./types"

/** Ce que l'agent a présenté : un QR lu (signature déjà vérifiée ou non) ou un billet retrouvé à la main. */
export type LectureBillet =
  | { mode: "scan"; valide: true; reference: string; traverseeId: string }
  | { mode: "scan"; valide: false; motif: "format" | "signature" }
  | { mode: "manuel"; reference: string }

export type Controle =
  | { resultat: "valide"; reservation: Reservation; aEmbarquer: Passager[]; dejaABord: Embarquement[] }
  | { resultat: "deja-scanne"; reservation: Reservation; embarquements: Embarquement[] }
  | { resultat: "autre-traversee"; reference: string; traverseeIdBillet: string }
  | { resultat: "non-valable"; reservation: Reservation }
  | { resultat: "invalide"; motif: "illisible" | "signature" | "inconnu" }
  | { resultat: "embarquement-clos"; cloture: ClotureEmbarquement }

export function controlerBillet(e: {
  lecture: LectureBillet
  traverseeId: string
  /** Réservations de la traversée contrôlée (toutes origines). */
  reservations: Reservation[]
  /** Passagers déjà embarqués sur cette traversée. */
  embarquements: Embarquement[]
  cloture: ClotureEmbarquement | null
  maintenant: Date
}): Controle {
  const { lecture } = e
  if (e.cloture) return { resultat: "embarquement-clos", cloture: e.cloture }
  if (lecture.mode === "scan" && !lecture.valide) {
    return { resultat: "invalide", motif: lecture.motif === "format" ? "illisible" : "signature" }
  }
  if (lecture.mode === "scan" && lecture.traverseeId !== e.traverseeId) {
    return { resultat: "autre-traversee", reference: lecture.reference, traverseeIdBillet: lecture.traverseeId }
  }
  const reservation = e.reservations.find((r) => r.reference !== "" && r.reference === lecture.reference)
  if (!reservation) return { resultat: "invalide", motif: "inconnu" }
  if (!estVendue(reservation, e.maintenant)) return { resultat: "non-valable", reservation }
  const dejaABord = e.embarquements.filter((x) => x.reservationId === reservation.id)
  const aEmbarquer = reservation.passagers.filter((p) => !dejaABord.some((x) => x.passagerId === p.id))
  if (aEmbarquer.length === 0) return { resultat: "deja-scanne", reservation, embarquements: dejaABord }
  return { resultat: "valide", reservation, aEmbarquer, dejaABord }
}

/** Un enregistrement d'embarquement par passager qui monte à bord. */
export function creerEmbarquements(
  reservation: Reservation,
  passagers: Passager[],
  traverseeId: string,
  contexte: { mode: ModeControle; agent: string; maintenant: Date; genererId: () => string },
): Embarquement[] {
  return passagers.map((p) => ({
    id: contexte.genererId(),
    traverseeId,
    reservationId: reservation.id,
    passagerId: p.id,
    reference: reservation.reference,
    mode: contexte.mode,
    agent: contexte.agent,
    embarqueLe: contexte.maintenant.toISOString(),
  }))
}

/** Premier passage à bord d'un billet (heure du scan qui l'a rendu non valable). */
export function premierEmbarquement(embarquements: Embarquement[]): Embarquement | null {
  return [...embarquements].sort((a, b) => Date.parse(a.embarqueLe) - Date.parse(b.embarqueLe))[0] ?? null
}

/** Le billet a-t-il servi pour tous ses passagers sur cette traversée ? */
export function billetUtilise(reservation: Pick<Reservation, "id" | "passagers">, embarquements: Embarquement[]): boolean {
  const aBord = new Set(embarquements.filter((x) => x.reservationId === reservation.id).map((x) => x.passagerId))
  return reservation.passagers.length > 0 && reservation.passagers.every((p) => aBord.has(p.id))
}
