/**
 * Recherche des réservations, liste des billets vendus et manifeste de bord d'une traversée
 * (CAHIER_DES_CHARGES_GESTION §3.4 et §3.5), fonctions pures.
 * - Billets vendus : tous les passagers payés, avec leur statut d'embarquement.
 * - Manifeste de bord : les seuls passagers embarqués (contrôlés au scan), dans l'ordre d'embarquement.
 * Le format exact du manifeste exigé par les autorités est à valider avec LOGIMAR.
 */
import { chiffresTelephone } from "./contact"
import { estVendue, statutAffiche } from "./indicateurs"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "./passagers"
import type {
  Canal,
  Categorie,
  ClotureEmbarquement,
  Embarquement,
  ModeControle,
  Reservation,
  StatutReservation,
  TypePiece,
} from "./types"

function simplifier(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

export interface FiltreReservations {
  /** Référence, nom ou prénom d'un passager, téléphone ou e-mail. */
  texte: string
  traverseeId: string | null
  statut: StatutReservation | null
  canal: Canal | null
}

export const FILTRE_VIDE: FiltreReservations = { texte: "", traverseeId: null, statut: null, canal: null }

export function correspondTexte(r: Reservation, texte: string): boolean {
  const saisie = simplifier(texte)
  if (saisie === "") return true
  if (simplifier(r.reference).includes(saisie.replace(/\s/g, ""))) return true
  if (r.email && r.email.includes(saisie)) return true
  const chiffres = chiffresTelephone(texte)
  if (chiffres && r.telephone && chiffresTelephone(r.telephone) === chiffres) return true
  const mots = saisie.split(/\s+/)
  return r.passagers.some((p) => {
    const nom = `${simplifier(p.prenom)} ${simplifier(p.nom)}`
    return mots.every((m) => nom.includes(m))
  })
}

/** Réservations correspondant au filtre, de la plus récente à la plus ancienne. */
export function filtrerReservations(
  reservations: Reservation[],
  filtre: FiltreReservations,
  maintenant: Date,
): Reservation[] {
  return reservations
    .filter(
      (r) =>
        Date.parse(r.creeLe) <= maintenant.getTime() &&
        r.statut !== "brouillon" &&
        (filtre.traverseeId === null || r.traverseeId === filtre.traverseeId) &&
        (filtre.statut === null || statutAffiche(r, maintenant) === filtre.statut) &&
        (filtre.canal === null || r.canal === filtre.canal) &&
        correspondTexte(r, filtre.texte),
    )
    .sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe))
}

export type StatutEmbarquement = "a-embarquer" | "embarque" | "absent"

export interface LignePassager {
  numero: number
  reservationId: string
  passagerId: string
  reference: string
  nom: string
  prenom: string
  categorie: Categorie
  dateNaissance: string | null
  typePiece: TypePiece | null
  numeroPiece: string | null
  statut: StatutEmbarquement
  /** Heure de passage à bord, si le passager est embarqué. */
  embarqueLe: string | null
  mode: ModeControle | null
}

function trierParNom<T extends { nom: string; prenom: string }>(lignes: T[]): T[] {
  return [...lignes].sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
}

function numeroter<T extends { numero: number }>(lignes: T[]): T[] {
  return lignes.map((l, i) => ({ ...l, numero: i + 1 }))
}

/**
 * Billets vendus : passagers payés de la traversée, par ordre alphabétique, avec leur statut d'embarquement
 * (§8 : cette liste correspond exactement aux passagers payés).
 */
export function passagersPayes(
  reservations: Reservation[],
  traverseeId: string,
  maintenant: Date,
  embarquements: Embarquement[] = [],
  cloture: ClotureEmbarquement | null = null,
): LignePassager[] {
  const aBord = new Map(embarquements.filter((e) => e.traverseeId === traverseeId).map((e) => [e.passagerId, e]))
  const lignes = reservations
    .filter((r) => r.traverseeId === traverseeId && estVendue(r, maintenant))
    .flatMap((r) =>
      r.passagers.map((p): LignePassager => {
        const embarquement = aBord.get(p.id)
        const statut: StatutEmbarquement =
          embarquement || r.statut === "embarquee"
            ? "embarque"
            : cloture || r.statut === "absente"
              ? "absent"
              : "a-embarquer"
        return {
          numero: 0,
          reservationId: r.id,
          passagerId: p.id,
          reference: r.reference,
          nom: p.nom.toUpperCase(),
          prenom: p.prenom,
          categorie: p.categorie,
          dateNaissance: p.dateNaissance,
          typePiece: p.typePiece,
          numeroPiece: p.numeroPiece,
          statut,
          embarqueLe: embarquement?.embarqueLe ?? null,
          mode: embarquement?.mode ?? null,
        }
      }),
    )
  return numeroter(trierParNom(lignes))
}

/** Manifeste de bord : les passagers embarqués, dans l'ordre de passage à bord. */
export function manifesteDeBord(
  reservations: Reservation[],
  traverseeId: string,
  embarquements: Embarquement[],
): LignePassager[] {
  const parId = new Map(reservations.map((r) => [r.id, r]))
  const lignes: LignePassager[] = []
  const tries = embarquements
    .filter((e) => e.traverseeId === traverseeId)
    .sort((a, b) => Date.parse(a.embarqueLe) - Date.parse(b.embarqueLe))
  for (const e of tries) {
    const p = parId.get(e.reservationId)?.passagers.find((x) => x.id === e.passagerId)
    if (!p) continue
    lignes.push({
      numero: 0,
      reservationId: e.reservationId,
      passagerId: p.id,
      reference: e.reference,
      nom: p.nom.toUpperCase(),
      prenom: p.prenom,
      categorie: p.categorie,
      dateNaissance: p.dateNaissance,
      typePiece: p.typePiece,
      numeroPiece: p.numeroPiece,
      statut: "embarque",
      embarqueLe: e.embarqueLe,
      mode: e.mode,
    })
  }
  return numeroter(lignes)
}

export interface CompteurEmbarquement {
  /** Passagers payés, bébés compris. */
  attendus: number
  aBord: number
  /** Encore attendus (embarquement en cours). */
  restants: number
  /** Non embarqués après la clôture. */
  absents: number
}

export function compterEmbarquement(lignes: LignePassager[]): CompteurEmbarquement {
  const compte = (s: StatutEmbarquement) => lignes.filter((l) => l.statut === s).length
  return { attendus: lignes.length, aBord: compte("embarque"), restants: compte("a-embarquer"), absents: compte("absent") }
}

export function compterParCategorie(lignes: LignePassager[]): Record<Categorie, number> {
  const compte: Record<Categorie, number> = { adulte: 0, enfant: 0, bebe: 0 }
  for (const l of lignes) compte[l.categorie] += 1
  return compte
}

export const LIBELLES_EMBARQUEMENT: Record<StatutEmbarquement, string> = {
  "a-embarquer": "À embarquer",
  embarque: "Embarqué",
  absent: "Absent",
}

export const LIBELLES_MODE: Record<ModeControle, string> = { scan: "Scan", manuel: "Contrôle manuel" }

function cellule(valeur: string): string {
  return /[";\n\r]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
}

function csv(colonnes: string[], lignes: string[][], entete: string[]): string {
  const corps = lignes.map((l) => l.map(cellule).join(";"))
  return "\uFEFF" + [...entete.map(cellule), colonnes.join(";"), ...corps].join("\r\n") + "\r\n"
}

function identite(l: LignePassager): string[] {
  return [
    l.nom,
    l.prenom,
    libelleCategorie(l.categorie),
    l.dateNaissance ?? "",
    l.typePiece ? LIBELLES_PIECES_COURTS[l.typePiece] : "",
    l.numeroPiece ?? "",
    l.reference,
  ]
}

const COLONNES_IDENTITE = ["Nom", "Prénom", "Catégorie", "Date de naissance", "Pièce", "Numéro de pièce", "Référence"]

/** Billets vendus au format CSV (séparateur « ; » pour Excel en français, marque BOM pour les accents). */
export function passagersPayesCsv(lignes: LignePassager[], entete: string[] = []): string {
  return csv(
    ["N°", ...COLONNES_IDENTITE, "Statut"],
    lignes.map((l) => [String(l.numero), ...identite(l), LIBELLES_EMBARQUEMENT[l.statut]]),
    entete,
  )
}

/** Manifeste de bord au format CSV ; `heure` formate l'heure de passage à bord. */
export function manifesteDeBordCsv(lignes: LignePassager[], heure: (iso: string) => string, entete: string[] = []): string {
  return csv(
    ["N°", "Heure d’embarquement", ...COLONNES_IDENTITE, "Contrôle"],
    lignes.map((l) => [
      String(l.numero),
      l.embarqueLe ? heure(l.embarqueLe) : "",
      ...identite(l),
      l.mode ? LIBELLES_MODE[l.mode] : "",
    ]),
    entete,
  )
}
