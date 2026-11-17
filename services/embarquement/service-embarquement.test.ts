import { beforeEach, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import type { Reservation } from "@/domain/types"
import { contenuQrBillet } from "../documents/signature-billet"
import { DemoRepository } from "../repository/demo-repository"
import { stockageMemoire, type Stockage } from "../stockage"
import { ServiceEmbarquement } from "./service-embarquement"

const TRAVERSEE = "LBV-POG-2026-11-20-1215"
const AUTRE = "POG-LBV-2026-11-22-0725"
const CLE = seed.cleSignatureBilletDemo

let instant: Date
let stockage: Stockage
let repository: DemoRepository
let service: ServiceEmbarquement
let billet: Reservation

beforeEach(async () => {
  instant = new Date("2026-11-20T11:30:00+01:00")
  stockage = stockageMemoire()
  repository = new DemoRepository(seed, stockage)
  let n = 0
  service = new ServiceEmbarquement({
    repository,
    horloge: () => instant,
    genererId: () => `id-${++n}`,
    cleSignature: CLE,
    agent: "Agent démo",
  })
  const reservations = await repository.listerReservations(instant, { traverseeIds: [TRAVERSEE] })
  billet = reservations.find((r) => r.passagers.length >= 2 && r.statut === "emise")!
})

const qr = (r: Reservation, traversee = r.traverseeId) => contenuQrBillet(r.reference, traversee, CLE)

describe("scan à l'embarquement", () => {
  it("un scan valide fait monter tous les passagers du billet et remplit le manifeste de bord", async () => {
    const avant = await service.etat(TRAVERSEE)
    expect(avant?.bord).toEqual([])
    expect(avant?.compteur.aBord).toBe(0)

    const r = await service.scanner(await qr(billet), TRAVERSEE)
    expect(r.controle.resultat).toBe("valide")
    expect(r.embarques).toHaveLength(billet.passagers.length)

    const apres = await service.etat(TRAVERSEE)
    expect(apres?.compteur.aBord).toBe(billet.passagers.length)
    expect(apres?.compteur.attendus).toBe(avant?.compteur.attendus)
    expect(apres?.bord.map((l) => l.passagerId).sort()).toEqual(billet.passagers.map((p) => p.id).sort())
    expect(apres?.passagers.filter((l) => l.reservationId === billet.id).every((l) => l.statut === "embarque")).toBe(true)
  })

  it("le billet n'est plus valable après le scan", async () => {
    await service.scanner(await qr(billet), TRAVERSEE)
    instant = new Date(instant.getTime() + 60_000)
    const second = await service.scanner(await qr(billet), TRAVERSEE)
    expect(second.controle.resultat).toBe("deja-scanne")
    expect(second.embarques).toEqual([])
    const etat = await service.etat(TRAVERSEE)
    expect(etat?.compteur.aBord).toBe(billet.passagers.length)
    expect(etat?.scans.map((s) => s.resultat)).toEqual(["deja-scanne", "valide"])
  })

  it("refuse un QR falsifié, illisible ou d'une autre traversée", async () => {
    const vrai = await qr(billet)
    const falsifie = vrai.slice(0, -1) + (vrai.endsWith("A") ? "B" : "A")
    expect((await service.scanner(falsifie, TRAVERSEE)).controle).toEqual({ resultat: "invalide", motif: "signature" })
    expect((await service.etat(TRAVERSEE))?.scans[0]).toMatchObject({ resultat: "invalide", reference: billet.reference })
    expect((await service.scanner("https://exemple.test", TRAVERSEE)).controle).toEqual({ resultat: "invalide", motif: "illisible" })
    // Référence modifiée à la main : la signature ne correspond plus.
    const autreRef = vrai.replace(billet.reference, "LGM-XXXXX")
    expect((await service.scanner(autreRef, TRAVERSEE)).controle.resultat).toBe("invalide")

    const [ailleurs] = await repository.listerReservations(instant, { traverseeIds: [AUTRE] })
    const r = await service.scanner(await qr(ailleurs), TRAVERSEE)
    expect(r.controle.resultat).toBe("autre-traversee")
    expect(r.traverseeBillet?.id).toBe(AUTRE)
    expect((await service.etat(TRAVERSEE))?.compteur.aBord).toBe(0)
  })

  it("contrôle manuel : recherche par nom puis passage à bord", async () => {
    const titulaire = billet.passagers[0]
    const trouves = await service.rechercher(`${titulaire.prenom} ${titulaire.nom}`, TRAVERSEE)
    expect(trouves.map((r) => r.id)).toContain(billet.id)
    const r = await service.controlerManuellement(billet.reference, TRAVERSEE)
    expect(r.controle.resultat).toBe("valide")
    expect(r.embarques.every((e) => e.mode === "manuel")).toBe(true)
    expect((await service.scanner(await qr(billet), TRAVERSEE)).controle.resultat).toBe("deja-scanne")
  })

  it("un passager retiré du bord par erreur peut être scanné de nouveau", async () => {
    const { embarques } = await service.scanner(await qr(billet), TRAVERSEE)
    await service.retirer(embarques[0].id)
    const r = await service.scanner(await qr(billet), TRAVERSEE)
    expect(r.controle.resultat).toBe("valide")
    expect(r.embarques.map((e) => e.passagerId)).toEqual([embarques[0].passagerId])
  })

  it("la clôture bloque les scans et compte les absents ; on peut rouvrir", async () => {
    await service.scanner(await qr(billet), TRAVERSEE)
    expect(await service.cloturer(TRAVERSEE)).toEqual({ ok: true })
    expect(await service.cloturer(TRAVERSEE)).toMatchObject({ ok: false })
    const [autreBillet] = (await repository.listerReservations(instant, { traverseeIds: [TRAVERSEE] })).filter(
      (r) => r.id !== billet.id && r.statut === "emise",
    )
    expect((await service.scanner(await qr(autreBillet), TRAVERSEE)).controle.resultat).toBe("embarquement-clos")
    const etat = await service.etat(TRAVERSEE)
    expect(etat?.compteur).toEqual({
      attendus: etat!.passagers.length,
      aBord: billet.passagers.length,
      restants: 0,
      absents: etat!.passagers.length - billet.passagers.length,
    })
    await service.rouvrir(TRAVERSEE)
    expect((await service.scanner(await qr(autreBillet), TRAVERSEE)).controle.resultat).toBe("valide")
  })

  it("les embarquements sont conservés dans le navigateur et ne se dédoublent pas", async () => {
    const { embarques } = await service.scanner(await qr(billet), TRAVERSEE)
    await repository.enregistrerEmbarquements(embarques) // même passager, même traversée : ignoré
    const autreOnglet = new DemoRepository(seed, stockage)
    expect(await autreOnglet.listerEmbarquements(TRAVERSEE)).toHaveLength(billet.passagers.length)
  })
})
