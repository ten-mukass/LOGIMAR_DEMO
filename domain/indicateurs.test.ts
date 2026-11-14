import { describe, expect, it } from "vitest"
import {
  alertesTraversee,
  calculerIndicateurs,
  courbeCumulee,
  courbeReference,
  ecartAReference,
  estVendue,
  filtrerTraversees,
  grouperParTraversee,
  moisDeLaPeriode,
  pickUp,
  recetteBillets,
  recetteOptions,
  referenceA,
  repartitionParCanal,
  repartitionParFamille,
  rythmeReservation,
  statutAffiche,
} from "./indicateurs"
import { compterParCategorie, filtrerReservations, FILTRE_VIDE, manifeste, manifesteCsv } from "./manifeste"
import type { Passager, Reservation, Traversee } from "./types"

const maintenant = new Date("2026-11-14T12:00:00+01:00")

function traversee(id: string, departAt: string, capacite = 100): Traversee {
  return {
    id,
    ligneId: id.startsWith("POG") ? "POG-LBV" : "LBV-POG",
    navireId: "N1",
    terminalDepartId: "A",
    terminalArriveeId: "B",
    departAt,
    arriveeAt: departAt,
    enregistrementOuvertureAt: departAt,
    enregistrementFermetureAt: null,
    statut: "ouverte",
    capaciteVendable: capacite,
  }
}

function passager(categorie: Passager["categorie"], nom = "MOUSSAVOU", prenom = "Alice"): Passager {
  return { id: `${nom}-${prenom}`, categorie, nom, prenom, dateNaissance: null, typePiece: "cni", numeroPiece: "EX1" }
}

let n = 0
function reservation(partiel: Partial<Reservation>): Reservation {
  n += 1
  return {
    id: `r${n}`,
    commandeId: null,
    reference: `LGM-${String(n).padStart(5, "0")}`,
    traverseeId: "T1",
    familleCode: "ECO",
    classeId: "T1:ECO-1",
    statut: "emise",
    telephone: "+241 06 00 11 22",
    email: null,
    passagers: [passager("adulte")],
    prixUnitaires: { adulte: 25000, enfant: 15000, bebe: 5000 },
    options: [],
    total: 25000,
    devise: "XAF",
    bloqueeJusquA: null,
    canal: "web",
    moyenPaiement: "airtel",
    creeLe: "2026-11-10T10:00:00+01:00",
    ...partiel,
  }
}

const T1 = traversee("T1", "2026-11-17T12:15:00+01:00")
const T2 = traversee("T2", "2026-12-01T12:15:00+01:00", 50)

describe("ventes et recettes", () => {
  const famille = reservation({
    passagers: [passager("adulte"), passager("enfant"), passager("bebe")],
    options: [{ code: "BAGAGE", quantite: 2, prixUnitaire: 3000 }],
  })

  it("ne compte que les réservations payées ou émises déjà créées", () => {
    expect(estVendue(reservation({ statut: "emise" }), maintenant)).toBe(true)
    expect(estVendue(reservation({ statut: "bloquee" }), maintenant)).toBe(false)
    expect(estVendue(reservation({ statut: "annulee" }), maintenant)).toBe(false)
    expect(estVendue(reservation({ creeLe: "2026-11-15T00:00:00+01:00" }), maintenant)).toBe(false)
  })

  it("affiche un blocage dépassé comme expiré", () => {
    const passe = reservation({ statut: "bloquee", bloqueeJusquA: "2026-11-14T11:00:00+01:00" })
    const actif = reservation({ statut: "bloquee", bloqueeJusquA: "2026-11-14T12:10:00+01:00" })
    expect(statutAffiche(passe, maintenant)).toBe("expiree")
    expect(statutAffiche(actif, maintenant)).toBe("bloquee")
  })

  it("sépare la recette des billets et celle des options", () => {
    expect(recetteBillets(famille)).toBe(45000)
    expect(recetteOptions(famille)).toBe(6000)
  })

  it("calcule remplissage, recette par siège offert et par passager", () => {
    const reservations = [
      famille,
      reservation({ passagers: [passager("adulte"), passager("adulte")], familleCode: "STD", prixUnitaires: { adulte: 35000, enfant: 0, bebe: 0 } }),
      reservation({ traverseeId: "T2" }),
      reservation({ statut: "bloquee", bloqueeJusquA: "2026-11-14T12:10:00+01:00" }),
    ]
    const i = calculerIndicateurs([T1, T2], reservations, maintenant)
    expect(i).toMatchObject({
      traversees: 2,
      capacite: 150,
      reservations: 3,
      places: 5, // 2 (adulte + enfant) + 2 + 1 ; le bébé et le blocage ne comptent pas
      passagers: 6,
      recetteBillets: 45000 + 70000 + 25000,
      recetteOptions: 6000,
    })
    expect(i.remplissage).toBeCloseTo(5 / 150)
    expect(i.recetteParSiege).toBe(Math.round(140000 / 150))
    expect(i.recetteParPassager).toBe(Math.round(140000 / 6))
    expect(calculerIndicateurs([T1], reservations, maintenant).reservations).toBe(2)
  })

  it("renvoie des ratios nuls sans capacité ni passager", () => {
    const i = calculerIndicateurs([], [], maintenant)
    expect(i.remplissage).toBeNull()
    expect(i.recetteParSiege).toBeNull()
    expect(i.recetteParPassager).toBeNull()
  })

  it("répartit par famille et par canal, et retombe sur le total", () => {
    const reservations = [
      famille,
      reservation({ familleCode: "FLEX", canal: "agence", moyenPaiement: "especes", prixUnitaires: { adulte: 55000, enfant: 0, bebe: 0 } }),
      reservation({ statut: "annulee" }),
    ]
    const familles = repartitionParFamille(reservations, maintenant)
    expect(familles.ECO).toEqual({ reservations: 1, places: 2, passagers: 3, recette: 51000 })
    expect(familles.FLEX.recette).toBe(55000)
    expect(familles.STD.reservations).toBe(0)
    const canaux = repartitionParCanal(reservations, maintenant)
    expect(canaux.web.reservations + canaux.agence.reservations + canaux.telephone.reservations).toBe(2)
  })
})

describe("rythme de réservation", () => {
  const reservations = [
    reservation({ creeLe: "2026-11-14T08:00:00+01:00" }),
    reservation({ creeLe: "2026-11-14T00:30:00+01:00", passagers: [passager("adulte"), passager("enfant")] }),
    reservation({ creeLe: "2026-11-13T23:30:00+01:00" }),
    reservation({ creeLe: "2026-11-01T10:00:00+01:00" }),
    reservation({ creeLe: "2026-11-14T09:00:00+01:00", statut: "annulee" }),
  ]

  it("compte les places par jour de réservation, à l'heure du Gabon", () => {
    const points = rythmeReservation(reservations, maintenant, 7)
    expect(points).toHaveLength(7)
    expect(points[0].jour).toBe("2026-11-08")
    expect(points.at(-1)).toEqual({ jour: "2026-11-14", reservations: 2, places: 3 })
    expect(points.at(-2)).toEqual({ jour: "2026-11-13", reservations: 1, places: 1 })
    expect(points.reduce((s, p) => s + p.places, 0)).toBe(4) // la vente du 1er est hors fenêtre
  })

  it("calcule le pick-up des derniers jours", () => {
    expect(pickUp(reservations, maintenant, 1)).toBe(4)
    expect(pickUp(reservations, maintenant, 14)).toBe(5)
  })
})

describe("courbe de réservation et référence", () => {
  const passee = traversee("P1", "2026-11-10T12:15:00+01:00")
  const passee2 = traversee("P2", "2026-11-12T12:15:00+01:00")
  const ventesPassees = [
    reservation({ traverseeId: "P1", creeLe: "2026-11-01T12:15:00+01:00" }), // J-9
    reservation({ traverseeId: "P1", creeLe: "2026-11-09T12:15:00+01:00", passagers: [passager("adulte"), passager("adulte")] }), // J-1
    reservation({ traverseeId: "P2", creeLe: "2026-11-11T12:15:00+01:00" }), // J-1
    reservation({ traverseeId: "P2", creeLe: "2026-10-01T12:15:00+01:00" }), // avant J-30
  ]
  const parTraversee = grouperParTraversee(ventesPassees)

  it("cumule les places de J-30 à J0, sans point dans le futur", () => {
    const courbe = courbeCumulee(passee, parTraversee.get("P1") ?? [], maintenant, 30)
    expect(courbe).toHaveLength(31)
    expect(courbe[0]).toEqual({ joursAvant: 30, places: 0 })
    expect(courbe.find((p) => p.joursAvant === 9)?.places).toBe(1)
    expect(courbe.find((p) => p.joursAvant === 1)?.places).toBe(3)
    expect(courbe.at(-1)).toEqual({ joursAvant: 0, places: 3 })

    const avenir = courbeCumulee(T1, [reservation({})], maintenant, 30)
    expect(avenir.find((p) => p.joursAvant === 4)?.places).toBe(1) // J-4 : déjà passé
    expect(avenir.find((p) => p.joursAvant === 3)?.places).toBeNull() // J-3 : dans un quart d'heure
  })

  it("moyenne les traversées parties, et se tait sans historique suffisant", () => {
    const ref = courbeReference([passee, passee2], parTraversee, maintenant, 30, 2)
    expect(ref?.nombre).toBe(2)
    expect(ref?.points.find((p) => p.joursAvant === 30)?.places).toBe(0.5)
    expect(ref?.points.find((p) => p.joursAvant === 0)?.places).toBe(2.5)
    expect(courbeReference([passee, passee2], parTraversee, maintenant, 30, 3)).toBeNull()
    expect(courbeReference([T1], parTraversee, maintenant, 30, 1)).toBeNull() // T1 n'est pas partie
  })

  it("interpole la référence et mesure l'écart", () => {
    const ref = { nombre: 3, points: [{ joursAvant: 2, places: 10 }, { joursAvant: 1, places: 20 }, { joursAvant: 0, places: 40 }] }
    expect(referenceA(ref, 1.5)).toBe(15)
    expect(referenceA(ref, 0)).toBe(40)
    expect(referenceA(ref, 3)).toBeNull()
    const demain = traversee("D", "2026-11-15T12:00:00+01:00") // dans 1 jour pile
    expect(ecartAReference(demain, 24, ref, maintenant)).toBeCloseTo(0.2)
    expect(ecartAReference(demain, 16, ref, maintenant)).toBeCloseTo(-0.2)
    expect(ecartAReference(T2, 10, ref, maintenant)).toBeNull() // hors de la courbe
    expect(ecartAReference(demain, 10, null, maintenant)).toBeNull()
  })

  it("lève les alertes selon les seuils", () => {
    const seuils = { presquePlein: 0.9, ecartReference: 0.2 }
    expect(alertesTraversee({ placesOccupees: 100, capacite: 100, ecart: null, paliersFermes: 0 }, seuils)).toEqual(["complete"])
    expect(alertesTraversee({ placesOccupees: 90, capacite: 100, ecart: 0.25, paliersFermes: 1 }, seuils)).toEqual([
      "presque-pleine",
      "en-avance",
      "paliers-fermes",
    ])
    expect(alertesTraversee({ placesOccupees: 10, capacite: 100, ecart: -0.2, paliersFermes: 0 }, seuils)).toEqual(["en-retard"])
    expect(alertesTraversee({ placesOccupees: 10, capacite: 100, ecart: 0.1, paliersFermes: 0 }, seuils)).toEqual([])
  })
})

describe("filtres du tableau de bord", () => {
  it("liste les mois de la période", () => {
    expect(moisDeLaPeriode({ du: "2026-11-01", au: "2027-01-31" })).toEqual(["2026-11", "2026-12", "2027-01"])
  })

  it("filtre par mois et par sens", () => {
    const pog = traversee("POG-1", "2026-12-01T07:25:00+01:00")
    expect(filtrerTraversees([T1, T2, pog], { mois: "2026-12", ligneId: null })).toEqual([T2, pog])
    expect(filtrerTraversees([T1, T2, pog], { mois: null, ligneId: "POG-LBV" })).toEqual([pog])
  })
})

describe("réservations et manifeste", () => {
  const a = reservation({
    reference: "LGM-AB12C",
    email: "paul.ndong@example.com",
    passagers: [passager("adulte", "NDONG", "Paul"), passager("enfant", "NDONG", "Élodie")],
    creeLe: "2026-11-12T10:00:00+01:00",
  })
  const b = reservation({ passagers: [passager("adulte", "OBAME", "Jean")], telephone: "+241 07 12 34 56", canal: "agence" })
  const c = reservation({ passagers: [passager("adulte", "ABOGO", "Marie")], statut: "embarquee" })
  const bloquee = reservation({ passagers: [passager("adulte", "AKOUE", "Luc")], statut: "bloquee", bloqueeJusquA: "2026-11-14T11:00:00+01:00" })
  const autre = reservation({ traverseeId: "T2", passagers: [passager("adulte", "ZUE", "Anne")] })
  const toutes = [a, b, c, bloquee, autre]

  it("recherche par référence, nom sans accent, téléphone ou e-mail", () => {
    const chercher = (texte: string) => filtrerReservations(toutes, { ...FILTRE_VIDE, texte }, maintenant).map((r) => r.id)
    expect(chercher("lgm-ab12c")).toEqual([a.id])
    expect(chercher("elodie")).toEqual([a.id])
    expect(chercher("paul ndong")).toEqual([a.id])
    expect(chercher("07 12 34 56")).toEqual([b.id])
    expect(chercher("paul.ndong@")).toEqual([a.id])
    expect(chercher("")).toHaveLength(5)
  })

  it("filtre par traversée, statut affiché et canal, du plus récent au plus ancien", () => {
    expect(filtrerReservations(toutes, { ...FILTRE_VIDE, traverseeId: "T2" }, maintenant)).toEqual([autre])
    expect(filtrerReservations(toutes, { ...FILTRE_VIDE, statut: "expiree" }, maintenant)).toEqual([bloquee])
    expect(filtrerReservations(toutes, { ...FILTRE_VIDE, canal: "agence" }, maintenant)).toEqual([b])
    expect(filtrerReservations([b, a], FILTRE_VIDE, maintenant)[0]).toBe(a)
  })

  it("liste les passagers payés de la traversée, par ordre alphabétique", () => {
    const lignes = manifeste(toutes, "T1", maintenant)
    expect(lignes.map((l) => `${l.numero} ${l.nom} ${l.prenom}`)).toEqual([
      "1 ABOGO Marie",
      "2 NDONG Élodie",
      "3 NDONG Paul",
      "4 OBAME Jean",
    ])
    expect(lignes[0].statut).toBe("embarque")
    expect(compterParCategorie(lignes)).toEqual({ adulte: 3, enfant: 1, bebe: 0 })
  })

  it("exporte le manifeste en CSV pour Excel", () => {
    const csv = manifesteCsv(manifeste([a], "T1", maintenant), ["Traversée ; test"])
    const lignes = csv.split("\r\n")
    expect(csv.startsWith("﻿")).toBe(true)
    expect(lignes[0]).toBe('﻿"Traversée ; test"')
    expect(lignes[1]).toBe("N°;Nom;Prénom;Catégorie;Date de naissance;Pièce;Numéro de pièce;Référence;Statut")
    expect(lignes[2]).toBe("1;NDONG;Élodie;enfant;;CNI;EX1;LGM-AB12C;À embarquer")
  })
})
