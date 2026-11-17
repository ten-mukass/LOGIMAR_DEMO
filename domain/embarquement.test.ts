import { describe, expect, it } from "vitest"
import { billetUtilise, controlerBillet, creerEmbarquements, premierEmbarquement, type LectureBillet } from "./embarquement"
import {
  compterEmbarquement,
  manifesteDeBord,
  manifesteDeBordCsv,
  passagersPayes,
  passagersPayesCsv,
} from "./manifeste"
import type { ClotureEmbarquement, Embarquement, Passager, Reservation } from "./types"

const maintenant = new Date("2026-11-20T11:30:00+01:00")
const T = "LBV-POG-2026-11-20-1215"

function passager(id: string, categorie: Passager["categorie"], nom: string, prenom: string): Passager {
  return { id, categorie, nom, prenom, dateNaissance: null, typePiece: categorie === "adulte" ? "cni" : null, numeroPiece: "EX1" }
}

function reservation(partiel: Partial<Reservation>): Reservation {
  return {
    id: "r1",
    commandeId: null,
    reference: "LGM-AB12C",
    traverseeId: T,
    familleCode: "ECO",
    classeId: `${T}:ECO-1`,
    statut: "emise",
    telephone: "+241 06 00 11 22",
    email: null,
    passagers: [passager("r1-p1", "adulte", "NDONG", "Paul"), passager("r1-p2", "enfant", "NDONG", "Léa")],
    prixUnitaires: { adulte: 25000, enfant: 15000, bebe: 5000 },
    options: [],
    total: 40000,
    devise: "XAF",
    bloqueeJusquA: null,
    canal: "web",
    moyenPaiement: "airtel",
    creeLe: "2026-11-10T10:00:00+01:00",
    ...partiel,
  }
}

const billet = reservation({})
const autre = reservation({
  id: "r2",
  reference: "LGM-ZZ99Z",
  passagers: [passager("r2-p1", "adulte", "ABOGO", "Marie")],
})
const annulee = reservation({ id: "r3", reference: "LGM-ANNUL", statut: "annulee", passagers: [passager("r3-p1", "adulte", "X", "Y")] })
const reservations = [billet, autre, annulee]

const scan = (reference: string, traverseeId = T): LectureBillet => ({ mode: "scan", valide: true, reference, traverseeId })
let n = 0
const genererId = () => `e${++n}`

function controler(lecture: LectureBillet, embarquements: Embarquement[] = [], cloture: ClotureEmbarquement | null = null) {
  return controlerBillet({ lecture, traverseeId: T, reservations, embarquements, cloture, maintenant })
}

describe("contrôle d'un billet", () => {
  it("valide un billet payé de la traversée et liste les passagers à faire monter", () => {
    const c = controler(scan("LGM-AB12C"))
    expect(c.resultat).toBe("valide")
    if (c.resultat === "valide") expect(c.aEmbarquer.map((p) => p.prenom)).toEqual(["Paul", "Léa"])
  })

  it("refuse un billet déjà scanné : le code n'est plus valable", () => {
    const embarques = creerEmbarquements(billet, billet.passagers, T, { mode: "scan", agent: "A", maintenant, genererId })
    const c = controler(scan("LGM-AB12C"), embarques)
    expect(c.resultat).toBe("deja-scanne")
    if (c.resultat === "deja-scanne") expect(c.embarquements).toHaveLength(2)
  })

  it("laisse monter le passager retiré du bord par erreur", () => {
    const embarques = creerEmbarquements(billet, [billet.passagers[0]], T, { mode: "scan", agent: "A", maintenant, genererId })
    const c = controler(scan("LGM-AB12C"), embarques)
    expect(c.resultat).toBe("valide")
    if (c.resultat === "valide") {
      expect(c.aEmbarquer.map((p) => p.prenom)).toEqual(["Léa"])
      expect(c.dejaABord).toHaveLength(1)
    }
  })

  it("refuse un billet d'une autre traversée, falsifié, illisible, inconnu ou non payé", () => {
    expect(controler(scan("LGM-AB12C", "POG-LBV-2026-11-22-0725"))).toEqual({
      resultat: "autre-traversee",
      reference: "LGM-AB12C",
      traverseeIdBillet: "POG-LBV-2026-11-22-0725",
    })
    expect(controler({ mode: "scan", valide: false, motif: "signature" })).toEqual({ resultat: "invalide", motif: "signature" })
    expect(controler({ mode: "scan", valide: false, motif: "format" })).toEqual({ resultat: "invalide", motif: "illisible" })
    expect(controler(scan("LGM-INCON"))).toEqual({ resultat: "invalide", motif: "inconnu" })
    expect(controler(scan("LGM-ANNUL")).resultat).toBe("non-valable")
    expect(controler(scan("LGM-AB12C"), [], null).resultat).toBe("valide")
    const futur = reservation({ id: "r4", reference: "LGM-FUTUR", creeLe: "2026-11-21T00:00:00+01:00" })
    expect(
      controlerBillet({ lecture: scan("LGM-FUTUR"), traverseeId: T, reservations: [futur], embarquements: [], cloture: null, maintenant }).resultat,
    ).toBe("non-valable")
  })

  it("accepte un contrôle manuel par référence", () => {
    expect(controler({ mode: "manuel", reference: "LGM-ZZ99Z" }).resultat).toBe("valide")
  })

  it("refuse tout contrôle une fois l'embarquement clos", () => {
    const cloture = { traverseeId: T, agent: "A", le: maintenant.toISOString() }
    expect(controler(scan("LGM-AB12C"), [], cloture)).toEqual({ resultat: "embarquement-clos", cloture })
  })

  it("crée un embarquement par passager et sait quand le billet est utilisé", () => {
    const tot = new Date("2026-11-20T11:00:00+01:00")
    const premiers = creerEmbarquements(billet, [billet.passagers[1]], T, { mode: "manuel", agent: "A", maintenant: tot, genererId })
    const suivants = creerEmbarquements(billet, [billet.passagers[0]], T, { mode: "scan", agent: "A", maintenant, genererId })
    expect(premiers[0]).toMatchObject({ traverseeId: T, reservationId: "r1", passagerId: "r1-p2", reference: "LGM-AB12C", mode: "manuel" })
    expect(billetUtilise(billet, premiers)).toBe(false)
    expect(billetUtilise(billet, [...suivants, ...premiers])).toBe(true)
    expect(premierEmbarquement([...suivants, ...premiers])?.passagerId).toBe("r1-p2")
  })
})

describe("billets vendus et manifeste de bord", () => {
  const tot = new Date("2026-11-20T11:00:00+01:00")
  const embarques = [
    ...creerEmbarquements(autre, autre.passagers, T, { mode: "scan", agent: "A", maintenant, genererId }),
    ...creerEmbarquements(billet, [billet.passagers[1]], T, { mode: "manuel", agent: "A", maintenant: tot, genererId }),
  ]

  it("les billets vendus listent tous les passagers payés, embarqués ou non", () => {
    const lignes = passagersPayes(reservations, T, maintenant, embarques)
    expect(lignes.map((l) => `${l.nom} ${l.prenom} ${l.statut}`)).toEqual([
      "ABOGO Marie embarque",
      "NDONG Léa embarque",
      "NDONG Paul a-embarquer",
    ])
    expect(compterEmbarquement(lignes)).toEqual({ attendus: 3, aBord: 2, restants: 1, absents: 0 })
  })

  it("après la clôture, les passagers non embarqués sont absents", () => {
    const cloture = { traverseeId: T, agent: "A", le: maintenant.toISOString() }
    const lignes = passagersPayes(reservations, T, maintenant, embarques, cloture)
    expect(lignes.find((l) => l.prenom === "Paul")?.statut).toBe("absent")
    expect(compterEmbarquement(lignes)).toEqual({ attendus: 3, aBord: 2, restants: 0, absents: 1 })
  })

  it("le manifeste de bord ne contient que les passagers embarqués, dans l'ordre de passage", () => {
    const bord = manifesteDeBord(reservations, T, embarques)
    expect(bord.map((l) => `${l.numero} ${l.prenom} ${l.mode}`)).toEqual(["1 Léa manuel", "2 Marie scan"])
    expect(manifesteDeBord(reservations, T, [])).toEqual([])
    expect(manifesteDeBord(reservations, "AUTRE", embarques)).toEqual([])
  })

  it("exporte les deux listes en CSV", () => {
    const bord = manifesteDeBordCsv(manifesteDeBord(reservations, T, embarques), () => "11:00").split("\r\n")
    expect(bord[0]).toBe("\uFEFFN°;Heure d’embarquement;Nom;Prénom;Catégorie;Date de naissance;Pièce;Numéro de pièce;Référence;Contrôle")
    expect(bord[1]).toBe("1;11:00;NDONG;Léa;enfant;;;EX1;LGM-AB12C;Contrôle manuel")
    const vendus = passagersPayesCsv(passagersPayes(reservations, T, maintenant, embarques)).split("\r\n")
    expect(vendus[0]).toBe("﻿N°;Nom;Prénom;Catégorie;Date de naissance;Pièce;Numéro de pièce;Référence;Statut")
    expect(vendus[3]).toBe("3;NDONG;Paul;adulte;;CNI;EX1;LGM-AB12C;À embarquer")
  })
})
