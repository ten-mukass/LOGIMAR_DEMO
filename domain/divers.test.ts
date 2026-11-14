import { describe, expect, it } from "vitest"
import { generateur } from "./aleatoire"
import { joursParJourSemaine, moisSuivant, semainesDuMois } from "./calendrier"
import { formatFCFA } from "./format"
import { categorieSelonAge, resumeComposition, trancheAge, validerComposition } from "./passagers"
import { lireCriteres, versParametres, type CriteresRecherche } from "./recherche"
import { estReferenceValide, genererReference, normaliserReference } from "./reference"

const bornes = { enfantDes: 3, adulteDes: 12 }

describe("passagers", () => {
  it("exige un adulte et au plus un bébé par adulte", () => {
    expect(validerComposition({ adultes: 0, enfants: 2, bebes: 0 }, 9)).toEqual(["Au moins un adulte par réservation."])
    expect(validerComposition({ adultes: 1, enfants: 0, bebes: 2 }, 9)).toEqual(["Un bébé au plus par adulte."])
    expect(validerComposition({ adultes: 6, enfants: 4, bebes: 0 }, 9)).toEqual(["9 passagers au plus par réservation."])
    expect(validerComposition({ adultes: 2, enfants: 1, bebes: 1 }, 9)).toEqual([])
  })

  it("déduit la catégorie de l'âge le jour du voyage", () => {
    expect(categorieSelonAge("2014-11-18", "2026-11-17", bornes)).toBe("enfant")
    expect(categorieSelonAge("2014-11-17", "2026-11-17", bornes)).toBe("adulte")
    expect(categorieSelonAge("2024-01-01", "2026-11-17", bornes)).toBe("bebe")
    expect(categorieSelonAge("2023-11-17", "2026-11-17", bornes)).toBe("enfant")
  })

  it("rédige les libellés", () => {
    expect(resumeComposition({ adultes: 2, enfants: 1, bebes: 0 })).toBe("2 adultes, 1 enfant")
    expect(trancheAge("enfant", bornes)).toBe("3 à 11 ans")
    expect(trancheAge("bebe", bornes)).toBe("0 à 2 ans")
  })
})

describe("référence de billet", () => {
  it("a le format LGM-XXXXX sans O, 0, I ni 1", () => {
    const alea = generateur(42)
    for (let i = 0; i < 500; i++) {
      const ref = genererReference(alea)
      expect(estReferenceValide(ref)).toBe(true)
      expect(ref.slice(4)).not.toMatch(/[O0I1]/)
    }
  })

  it("normalise la saisie", () => {
    expect(normaliserReference(" lgm 7k4q2 ")).toBe("LGM-7K4Q2")
    expect(normaliserReference("7K4Q2")).toBe("LGM-7K4Q2")
  })
})

describe("critères de recherche dans l'URL", () => {
  const criteres: CriteresRecherche = {
    depart: "LBV",
    arrivee: "POG",
    date: "2026-11-17",
    dateRetour: null,
    passagers: { adultes: 2, enfants: 1, bebes: 0 },
  }

  it("fait l'aller-retour URL ↔ critères sans perdre les passagers", () => {
    const params = new URLSearchParams(versParametres(criteres))
    expect(lireCriteres(params, ["LBV", "POG"], 9)).toEqual({ criteres, erreurs: [] })
  })

  it("refuse des critères incohérents", () => {
    const params = new URLSearchParams("de=LBV&a=LBV&date=2026-11-17&retour=2026-11-10&ad=0")
    const { criteres: lus, erreurs } = lireCriteres(params, ["LBV", "POG"], 9)
    expect(lus).toBeNull()
    expect(erreurs).toEqual([
      "Le départ et l’arrivée doivent être différents.",
      "Le retour doit suivre l’aller.",
      "Au moins un adulte par réservation.",
    ])
  })
})

describe("calendrier", () => {
  it("découpe novembre 2026 en semaines commençant le lundi", () => {
    const semaines = semainesDuMois({ annee: 2026, mois: 11 })
    expect(semaines[0]).toEqual([null, null, null, null, null, null, "2026-11-01"])
    expect(semaines.at(-1)).toEqual(["2026-11-30", null, null, null, null, null, null])
  })

  it("passe d'un mois à l'autre", () => {
    expect(moisSuivant({ annee: 2026, mois: 12 })).toEqual({ annee: 2027, mois: 1 })
    expect(moisSuivant({ annee: 2027, mois: 1 }, -1)).toEqual({ annee: 2026, mois: 12 })
  })

  it("regroupe les jours de traversée par jour de semaine", () => {
    const groupes = joursParJourSemaine(
      ["2026-10-30", "2026-11-01", "2026-11-03", "2026-11-06", "2026-11-08"],
      { annee: 2026, mois: 11 },
      [2, 5, 0],
    )
    expect(groupes).toEqual([
      { jourSemaine: 2, jours: ["2026-11-03"] },
      { jourSemaine: 5, jours: ["2026-11-06"] },
      { jourSemaine: 0, jours: ["2026-11-01", "2026-11-08"] },
    ])
  })
})

describe("montants", () => {
  it("formate en FCFA entiers", () => {
    expect(formatFCFA(35000)).toBe("35 000 FCFA")
    expect(formatFCFA(35000, true)).toBe("35 000 F")
    expect(() => formatFCFA(10.5)).toThrow()
  })
})
