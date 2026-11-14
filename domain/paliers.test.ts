import { describe, expect, it } from "vitest"
import {
  appliquerChangements,
  etatPaliers,
  fermeturePermise,
  nombrePaliersFermes,
  palierOuvertA,
  paliersEnVente,
  verifierChangementPalier,
} from "./paliers"
import { appliquerGrille, meilleureOffre, type Occupation, type PalierGrille } from "./tarifs"
import type { ChangementPalier, Traversee } from "./types"

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
  { familleCode: "STD", rang: 1, prix: { adulte: 150, enfant: 90, bebe: 10 }, quota: 5 },
  { familleCode: "FLEX", rang: 1, prix: { adulte: 200, enfant: 120, bebe: 10 }, quota: null },
]

const classes = appliquerGrille(traversee, grille)
const un = { adultes: 1, enfants: 0, bebes: 0 }

function changement(classeId: string, ouverte: boolean, le: string): ChangementPalier {
  return { id: `${classeId}-${le}`, traverseeId: "T1", classeId, ouverte, motif: "Test", auteur: "Démo", le }
}

function occupation(parClasse: Record<string, number>): Occupation {
  return { total: Object.values(parClasse).reduce((s, n) => s + n, 0), parClasse }
}

describe("changements manuels de paliers", () => {
  it("applique le dernier changement de chaque palier, quel que soit l'ordre de la liste", () => {
    const changements = [
      changement("T1:ECO-1", true, "2026-11-14T10:05:00Z"),
      changement("T1:ECO-1", false, "2026-11-14T10:00:00Z"),
      changement("T1:STD-1", false, "2026-11-14T10:01:00Z"),
    ]
    const resultat = appliquerChangements(classes, changements)
    expect(resultat.find((c) => c.id === "T1:ECO-1")?.ouverte).toBe(true)
    expect(resultat.find((c) => c.id === "T1:STD-1")?.ouverte).toBe(false)
    expect(nombrePaliersFermes(resultat)).toBe(1)
    expect(classes.every((c) => c.ouverte)).toBe(true) // pas de mutation
  })

  it("fermer le palier en vente fait passer le prix au palier suivant", () => {
    const avant = meilleureOffre(classes, "ECO", un, 10, occupation({}))
    const fermees = appliquerChangements(classes, [changement("T1:ECO-1", false, "2026-11-14T10:00:00Z")])
    const apres = meilleureOffre(fermees, "ECO", un, 10, occupation({}))
    expect(avant.disponible && avant.total).toBe(100)
    expect(apres.disponible && apres.total).toBe(120)
  })

  it("connaît l'état d'un palier à un instant donné", () => {
    const changements = [
      changement("T1:ECO-1", false, "2026-11-14T10:00:00Z"),
      changement("T1:ECO-1", true, "2026-11-14T12:00:00Z"),
    ]
    expect(palierOuvertA(changements, "T1:ECO-1", "2026-11-14T09:00:00Z")).toBe(true)
    expect(palierOuvertA(changements, "T1:ECO-1", "2026-11-14T11:00:00Z")).toBe(false)
    expect(palierOuvertA(changements, "T1:ECO-1", "2026-11-14T13:00:00Z")).toBe(true)
    expect(palierOuvertA(changements, "T1:STD-1", "2026-11-14T11:00:00Z")).toBe(true)
  })
})

describe("vérification d'un changement", () => {
  it("exige un motif et un vrai changement", () => {
    expect(verifierChangementPalier(classes, "T1:ECO-1", false, "  ")).toBe("Indiquez le motif du changement.")
    expect(verifierChangementPalier(classes, "T1:ECO-1", true, "Rouvrir")).toBe("Ce palier est déjà ouvert.")
    expect(verifierChangementPalier(classes, "T1:XXX-9", false, "Motif")).toBe("Palier introuvable.")
    expect(verifierChangementPalier(classes, "T1:ECO-1", false, "Forte demande")).toBeNull()
  })

  it("refuse de fermer le dernier palier Flex", () => {
    expect(fermeturePermise(classes, "T1:FLEX-1")).toBe(false)
    expect(fermeturePermise(classes, "T1:ECO-1")).toBe(true)
    expect(verifierChangementPalier(classes, "T1:FLEX-1", false, "Motif")).toMatch(/Flex reste vendable/)
  })
})

describe("état des paliers", () => {
  it("distingue en vente, en attente, épuisé et fermé", () => {
    const fermees = appliquerChangements(classes, [changement("T1:STD-1", false, "2026-11-14T10:00:00Z")])
    const lignes = etatPaliers(fermees, 10, occupation({ "T1:ECO-1": 2 }))
    const etat = (id: string) => lignes.find((l) => l.classe.id === id)
    expect(etat("T1:ECO-1")).toMatchObject({ etat: "epuise", occupees: 2, restantes: 0 })
    expect(etat("T1:ECO-2")).toMatchObject({ etat: "en-vente", restantes: 3 })
    expect(etat("T1:STD-1")?.etat).toBe("ferme")
    expect(etat("T1:FLEX-1")).toMatchObject({ etat: "en-vente", restantes: 8 })
  })

  it("un palier ouvert mais moins prioritaire est en attente", () => {
    const grilleLongue = appliquerGrille(traversee, [
      ...grille,
      { familleCode: "STD", rang: 2, prix: { adulte: 170, enfant: 100, bebe: 10 }, quota: 5 },
    ])
    const lignes = etatPaliers(grilleLongue, 10, occupation({}))
    expect(lignes.find((l) => l.classe.id === "T1:STD-2")?.etat).toBe("en-attente")
  })

  it("tout est épuisé quand le navire est complet", () => {
    const lignes = etatPaliers(classes, 10, occupation({ "T1:STD-1": 5, "T1:ECO-1": 2, "T1:ECO-2": 3 }))
    expect(lignes.every((l) => l.etat === "epuise")).toBe(true)
    expect(paliersEnVente(classes, 10, occupation({ "T1:STD-1": 5, "T1:ECO-1": 2, "T1:ECO-2": 3 }))).toEqual({
      ECO: null,
      STD: null,
      FLEX: null,
    })
  })

  it("donne le palier en vente par famille", () => {
    const enVente = paliersEnVente(classes, 10, occupation({ "T1:ECO-1": 2 }))
    expect(enVente.ECO?.id).toBe("T1:ECO-2")
    expect(enVente.STD?.id).toBe("T1:STD-1")
    expect(enVente.FLEX?.id).toBe("T1:FLEX-1")
  })
})
