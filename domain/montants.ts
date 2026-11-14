/**
 * Détail du prix : lignes par catégorie de passagers et par option, total.
 */
import { libelleCategorie } from "./passagers"
import type { CodeFamille, CompositionPassagers, LigneOption, OptionCatalogue, Prix } from "./types"

export interface LigneRecap {
  libelle: string
  quantite: number
  prixUnitaire: number
  montant: number
}

export function lignesPassagers(prix: Prix, c: CompositionPassagers): LigneRecap[] {
  const lignes: LigneRecap[] = []
  for (const [categorie, quantite] of [
    ["adulte", c.adultes],
    ["enfant", c.enfants],
    ["bebe", c.bebes],
  ] as const) {
    if (quantite === 0) continue
    lignes.push({
      libelle: `${quantite} ${libelleCategorie(categorie, quantite)}`,
      quantite,
      prixUnitaire: prix[categorie],
      montant: prix[categorie] * quantite,
    })
  }
  return lignes
}

export function lignesOptions(options: LigneOption[], catalogue: OptionCatalogue[]): LigneRecap[] {
  return options
    .filter((o) => o.quantite > 0)
    .map((o) => {
      const libelle = catalogue.find((c) => c.code === o.code)?.libelle ?? o.code
      return {
        libelle: o.quantite > 1 ? `${o.quantite} × ${libelle.toLowerCase()}` : libelle,
        quantite: o.quantite,
        prixUnitaire: o.prixUnitaire,
        montant: o.prixUnitaire * o.quantite,
      }
    })
}

export function totalLignes(lignes: LigneRecap[]): number {
  return lignes.reduce((s, l) => s + l.montant, 0)
}

/** Options proposées pour une famille tarifaire. */
export function optionsProposees(catalogue: OptionCatalogue[], famille: CodeFamille): OptionCatalogue[] {
  return catalogue.filter((o) => o.familles.includes(famille))
}

/** Transforme le choix du client en lignes d'options au prix du catalogue, en refusant les choix impossibles. */
export function choisirOptions(
  choix: Partial<Record<LigneOption["code"], number>>,
  catalogue: OptionCatalogue[],
  famille: CodeFamille,
): { options: LigneOption[]; erreurs: string[] } {
  const erreurs: string[] = []
  const options: LigneOption[] = []
  for (const [code, quantite] of Object.entries(choix) as [LigneOption["code"], number][]) {
    if (!quantite) continue
    const option = catalogue.find((o) => o.code === code)
    if (!option || !option.familles.includes(famille)) {
      erreurs.push(`Option non proposée avec ce tarif : ${option?.libelle ?? code}.`)
      continue
    }
    if (!Number.isInteger(quantite) || quantite < 0 || quantite > option.quantiteMax) {
      erreurs.push(`Quantité invalide pour : ${option.libelle}.`)
      continue
    }
    options.push({ code, quantite, prixUnitaire: option.prix })
  }
  return { options, erreurs }
}
