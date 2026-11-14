/**
 * Recherche des réservations et manifeste d'une traversée (CAHIER_DES_CHARGES_GESTION §3.4), fonctions pures.
 * Le format exact du manifeste exigé par les autorités est à valider avec LOGIMAR.
 */
import { chiffresTelephone } from "./contact"
import { estVendue, statutAffiche } from "./indicateurs"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "./passagers"
import type { Canal, Categorie, Reservation, StatutReservation, TypePiece } from "./types"

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

export interface LigneManifeste {
  numero: number
  reservationId: string
  reference: string
  nom: string
  prenom: string
  categorie: Categorie
  dateNaissance: string | null
  typePiece: TypePiece | null
  numeroPiece: string | null
  statut: StatutEmbarquement
}

function statutEmbarquement(r: Reservation): StatutEmbarquement {
  if (r.statut === "embarquee") return "embarque"
  if (r.statut === "absente") return "absent"
  return "a-embarquer"
}

/** Passagers payés de la traversée, par ordre alphabétique (§8 : le manifeste correspond aux passagers payés). */
export function manifeste(reservations: Reservation[], traverseeId: string, maintenant: Date): LigneManifeste[] {
  const lignes = reservations
    .filter((r) => r.traverseeId === traverseeId && estVendue(r, maintenant))
    .flatMap((r) =>
      r.passagers.map((p) => ({
        numero: 0,
        reservationId: r.id,
        reference: r.reference,
        nom: p.nom.toUpperCase(),
        prenom: p.prenom,
        categorie: p.categorie,
        dateNaissance: p.dateNaissance,
        typePiece: p.typePiece,
        numeroPiece: p.numeroPiece,
        statut: statutEmbarquement(r),
      })),
    )
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"))
  return lignes.map((l, i) => ({ ...l, numero: i + 1 }))
}

export function compterParCategorie(lignes: LigneManifeste[]): Record<Categorie, number> {
  const compte: Record<Categorie, number> = { adulte: 0, enfant: 0, bebe: 0 }
  for (const l of lignes) compte[l.categorie] += 1
  return compte
}

export const LIBELLES_EMBARQUEMENT: Record<StatutEmbarquement, string> = {
  "a-embarquer": "À embarquer",
  embarque: "Embarqué",
  absent: "Absent",
}

function cellule(valeur: string): string {
  return /[";\n\r]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
}

/** Manifeste au format CSV (séparateur « ; » pour Excel en français, marque BOM pour les accents). */
export function manifesteCsv(lignes: LigneManifeste[], entete: string[] = []): string {
  const colonnes = ["N°", "Nom", "Prénom", "Catégorie", "Date de naissance", "Pièce", "Numéro de pièce", "Référence", "Statut"]
  const corps = lignes.map((l) =>
    [
      String(l.numero),
      l.nom,
      l.prenom,
      libelleCategorie(l.categorie),
      l.dateNaissance ?? "",
      l.typePiece ? LIBELLES_PIECES_COURTS[l.typePiece] : "",
      l.numeroPiece ?? "",
      l.reference,
      LIBELLES_EMBARQUEMENT[l.statut],
    ]
      .map(cellule)
      .join(";"),
  )
  return "﻿" + [...entete.map(cellule), colonnes.join(";"), ...corps].join("\r\n") + "\r\n"
}
