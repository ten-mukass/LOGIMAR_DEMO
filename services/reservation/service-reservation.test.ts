import { beforeEach, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import { generateur } from "@/domain/aleatoire"
import type { SaisiePassager } from "@/domain/passagers"
import { estReferenceValide } from "@/domain/reference"
import { documentsDepuisReference } from "../documents/documents"
import { PreviewNotificationService } from "../notification/preview-notification-service"
import { SimulatedProvider } from "../paiement/simulated-provider"
import type { Operateur } from "../paiement/payment-provider"
import { DemoRepository } from "../repository/demo-repository"
import { stockageMemoire } from "../stockage"
import { ServiceReservation, type DemandeBlocage } from "./service-reservation"

const ALLER = "LBV-POG-2026-11-20-1215"
const RETOUR = "POG-LBV-2026-11-22-0725"

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
    segments: [{ traverseeId: ALLER, familleCode: "STD", totalAffiche: 0 }],
    passagers,
    telephone: "+241 07 12 34 56",
    email: "",
    ...partiel,
  }
}

async function placesRestantes(id = ALLER) {
  const [inv] = await repository.listerInventaires([id], instant)
  return inv.placesRestantes
}

async function bloquer(partiel: Partial<DemandeBlocage> = {}) {
  const r = await service.bloquer(demande(partiel))
  if (!r.ok) throw new Error(r.message)
  return r.valeur
}

async function payerEtConfirmer(commandeId: string, numero = "07123456", options = {}) {
  const p = await service.payer(commandeId, { operateur: "airtel", numero, options })
  if (!p.ok) throw new Error(p.message)
  avancer(seed.paiementSimule.delaiMs)
  for (const [operateur, contenu] of callbacks.splice(0)) await service.traiterCallback(operateur, contenu)
  return p.valeur
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
  const genererId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`
  service = new ServiceReservation({
    repository,
    operateurs: { airtel: operateur("airtel"), moov: operateur("moov") },
    notifications: new PreviewNotificationService(repository, horloge, genererId),
    horloge,
    aleatoire: generateur(7),
    genererId,
  })
})

describe("blocage des places", () => {
  it("bloque les places, fige le prix et les retire de la vente", async () => {
    const avant = await placesRestantes()
    const { commande, reservations, prixModifie } = await bloquer()
    const [r] = reservations
    expect(commande).toMatchObject({ statut: "en-cours", reservationIds: [r.id], total: r.total })
    expect(r.statut).toBe("bloquee")
    expect(r.bloqueeJusquA).toBe("2026-11-14T09:15:00.000Z")
    expect(r.total).toBe(2 * r.prixUnitaires.adulte + r.prixUnitaires.enfant)
    expect(r.passagers[0]).toMatchObject({ nom: "MBA", numeroPiece: "EX1234567" })
    expect(await placesRestantes()).toBe(avant - 3)
    expect(prixModifie).toBe(true)
  })

  it("libère les places à l'expiration du délai de 15 minutes", async () => {
    const avant = await placesRestantes()
    const { commande } = await bloquer()
    avancer(15 * 60_000)
    expect((await service.lireCommande(commande.id))?.commande.statut).toBe("expiree")
    expect(await placesRestantes()).toBe(avant)
    const paiement = await service.payer(commande.id, { operateur: "airtel", numero: "07123456", options: {} })
    expect(paiement).toMatchObject({ ok: false, raison: "blocage-expire" })
  })

  it("libère les places quand le client abandonne", async () => {
    const avant = await placesRestantes()
    const { commande } = await bloquer()
    await service.liberer(commande.id)
    expect(await placesRestantes()).toBe(avant)
    expect((await repository.getCommande(commande.id))?.statut).toBe("abandonnee")
  })

  it("refuse une traversée complète, une vente close ou des données invalides", async () => {
    const segment = (traverseeId: string) => [{ traverseeId, familleCode: "STD" as const, totalAffiche: 0 }]
    expect(await service.bloquer(demande({ segments: segment("LBV-POG-2026-11-24-1215") }))).toMatchObject({
      ok: false,
      raison: "complet",
    })
    expect(await service.bloquer(demande({ segments: segment("LBV-POG-2026-11-13-1215") }))).toMatchObject({
      ok: false,
      raison: "vente-close",
    })
    expect(await service.bloquer(demande({ telephone: "", email: "" }))).toMatchObject({
      ok: false,
      raison: "donnees-invalides",
    })
  })
})

describe("aller-retour", () => {
  const segments = [
    { traverseeId: ALLER, familleCode: "ECO" as const, totalAffiche: 0 },
    { traverseeId: RETOUR, familleCode: "FLEX" as const, totalAffiche: 0 },
  ]

  it("bloque les deux trajets dans une seule commande, chacun à son propre prix", async () => {
    const { commande, reservations } = await bloquer({ segments })
    expect(reservations.map((r) => r.traverseeId)).toEqual([ALLER, RETOUR])
    expect(commande.total).toBe(reservations[0].total + reservations[1].total)
    expect(await placesRestantes(RETOUR)).toBeLessThan(150)
  })

  it("refuse un retour dans le même sens ou avant l'arrivée de l'aller", async () => {
    const memeSens = [segments[0], { ...segments[1], traverseeId: "LBV-POG-2026-11-22-1215" }]
    expect(await service.bloquer(demande({ segments: memeSens }))).toMatchObject({ ok: false, raison: "retour-invalide" })
    const avant = [segments[0], { ...segments[1], traverseeId: "POG-LBV-2026-11-20-0725" }]
    expect(await service.bloquer(demande({ segments: avant }))).toMatchObject({ ok: false, raison: "retour-invalide" })
  })

  it("n'enregistre rien si l'un des trajets est indisponible", async () => {
    const avant = await placesRestantes(RETOUR)
    const r = await service.bloquer(
      demande({
        segments: [
          { traverseeId: RETOUR, familleCode: "FLEX", totalAffiche: 0 },
          { traverseeId: "LBV-POG-2026-11-24-1215", familleCode: "FLEX", totalAffiche: 0 },
        ],
      }),
    )
    expect(r).toMatchObject({ ok: false, raison: "complet" })
    expect(await placesRestantes(RETOUR)).toBe(avant)
  })

  it("un paiement émet les deux billets, une facture et un seul e-mail", async () => {
    const { commande } = await bloquer({ segments, email: "paul@example.com" })
    const paiement = await payerEtConfirmer(commande.id, "07123456", { BAGAGE: 1 })
    const detail = await service.lireCommande(commande.id)
    expect(detail?.commande).toMatchObject({ statut: "payee", numeroFacture: "F-2026-000001", total: paiement.montant })
    expect(detail?.reservations.map((r) => r.statut)).toEqual(["emise", "emise"])
    expect(detail?.reservations.every((r) => estReferenceValide(r.reference))).toBe(true)
    expect(detail?.reservations.every((r) => r.options.length === 1)).toBe(true)
    const envois = await repository.listerEnvois({ commandeId: commande.id })
    expect(envois).toHaveLength(1)
    expect(envois[0]).toMatchObject({ destinataire: "paul@example.com", statut: "apercu" })
    expect(envois[0].texte).toContain(detail?.reservations[1].reference)

    const documents = await documentsDepuisReference(repository, detail?.reservations[1].reference ?? "", "cle")
    expect(documents?.billets.map((b) => b.sens)).toEqual(["Aller", "Retour"])
    expect(documents?.facture?.numero).toBe("F-2026-000001")
    expect(documents?.facture?.lignes.reduce((s, l) => s + l.montant, 0)).toBe(paiement.montant)
  })
})

describe("paiement et émission du billet", () => {
  it("n'émet le billet qu'après la confirmation de l'opérateur, une seule fois", async () => {
    const { commande, reservations } = await bloquer()
    const p = await service.payer(commande.id, { operateur: "airtel", numero: "+241 07 12 34 56", options: { BAGAGE: 1 } })
    if (!p.ok) throw new Error(p.message)
    expect((await repository.getReservation(reservations[0].id))?.statut).toBe("bloquee")

    avancer(3_999)
    expect(callbacks).toHaveLength(0)
    avancer(1)
    expect(callbacks).toHaveLength(1)
    const [operateur, contenu] = callbacks[0]
    await service.traiterCallback(operateur, contenu)

    const emise = await repository.getReservation(reservations[0].id)
    expect(emise?.statut).toBe("emise")
    expect(estReferenceValide(emise?.reference ?? "")).toBe(true)
    expect(emise?.total).toBe(p.valeur.montant)
    expect(emise?.options).toEqual([{ code: "BAGAGE", quantite: 1, prixUnitaire: 5000 }])

    // Callback reçu deux fois et consultation de statut : aucun effet.
    await service.traiterCallback(operateur, contenu)
    await service.verifierPaiement(p.valeur.id)
    expect((await repository.getReservation(reservations[0].id))?.reference).toBe(emise?.reference)
    expect((await repository.getCommande(commande.id))?.numeroFacture).toBe("F-2026-000001")
    // Pas d'e-mail sans adresse.
    expect(await repository.listerEnvois({ commandeId: commande.id })).toEqual([])
  })

  it("numérote les factures sans trou", async () => {
    const a = await bloquer()
    await payerEtConfirmer(a.commande.id)
    const b = await bloquer({ segments: [{ traverseeId: RETOUR, familleCode: "ECO", totalAffiche: 0 }] })
    await payerEtConfirmer(b.commande.id)
    expect((await repository.getCommande(b.commande.id))?.numeroFacture).toBe("F-2026-000002")
  })

  it("émet aussi le billet par consultation si le callback n'arrive pas", async () => {
    const { commande, reservations } = await bloquer()
    const p = await service.payer(commande.id, { operateur: "airtel", numero: "07123456", options: {} })
    if (!p.ok) throw new Error(p.message)
    expect((await service.verifierPaiement(p.valeur.id))?.statut).toBe("en-attente")
    instant = new Date(instant.getTime() + 4_000) // le callback est perdu
    expect((await service.verifierPaiement(p.valeur.id))?.statut).toBe("reussi")
    expect((await repository.getReservation(reservations[0].id))?.statut).toBe("emise")
  })

  it("simule un refus pour un numéro se terminant par 0000", async () => {
    const { commande, reservations } = await bloquer()
    const p = await payerEtConfirmer(commande.id, "07 12 00 00")
    expect((await repository.getPaiement(p.id))?.statut).toBe("refuse")
    expect((await repository.getReservation(reservations[0].id))?.statut).toBe("bloquee")
    expect((await repository.getCommande(commande.id))?.statut).toBe("en-cours")
  })

  it("ignore un callback inconnu ou mal formé", async () => {
    await service.traiterCallback("airtel", { transaction: "TX-INCONNUE", statut: "SUCCES" })
    await service.traiterCallback("airtel", "n'importe quoi")
    expect(callbacks).toHaveLength(0)
  })

  it("refuse la garantie avec un tarif Flex", async () => {
    const { commande } = await bloquer({ segments: [{ traverseeId: ALLER, familleCode: "FLEX", totalAffiche: 0 }] })
    const p = await service.payer(commande.id, { operateur: "moov", numero: "07123456", options: { GARANTIE: 1 } })
    expect(p).toMatchObject({ ok: false, raison: "donnees-invalides" })
  })
})
