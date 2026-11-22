import { describe, expect, it } from "vitest"
import {
  calculerOccupations,
  estBlocageActif,
  finDeBlocage,
  occupationAvecPriorite,
  occupeDesPlaces,
  secondesRestantes,
} from "./occupation"
import type { Passager, Reservation } from "./types"

const maintenant = new Date("2026-11-17T08:00:00+01:00")

function passager(categorie: Passager["categorie"]): Passager {
  return { id: categorie, categorie, nom: "X", prenom: "Y", dateNaissance: null, typePiece: null, numeroPiece: null }
}

function reservation(partiel: Partial<Reservation>): Reservation {
  return {
    id: "r",
    commandeId: null,
    reference: "LGM-AAAAA",
    traverseeId: "T1",
    familleCode: "ECO",
    classeId: "T1:ECO-1",
    statut: "emise",
    telephone: "+241 06 00 00 00",
    email: null,
    passagers: [passager("adulte"), passager("enfant"), passager("bebe")],
    prixUnitaires: { adulte: 0, enfant: 0, bebe: 0 },
    options: [],
    total: 0,
    devise: "XAF",
    bloqueeJusquA: null,
    canal: "web",
    moyenPaiement: "airtel",
    creeLe: "2026-11-10T10:00:00+01:00",
    ...partiel,
  }
}

describe("blocage de 15 minutes", () => {
  it("calcule la fin du blocage et le temps restant", () => {
    const fin = finDeBlocage(maintenant, 15)
    expect(fin).toBe("2026-11-17T07:15:00.000Z")
    expect(secondesRestantes(fin, new Date("2026-11-17T08:05:30+01:00"))).toBe(570)
    expect(secondesRestantes(fin, new Date("2026-11-17T09:00:00+01:00"))).toBe(0)
  })

  it("un blocage expiré ne retient plus de places", () => {
    const bloquee = reservation({ statut: "bloquee", bloqueeJusquA: finDeBlocage(maintenant, 15) })
    expect(estBlocageActif(bloquee, new Date("2026-11-17T08:14:59+01:00"))).toBe(true)
    expect(estBlocageActif(bloquee, new Date("2026-11-17T08:15:00+01:00"))).toBe(false)
  })
})

describe("occupation", () => {
  it("compte les places vendues et bloquées, pas les bébés", () => {
    const occ = calculerOccupations(
      [
        reservation({ id: "a" }),
        reservation({ id: "b", statut: "bloquee", bloqueeJusquA: finDeBlocage(maintenant, 15), classeId: "T1:ECO-2" }),
        reservation({ id: "c", statut: "expiree" }),
        reservation({ id: "d", statut: "annulee" }),
      ],
      maintenant,
    ).get("T1")
    expect(occ).toEqual({ total: 4, parClasse: { "T1:ECO-1": 2, "T1:ECO-2": 2 } })
  })

  it("ignore les réservations créées après l'instant donné", () => {
    const future = reservation({ creeLe: "2026-11-17T09:00:00+01:00" })
    expect(occupeDesPlaces(future, maintenant)).toBe(false)
  })
})

describe("réservations du visiteur et ventes d'exemple", () => {
  const quotas = new Map<string, number | null>([["T1:ECO-1", 4]])

  it("les réservations du visiteur passent d'abord, les ventes d'exemple ne débordent jamais", () => {
    const visiteur = [reservation({ id: "v", creeLe: "2026-11-17T07:00:00+01:00" })]
    const exemples = [
      reservation({ id: "e1", creeLe: "2026-11-01T10:00:00+01:00" }),
      reservation({ id: "e2", creeLe: "2026-11-02T10:00:00+01:00" }),
    ]
    const { occupation, secondairesRetenues } = occupationAvecPriorite(visiteur, exemples, 10, quotas, maintenant)
    expect(occupation).toEqual({ total: 4, parClasse: { "T1:ECO-1": 4 } })
    expect(secondairesRetenues.map((r) => r.id)).toEqual(["e1"])
  })

  it("respecte la capacité de la traversée", () => {
    const exemples = [reservation({ id: "e1" }), reservation({ id: "e2", classeId: "T1:VIP-1" })]
    const { occupation } = occupationAvecPriorite([], exemples, 3, quotas, maintenant)
    expect(occupation.total).toBe(2)
  })
})
