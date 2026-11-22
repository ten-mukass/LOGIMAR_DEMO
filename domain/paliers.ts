/**
 * Ouverture et fermeture manuelles des paliers (back-office), et état de chaque palier
 * pour la fiche traversée. Fonctions pures.
 *
 * Règles (CAHIER_DES_CHARGES_GESTION §3.3) :
 * - le revenue manager ouvre ou ferme un palier avec un motif obligatoire ;
 * - le VIP reste toujours vendable tant qu'il reste des places : on ne peut pas fermer son dernier palier ouvert ;
 * - un prix déjà bloqué par un client ne change pas (le prix est figé dans la réservation au blocage).
 */
import { meilleureOffre, ORDRE_FAMILLES, placesRestantesClasse, placesRestantesTraversee, type Occupation } from "./tarifs"
import type { ChangementPalier, ClasseReservation, CodeFamille } from "./types"

/** Changements triés du plus ancien au plus récent. */
function chronologique(changements: ChangementPalier[]): ChangementPalier[] {
  return [...changements].sort((a, b) => Date.parse(a.le) - Date.parse(b.le))
}

/** Applique à chaque palier son dernier changement manuel ; sans changement, le palier garde son état. */
export function appliquerChangements(
  classes: ClasseReservation[],
  changements: ChangementPalier[],
): ClasseReservation[] {
  const dernier = new Map<string, ChangementPalier>()
  for (const c of chronologique(changements)) dernier.set(c.classeId, c)
  return classes.map((classe) => {
    const changement = dernier.get(classe.id)
    return changement ? { ...classe, ouverte: changement.ouverte } : classe
  })
}

/** Le palier était-il ouvert à cet instant (ISO) ? Ouvert par défaut. */
export function palierOuvertA(changements: ChangementPalier[], classeId: string, instantISO: string): boolean {
  const t = Date.parse(instantISO)
  let ouverte = true
  for (const c of chronologique(changements)) {
    if (c.classeId !== classeId) continue
    if (Date.parse(c.le) > t) break
    ouverte = c.ouverte
  }
  return ouverte
}

export type EtatPalier =
  /** Palier auquel la famille se vend en ce moment (pour un adulte seul). */
  | "en-vente"
  /** Ouvert, avec des places, mais un palier moins cher se vend d'abord. */
  | "en-attente"
  /** Quota atteint, ou navire complet. */
  | "epuise"
  /** Fermé à la main. */
  | "ferme"

export interface LignePalier {
  classe: ClasseReservation
  /** Places occupées dans le palier (vendues et bloquées), comme pour le calcul du prix. */
  occupees: number
  /** Places encore vendables dans le palier, bornées par la capacité restante du navire. */
  restantes: number
  etat: EtatPalier
}

const UN_ADULTE = { adultes: 1, enfants: 0, bebes: 0 }

/** Paliers d'une traversée, famille par famille, avec leur état. */
export function etatPaliers(classes: ClasseReservation[], capaciteVendable: number, occupation: Occupation): LignePalier[] {
  const restantesNavire = placesRestantesTraversee(capaciteVendable, occupation)
  const lignes: LignePalier[] = []
  for (const famille of ORDRE_FAMILLES) {
    const offre = meilleureOffre(classes, famille, UN_ADULTE, capaciteVendable, occupation)
    const enVente = offre.disponible ? offre.classe.id : null
    const paliers = classes.filter((c) => c.familleCode === famille).sort((a, b) => a.rang - b.rang)
    for (const classe of paliers) {
      const restantes = Math.min(placesRestantesClasse(classe, occupation), restantesNavire)
      const etat: EtatPalier = !classe.ouverte
        ? "ferme"
        : restantes === 0
          ? "epuise"
          : classe.id === enVente
            ? "en-vente"
            : "en-attente"
      lignes.push({ classe, occupees: occupation.parClasse[classe.id] ?? 0, restantes, etat })
    }
  }
  return lignes
}

/** Palier en vente par famille (pour un adulte seul), ou null si la famille ne se vend plus. */
export function paliersEnVente(
  classes: ClasseReservation[],
  capaciteVendable: number,
  occupation: Occupation,
): Record<CodeFamille, ClasseReservation | null> {
  const resultat = { ECO: null, VIP: null } as Record<CodeFamille, ClasseReservation | null>
  for (const famille of ORDRE_FAMILLES) {
    const offre = meilleureOffre(classes, famille, UN_ADULTE, capaciteVendable, occupation)
    resultat[famille] = offre.disponible ? offre.classe : null
  }
  return resultat
}

export const MOTIF_MIN = 3

/** Le VIP reste toujours vendable : son dernier palier ouvert ne se ferme pas. */
export function fermeturePermise(classes: ClasseReservation[], classeId: string): boolean {
  const classe = classes.find((c) => c.id === classeId)
  if (!classe || classe.familleCode !== "VIP") return true
  return classes.some((c) => c.familleCode === "VIP" && c.id !== classeId && c.ouverte)
}

/** Refus d'un changement de palier, ou null s'il est permis. */
export function verifierChangementPalier(
  classes: ClasseReservation[],
  classeId: string,
  ouverte: boolean,
  motif: string,
): string | null {
  const classe = classes.find((c) => c.id === classeId)
  if (!classe) return "Palier introuvable."
  if (classe.ouverte === ouverte) return ouverte ? "Ce palier est déjà ouvert." : "Ce palier est déjà fermé."
  if (motif.trim().length < MOTIF_MIN) return "Indiquez le motif du changement."
  if (!ouverte && !fermeturePermise(classes, classeId)) {
    return "Le VIP reste vendable tant qu’il reste des places : son dernier palier ne se ferme pas."
  }
  return null
}

/** Nombre de paliers fermés à la main. */
export function nombrePaliersFermes(classes: ClasseReservation[]): number {
  return classes.filter((c) => !c.ouverte).length
}
