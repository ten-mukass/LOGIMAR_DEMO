import { describe, expect, it } from "vitest"
import {
  alertePlaces,
  appliquerGrille,
  conditionsFamille,
  meilleureOffre,
  montantPassagers,
  OCCUPATION_VIDE,
  offreLaMoinsChere,
  offresTraversee,
  placesNecessaires,
  verifierGrille,
  type Occupation,
  type PalierGrille,
} from "./tarifs"
import type { ClasseReservation, FamilleTarifaire, Traversee } from "./types"

const traversee: Traversee = {
  id: "T1",
  ligneId: "LBV-POG",
  navireId: "N1",
  terminalDepartId: "A",
  terminalArriveeId: "B",
  departAt: "2026-11-17T12:15:00+01:00",
  arriveeAt: "2026-11-17T15:45:00+01:00",
  enregistrementOuvertureAt: "2026-11-17T09:30:00+01:00",
  enregistrementFermetureAt: null,
  statut: "ouverte",
  capaciteVendable: 10,
}

const grille: PalierGrille[] = [
  { familleCode: "ECO", rang: 1, prix: { adulte: 100, enfant: 60, bebe: 10 }, quota: 2 },
  { familleCode: "ECO", rang: 2, prix: { adulte: 120, enfant: 70, bebe: 10 }, quota: 3 },
  { familleCode: "ECO", rang: 3, prix: { adulte: 150, enfant: 90, bebe: 10 }, quota: 4 },
  { familleCode: "VIP", rang: 1, prix: { adulte: 200, enfant: 120, bebe: 10 }, quota: null },
]

const classes = appliquerGrille(traversee, grille)
const un = { adultes: 1, enfants: 0, bebes: 0 }
const famille = { adultes: 2, enfants: 1, bebes: 1 }

function occupation(parClasse: Record<string, number>): Occupation {
  return { total: Object.values(parClasse).reduce((s, n) => s + n, 0), parClasse }
}

function classe(id: string): ClasseReservation {
  const c = classes.find((x) => x.id === id)
  if (!c) throw new Error(id)
  return c
}

describe("places et montants", () => {
  it("les bébés n'occupent pas de place", () => {
    expect(placesNecessaires(famille)).toBe(3)
  })

  it("le montant additionne chaque catégorie", () => {
    expect(montantPassagers({ adulte: 100, enfant: 60, bebe: 10 }, famille)).toBe(270)
  })
})

describe("meilleureOffre", () => {
  it("vend au palier ouvert le moins cher", () => {
    const offre = meilleureOffre(classes, "ECO", un, 10, OCCUPATION_VIDE)
    expect(offre.disponible && offre.classe.id).toBe("T1:ECO-1")
    expect(offre.disponible && offre.total).toBe(100)
    expect(offre.disponible && offre.placesAuPrix).toBe(2)
  })

  it("passe au palier suivant quand le quota est vendu", () => {
    const offre = meilleureOffre(classes, "ECO", un, 10, occupation({ "T1:ECO-1": 2 }))
    expect(offre.disponible && offre.classe.id).toBe("T1:ECO-2")
    expect(offre.disponible && offre.total).toBe(120)
  })

  it("met tout le groupe au palier suivant si le palier ouvert n'a pas assez de places", () => {
    const offre = meilleureOffre(classes, "ECO", famille, 10, OCCUPATION_VIDE)
    expect(offre.disponible && offre.classe.id).toBe("T1:ECO-2")
    expect(offre.disponible && offre.total).toBe(2 * 120 + 70 + 10)
  })

  it("ignore un palier fermé à la main", () => {
    const fermees = classes.map((c) => (c.id === "T1:ECO-1" ? { ...c, ouverte: false } : c))
    const offre = meilleureOffre(fermees, "ECO", un, 10, OCCUPATION_VIDE)
    expect(offre.disponible && offre.classe.id).toBe("T1:ECO-2")
  })

  it("signale une famille épuisée", () => {
    const offre = meilleureOffre(classes, "ECO", un, 10, occupation({ "T1:ECO-1": 2, "T1:ECO-2": 3, "T1:ECO-3": 4 }))
    expect(offre).toEqual({ disponible: false, familleCode: "ECO", raison: "famille-epuisee" })
  })

  it("le palier sans quota reste vendable jusqu'à la capacité", () => {
    const occ = occupation({ "T1:ECO-1": 2, "T1:ECO-2": 3, "T1:ECO-3": 4 })
    const offre = meilleureOffre(classes, "VIP", un, 10, occ)
    expect(offre.disponible && offre.placesAuPrix).toBe(1)
  })

  it("ne vend jamais au-delà de la capacité, même si le palier a du quota", () => {
    const occ = occupation({ "T1:VIP-1": 9 })
    const offre = meilleureOffre(classes, "ECO", { adultes: 2, enfants: 0, bebes: 0 }, 10, occ)
    expect(offre).toEqual({ disponible: false, familleCode: "ECO", raison: "places-insuffisantes" })
  })

  it("annonce une traversée complète", () => {
    const offre = meilleureOffre(classes, "VIP", un, 10, occupation({ "T1:VIP-1": 10 }))
    expect(offre).toEqual({ disponible: false, familleCode: "VIP", raison: "complet" })
  })

  it("un palier plus cher ne se ferme pas parce qu'un moins cher est épuisé", () => {
    const occ = occupation({ "T1:ECO-1": 2 })
    expect(meilleureOffre(classes, "VIP", un, 10, occ).disponible).toBe(true)
  })
})

describe("offres d'une traversée", () => {
  it("donne une offre par famille dans l'ordre Éco, VIP", () => {
    const offres = offresTraversee(classes, un, 10, OCCUPATION_VIDE)
    expect(offres.map((o) => o.familleCode)).toEqual(["ECO", "VIP"])
  })

  it("le prix « dès » est l'offre disponible la moins chère", () => {
    const occ = occupation({ "T1:ECO-1": 2, "T1:ECO-2": 3, "T1:ECO-3": 4 })
    const offres = offresTraversee(classes, un, 10, occ)
    expect(offreLaMoinsChere(offres)?.familleCode).toBe("VIP")
  })

  it("pas de prix « dès » si tout est complet", () => {
    const offres = offresTraversee(classes, un, 10, occupation({ "T1:VIP-1": 10 }))
    expect(offreLaMoinsChere(offres)).toBeNull()
  })

  it("alerte « plus que N places » sous le seuil seulement", () => {
    const offre = meilleureOffre(classes, "ECO", un, 10, OCCUPATION_VIDE)
    expect(alertePlaces(offre, 3)).toBe(2)
    expect(alertePlaces(offre, 1)).toBeNull()
  })
})

describe("grille et conditions", () => {
  it("accepte une grille cohérente", () => {
    expect(verifierGrille(grille)).toEqual([])
  })

  it("refuse des prix non croissants et un palier sans quota au milieu", () => {
    const mauvaise: PalierGrille[] = [
      ...grille.filter((p) => p.familleCode !== "ECO"),
      { familleCode: "ECO", rang: 1, prix: { adulte: 100, enfant: 60, bebe: 10 }, quota: null },
      { familleCode: "ECO", rang: 2, prix: { adulte: 90, enfant: 60, bebe: 10 }, quota: 3 },
    ]
    expect(verifierGrille(mauvaise)).toEqual([
      "ECO-1 : seul le dernier palier peut être sans quota",
      "ECO-2 : prix adulte non croissant",
    ])
  })

  it("rédige les conditions à partir des règles de la famille", () => {
    const base: FamilleTarifaire = {
      id: "x",
      code: "ECO",
      nom: "Éco",
      modifiable: false,
      remboursable: false,
      fraisModif: null,
      delaiModifH: null,
      avantages: [],
    }
    expect(conditionsFamille(base)).toBe("Ni modifiable ni remboursable")
    expect(conditionsFamille({ ...base, modifiable: true, fraisModif: 5000, delaiModifH: 24 })).toBe(
      "Modifiable jusqu’à 24 h avant le départ, avec frais",
    )
    expect(
      conditionsFamille({
        ...base,
        modifiable: true,
        remboursable: true,
        fraisModif: 0,
        avantages: ["Embarquement prioritaire"],
      }),
    ).toBe("Modification gratuite, remboursable, embarquement prioritaire")
  })

  it("applique la grille avec des identifiants stables", () => {
    expect(classe("T1:VIP-1").quota).toBeNull()
    expect(classes.every((c) => c.ouverte && c.traverseeId === "T1")).toBe(true)
  })
})
