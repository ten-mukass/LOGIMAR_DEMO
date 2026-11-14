import { beforeEach, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import { generateur } from "@/domain/aleatoire"
import type { SaisiePassager } from "@/domain/passagers"
import { estReferenceValide } from "@/domain/reference"
import { SimulatedProvider } from "../paiement/simulated-provider"
import type { Operateur } from "../paiement/payment-provider"
import { DemoRepository } from "../repository/demo-repository"
import { stockageMemoire } from "../stockage"
import { ServiceReservation, type DemandeBlocage } from "./service-reservation"

const TRAVERSEE = "LBV-POG-2026-11-20-1215"

const passagers: SaisiePassager[] = [
  { categorie: "adulte", nom: "Mba", prenom: "Paul", dateNaissance: "", typePiece: "cni", numeroPiece: "ex1234567" },
  { categorie: "adulte", nom: "Nze", prenom: "Marie", dateNaissance: "", typePiece: "passeport", numeroPiece: "P998877" },
  { categorie: "enfant", nom: "Mba", prenom: "Léa", dateNaissance: "2019-03-02", typePiece: "", numeroPiece: "" },
]

let instant: Date
let taches: { action: () => void; echeance: number }[]
let callbacks: [Operateur, unknown][]
let repository: DemoRepository
let service: ServiceReservation

function avancer(ms: number) {
  instant = new Date(instant.getTime() + ms)
  const dues = taches.filter((t) => t.echeance <= instant.getTime())
  taches = taches.filter((t) => t.echeance > instant.getTime())
  dues.forEach((t) => t.action())
}

function demande(partiel: Partial<DemandeBlocage> = {}): DemandeBlocage {
  return {
    traverseeId: TRAVERSEE,
    familleCode: "STD",
    passagers,
    telephone: "+241 07 12 34 56",
    email: "",
    totalAffiche: 0,
    ...partiel,
  }
}

async function placesRestantes(id = TRAVERSEE) {
  const [inv] = await repository.listerInventaires([id], instant)
  return inv.placesRestantes
}

beforeEach(() => {
  instant = new Date("2026-11-14T10:00:00+01:00")
  taches = []
  callbacks = []
  const stockage = stockageMemoire()
  const horloge = () => instant
  repository = new DemoRepository(seed, stockage)
  const operateur = (code: Operateur) =>
    new SimulatedProvider(code, {
      ...seed.paiementSimule,
      stockage,
      horloge,
      envoyerCallback: (op, contenu) => callbacks.push([op, contenu]),
      planifier: (action, delai) => taches.push({ action, echeance: instant.getTime() + delai }),
    })
  let n = 0
  service = new ServiceReservation({
    repository,
    operateurs: { airtel: operateur("airtel"), moov: operateur("moov") },
    horloge,
    aleatoire: generateur(7),
    genererId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  })
})

describe("blocage des places", () => {
  it("bloque les places, fige le prix et les retire de la vente", async () => {
    const avant = await placesRestantes()
    const r = await service.bloquer(demande())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { reservation } = r.valeur
    expect(reservation.statut).toBe("bloquee")
    expect(reservation.bloqueeJusquA).toBe("2026-11-14T09:15:00.000Z")
    expect(reservation.total).toBe(2 * reservation.prixUnitaires.adulte + reservation.prixUnitaires.enfant)
    expect(reservation.passagers[0]).toMatchObject({ nom: "MBA", numeroPiece: "EX1234567" })
    expect(await placesRestantes()).toBe(avant - 3)
    expect(r.valeur.prixModifie).toBe(true)
  })

  it("libère les places à l'expiration du délai de 15 minutes", async () => {
    const avant = await placesRestantes()
    const r = await service.bloquer(demande())
    if (!r.ok) throw new Error(r.message)
    avancer(15 * 60_000)
    expect((await service.lireReservation(r.valeur.reservation.id))?.statut).toBe("expiree")
    expect(await placesRestantes()).toBe(avant)
    const paiement = await service.payer(r.valeur.reservation.id, { operateur: "airtel", numero: "07123456", options: {} })
    expect(paiement).toMatchObject({ ok: false, raison: "blocage-expire" })
  })

  it("libère les places quand le client abandonne", async () => {
    const avant = await placesRestantes()
    const r = await service.bloquer(demande())
    if (!r.ok) throw new Error(r.message)
    await service.liberer(r.valeur.reservation.id)
    expect(await placesRestantes()).toBe(avant)
  })

  it("refuse une traversée complète, une vente close ou des données invalides", async () => {
    expect(await service.bloquer(demande({ traverseeId: "LBV-POG-2026-11-24-1215" }))).toMatchObject({
      ok: false,
      raison: "complet",
    })
    expect(await service.bloquer(demande({ traverseeId: "LBV-POG-2026-11-13-1215" }))).toMatchObject({
      ok: false,
      raison: "vente-close",
    })
    expect(await service.bloquer(demande({ telephone: "", email: "" }))).toMatchObject({
      ok: false,
      raison: "donnees-invalides",
    })
  })
})

describe("paiement et émission du billet", () => {
  async function bloquerEtPayer(numero: string, options = {}) {
    const r = await service.bloquer(demande())
    if (!r.ok) throw new Error(r.message)
    const p = await service.payer(r.valeur.reservation.id, { operateur: "airtel", numero, options })
    if (!p.ok) throw new Error(p.message)
    return { reservationId: r.valeur.reservation.id, paiement: p.valeur }
  }

  it("n'émet le billet qu'après la confirmation de l'opérateur, une seule fois", async () => {
    const { reservationId, paiement } = await bloquerEtPayer("+241 07 12 34 56", { BAGAGE: 1 })
    expect((await repository.getReservation(reservationId))?.statut).toBe("bloquee")

    avancer(3_999)
    expect(callbacks).toHaveLength(0)
    avancer(1)
    expect(callbacks).toHaveLength(1)
    const [operateur, contenu] = callbacks[0]
    await service.traiterCallback(operateur, contenu)

    const emise = await repository.getReservation(reservationId)
    expect(emise?.statut).toBe("emise")
    expect(estReferenceValide(emise?.reference ?? "")).toBe(true)
    expect(emise?.total).toBe(paiement.montant)
    expect(emise?.options).toEqual([{ code: "BAGAGE", quantite: 1, prixUnitaire: 5000 }])

    // Callback reçu deux fois et consultation de statut : aucun effet.
    await service.traiterCallback(operateur, contenu)
    await service.verifierPaiement(paiement.id)
    expect((await repository.getReservation(reservationId))?.reference).toBe(emise?.reference)
    expect((await repository.getPaiement(paiement.id))?.statut).toBe("reussi")
  })

  it("émet aussi le billet par consultation si le callback n'arrive pas", async () => {
    const { reservationId, paiement } = await bloquerEtPayer("07123456")
    expect((await service.verifierPaiement(paiement.id))?.statut).toBe("en-attente")
    instant = new Date(instant.getTime() + 4_000) // le callback est perdu
    expect((await service.verifierPaiement(paiement.id))?.statut).toBe("reussi")
    expect((await repository.getReservation(reservationId))?.statut).toBe("emise")
  })

  it("simule un refus pour un numéro se terminant par 0000", async () => {
    const { reservationId, paiement } = await bloquerEtPayer("07 12 00 00")
    avancer(4_000)
    const [operateur, contenu] = callbacks[0]
    await service.traiterCallback(operateur, contenu)
    expect((await repository.getPaiement(paiement.id))?.statut).toBe("refuse")
    expect((await repository.getReservation(reservationId))?.statut).toBe("bloquee")
  })

  it("ignore un callback inconnu ou mal formé", async () => {
    await service.traiterCallback("airtel", { transaction: "TX-INCONNUE", statut: "SUCCES" })
    await service.traiterCallback("airtel", "n'importe quoi")
    expect(callbacks).toHaveLength(0)
  })

  it("refuse la garantie avec un tarif Flex", async () => {
    const r = await service.bloquer(demande({ familleCode: "FLEX" }))
    if (!r.ok) throw new Error(r.message)
    const p = await service.payer(r.valeur.reservation.id, {
      operateur: "moov",
      numero: "07123456",
      options: { GARANTIE: 1 },
    })
    expect(p).toMatchObject({ ok: false, raison: "donnees-invalides" })
  })
})
