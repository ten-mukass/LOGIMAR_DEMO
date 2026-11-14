/**
 * Tarification par paliers (yield management), fonctions pures.
 *
 * Règles (docs/CAHIER_DES_CHARGES_RESERVATION.md §4.3 et CAHIER_DES_CHARGES_GESTION.md §3.3) :
 * - chaque famille (Éco, Standard, Flex) a une suite de paliers du moins cher au plus cher, chacun avec un quota ;
 * - on vend toujours au palier ouvert le moins cher qui a encore assez de places ; un palier épuisé
 *   se ferme de lui-même et le suivant prend le relais ;
 * - un palier peut aussi être fermé à la main par le revenue manager ;
 * - aucune vente au-delà de la capacité vendable de la traversée.
 * Décisions de la démo (docs/PLAN_DEMO.md) : tous les passagers d'une réservation paient au même
 * palier ; les bébés n'occupent pas de place.
 */
import type {
  ClasseReservation,
  CodeFamille,
  CompositionPassagers,
  FamilleTarifaire,
  Prix,
  Traversee,
} from "./types"

export const ORDRE_FAMILLES: CodeFamille[] = ["ECO", "STD", "FLEX"]

/** Palier de la grille modèle, appliqué à chaque traversée. */
export interface PalierGrille {
  familleCode: CodeFamille
  rang: number
  prix: Prix
  quota: number | null
}

/** Places occupées par une traversée et par chacun de ses paliers (vendues + bloquées). */
export interface Occupation {
  total: number
  parClasse: Record<string, number>
}

export const OCCUPATION_VIDE: Occupation = { total: 0, parClasse: {} }

export type Offre =
  | {
      disponible: true
      familleCode: CodeFamille
      classe: ClasseReservation
      prixUnitaires: Prix
      total: number
      /** Places encore vendables à ce prix (bornées par la capacité restante). */
      placesAuPrix: number
    }
  | {
      disponible: false
      familleCode: CodeFamille
      raison: "complet" | "places-insuffisantes" | "famille-epuisee"
    }

/** Les bébés voyagent sur les genoux d'un adulte et n'occupent pas de place. */
export function placesNecessaires(composition: CompositionPassagers): number {
  return composition.adultes + composition.enfants
}

export function totalPassagers(composition: CompositionPassagers): number {
  return composition.adultes + composition.enfants + composition.bebes
}

export function montantPassagers(prix: Prix, composition: CompositionPassagers): number {
  return prix.adulte * composition.adultes + prix.enfant * composition.enfants + prix.bebe * composition.bebes
}

export function idClasse(traverseeId: string, familleCode: CodeFamille, rang: number): string {
  return `${traverseeId}:${familleCode}-${rang}`
}

export function appliquerGrille(traversee: Traversee, grille: PalierGrille[]): ClasseReservation[] {
  return grille.map((p) => ({
    id: idClasse(traversee.id, p.familleCode, p.rang),
    traverseeId: traversee.id,
    familleCode: p.familleCode,
    rang: p.rang,
    prix: { ...p.prix },
    quota: p.quota,
    ouverte: true,
  }))
}

export function placesRestantesTraversee(capaciteVendable: number, occupation: Occupation): number {
  return Math.max(0, capaciteVendable - occupation.total)
}

/** Places restantes dans un palier, sans tenir compte de la capacité du navire. */
export function placesRestantesClasse(classe: ClasseReservation, occupation: Occupation): number {
  if (classe.quota === null) return Number.POSITIVE_INFINITY
  return Math.max(0, classe.quota - (occupation.parClasse[classe.id] ?? 0))
}

/** Palier ouvert le moins cher d'une famille pouvant accueillir tout le groupe, et le prix qui en découle. */
export function meilleureOffre(
  classes: ClasseReservation[],
  familleCode: CodeFamille,
  composition: CompositionPassagers,
  capaciteVendable: number,
  occupation: Occupation,
): Offre {
  const demandees = placesNecessaires(composition)
  const restantesNavire = placesRestantesTraversee(capaciteVendable, occupation)
  if (restantesNavire === 0) return { disponible: false, familleCode, raison: "complet" }
  if (demandees > restantesNavire) return { disponible: false, familleCode, raison: "places-insuffisantes" }

  const paliers = classes.filter((c) => c.familleCode === familleCode).sort((a, b) => a.rang - b.rang)
  for (const classe of paliers) {
    if (!classe.ouverte) continue
    const placesAuPrix = Math.min(placesRestantesClasse(classe, occupation), restantesNavire)
    if (placesAuPrix >= demandees && placesAuPrix > 0) {
      return {
        disponible: true,
        familleCode,
        classe,
        prixUnitaires: classe.prix,
        total: montantPassagers(classe.prix, composition),
        placesAuPrix,
      }
    }
  }
  return { disponible: false, familleCode, raison: "famille-epuisee" }
}

/** Une offre par famille, dans l'ordre Éco, Standard, Flex. */
export function offresTraversee(
  classes: ClasseReservation[],
  composition: CompositionPassagers,
  capaciteVendable: number,
  occupation: Occupation,
  familles: CodeFamille[] = ORDRE_FAMILLES,
): Offre[] {
  return familles.map((f) => meilleureOffre(classes, f, composition, capaciteVendable, occupation))
}

/** Offre disponible la moins chère (prix « dès »), ou null si la traversée est complète pour ce groupe. */
export function offreLaMoinsChere(offres: Offre[]): Extract<Offre, { disponible: true }> | null {
  let meilleure: Extract<Offre, { disponible: true }> | null = null
  for (const o of offres) {
    if (o.disponible && (meilleure === null || o.total < meilleure.total)) meilleure = o
  }
  return meilleure
}

/** Nombre de places à afficher dans l'alerte « Plus que N places à ce prix », ou null si pas d'alerte. */
export function alertePlaces(offre: Offre, seuil: number): number | null {
  if (!offre.disponible) return null
  return offre.placesAuPrix <= seuil ? offre.placesAuPrix : null
}

/** Phrase des conditions d'une famille, construite à partir de ses règles. */
export function conditionsFamille(famille: FamilleTarifaire): string {
  const morceaux: string[] = []
  if (!famille.modifiable) {
    morceaux.push(famille.remboursable ? "Non modifiable, remboursable" : "Ni modifiable ni remboursable")
  } else if (famille.fraisModif === 0) {
    morceaux.push("Modification gratuite")
    if (famille.remboursable) morceaux.push("remboursable")
  } else {
    const delai = famille.delaiModifH !== null ? ` jusqu’à ${famille.delaiModifH} h avant le départ` : ""
    morceaux.push(`Modifiable${delai}, avec frais`)
    if (famille.remboursable) morceaux.push("remboursable")
  }
  morceaux.push(...famille.avantages.map((a) => a.charAt(0).toLowerCase() + a.slice(1)))
  return morceaux.join(", ")
}

/** Contrôle de cohérence d'une grille : rangs consécutifs, prix croissants, quotas valides. */
export function verifierGrille(grille: PalierGrille[]): string[] {
  const erreurs: string[] = []
  for (const famille of ORDRE_FAMILLES) {
    const paliers = grille.filter((p) => p.familleCode === famille).sort((a, b) => a.rang - b.rang)
    if (paliers.length === 0) {
      erreurs.push(`${famille} : aucun palier`)
      continue
    }
    paliers.forEach((p, i) => {
      if (p.rang !== i + 1) erreurs.push(`${famille} : rang ${p.rang} au lieu de ${i + 1}`)
      if (p.quota !== null && (!Number.isInteger(p.quota) || p.quota <= 0)) {
        erreurs.push(`${famille}-${p.rang} : quota invalide`)
      }
      if (p.quota === null && i < paliers.length - 1) {
        erreurs.push(`${famille}-${p.rang} : seul le dernier palier peut être sans quota`)
      }
      for (const cat of ["adulte", "enfant", "bebe"] as const) {
        if (!Number.isInteger(p.prix[cat]) || p.prix[cat] < 0) erreurs.push(`${famille}-${p.rang} : prix ${cat} invalide`)
      }
      const precedent = paliers[i - 1]
      if (precedent) {
        if (p.prix.adulte <= precedent.prix.adulte) erreurs.push(`${famille}-${p.rang} : prix adulte non croissant`)
        if (p.prix.enfant < precedent.prix.enfant) erreurs.push(`${famille}-${p.rang} : prix enfant décroissant`)
      }
    })
  }
  return erreurs
}
