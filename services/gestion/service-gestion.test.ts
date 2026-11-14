import { beforeEach, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import { generateur } from "@/domain/aleatoire"
import { calculerIndicateurs, estVendue } from "@/domain/indicateurs"
import { manifeste } from "@/domain/manifeste"
import { occupeDesPlaces, placesReservation } from "@/domain/occupation"
import { meilleureOffre } from "@/domain/tarifs"
import { PreviewNotificationService } from "../notification/preview-notification-service"
import type { Operateur } from "../paiement/payment-provider"
import { SimulatedProvider } from "../paiement/simulated-provider"
import { DemoRepository } from "../repository/demo-repository"
import { ServiceReservation } from "../reservation/service-reservation"
import { stockageMemoire, type Stockage } from "../stockage"
import { CodeDemoAccesGestion } from "./acces-gestion"
import { ServiceGestion } from "./service-gestion"

const TRAVERSEE = "LBV-POG-2026-11-20-1215"
const UN_ADULTE = { adultes: 1, enfants: 0, bebes: 0 }

let instant: Date
let stockage: Stockage
let repository: DemoRepository
let gestion: ServiceGestion
let reservation: ServiceReservation
let taches: { action: () => void; echeance: number }[]
let callbacks: [Operateur, unknown][]

beforeEach(() => {
  instant = new Date("2026-11-14T10:00:00+01:00")
  taches = []
  callbacks = []
  stockage = stockageMemoire()
  const horloge = () => instant
  let n = 0
  const genererId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`
  repository = new DemoRepository(seed, stockage)
  gestion = new ServiceGestion({ repository, horloge, genererId, auteur: "Accès démo" })
  const operateur = (code: Operateur) =>
    new SimulatedProvider(code, {
      ...seed.paiementSimule,
      stockage,
      horloge,
      envoyerCallback: (op, contenu) => callbacks.push([op, contenu]),
      planifier: (action, delai) => taches.push({ action, echeance: instant.getTime() + delai }),
    })
  reservation = new ServiceReservation({
    repository,
    operateurs: { airtel: operateur("airtel"), moov: operateur("moov") },
    notifications: new PreviewNotificationService(repository, horloge, genererId),
    horloge,
    aleatoire: generateur(7),
    genererId,
  })
})

async function inventaire(id = TRAVERSEE) {
  const [inv] = await repository.listerInventaires([id], instant)
  return inv
}

async function prixEco(id = TRAVERSEE) {
  const inv = await inventaire(id)
  const offre = meilleureOffre(inv.classes, "ECO", UN_ADULTE, inv.traversee.capaciteVendable, inv.occupation)
  return offre.disponible ? { classeId: offre.classe.id, prix: offre.total } : null
}

describe("mêmes chiffres que le site client", () => {
  it("les réservations listées recomposent exactement l'occupation de chaque traversée", async () => {
    const etat = await gestion.etatVentes(instant)
    expect(etat.traversees).toHaveLength(80)
    for (const t of etat.traversees) {
      const places = etat.reservations
        .filter((r) => r.traverseeId === t.id && occupeDesPlaces(r, instant))
        .reduce((s, r) => s + placesReservation(r), 0)
      expect(places).toBe(etat.inventaires.get(t.id)?.occupation.total)
    }
  })

  it("une réservation payée sur le site apparaît dans le back-office et le manifeste", async () => {
    const avant = await gestion.etatVentes(instant, [TRAVERSEE])
    const placesAvant = calculerIndicateurs(avant.traversees, avant.reservations, instant).places
    const bloquee = await reservation.bloquer({
      segments: [{ traverseeId: TRAVERSEE, familleCode: "STD", totalAffiche: 0 }],
      passagers: [
        { categorie: "adulte", nom: "Mba", prenom: "Paul", dateNaissance: "", typePiece: "cni", numeroPiece: "EX1234567" },
      ],
      telephone: "+241 07 12 34 56",
      email: "",
    })
    if (!bloquee.ok) throw new Error(bloquee.message)
    const paiement = await reservation.payer(bloquee.valeur.commande.id, { operateur: "airtel", numero: "07123456", options: {} })
    if (!paiement.ok) throw new Error(paiement.message)
    instant = new Date(instant.getTime() + seed.paiementSimule.delaiMs)
    taches.filter((t) => t.echeance <= instant.getTime()).forEach((t) => t.action())
    for (const [op, contenu] of callbacks.splice(0)) await reservation.traiterCallback(op, contenu)

    const apres = await gestion.etatVentes(instant, [TRAVERSEE])
    const id = bloquee.valeur.reservations[0].id
    const faite = apres.reservations.find((r) => r.id === id)
    expect(faite?.statut).toBe("emise")
    expect(apres.locales.has(id)).toBe(true)
    expect(calculerIndicateurs(apres.traversees, apres.reservations, instant).places).toBe(placesAvant + 1)
    expect(manifeste(apres.reservations, TRAVERSEE, instant).some((l) => l.nom === "MBA" && l.prenom === "Paul")).toBe(true)
  })
})

describe("réglage des paliers", () => {
  it("fermer le palier en vente change le prix côté client ; le rouvrir le rétablit", async () => {
    const avant = await prixEco()
    expect(avant).not.toBeNull()
    const ferme = await gestion.changerPalier(TRAVERSEE, avant!.classeId, false, "Forte demande")
    expect(ferme).toEqual({ ok: true })
    const pendant = await prixEco()
    expect(pendant?.classeId).not.toBe(avant!.classeId)
    expect(pendant!.prix).toBeGreaterThan(avant!.prix)
    expect((await inventaire()).classes.find((c) => c.id === avant!.classeId)?.ouverte).toBe(false)

    instant = new Date(instant.getTime() + 60_000)
    expect(await gestion.changerPalier(TRAVERSEE, avant!.classeId, true, "Retour à la normale")).toEqual({ ok: true })
    expect(await prixEco()).toEqual(avant)
    const changements = await repository.listerChangementsPaliers(TRAVERSEE)
    expect(changements.map((c) => [c.ouverte, c.motif, c.auteur])).toEqual([
      [false, "Forte demande", "Accès démo"],
      [true, "Retour à la normale", "Accès démo"],
    ])
  })

  it("le réglage est conservé dans le stockage du navigateur", async () => {
    const avant = await prixEco()
    await gestion.changerPalier(TRAVERSEE, avant!.classeId, false, "Test")
    const autreOnglet = new DemoRepository(seed, stockage)
    const [inv] = await autreOnglet.listerInventaires([TRAVERSEE], instant)
    expect(inv.classes.find((c) => c.id === avant!.classeId)?.ouverte).toBe(false)
  })

  it("refuse un changement sans motif ou la fermeture du Flex", async () => {
    const avant = await prixEco()
    expect(await gestion.changerPalier(TRAVERSEE, avant!.classeId, false, "")).toMatchObject({ ok: false })
    expect(await gestion.changerPalier(TRAVERSEE, `${TRAVERSEE}:FLEX-1`, false, "Essai")).toMatchObject({
      ok: false,
      message: expect.stringMatching(/Flex/),
    })
    expect(await gestion.changerPalier("inconnue", avant!.classeId, false, "Essai")).toMatchObject({ ok: false })
    expect(await repository.listerChangementsPaliers()).toEqual([])
  })

  it("une vente d'exemple prévue dans un palier fermé n'a pas lieu", async () => {
    const plusTard = new Date("2026-11-20T11:00:00+01:00")
    const toutes = await repository.listerReservations(plusTard, { traverseeIds: [TRAVERSEE] })
    const aVenir = toutes.find(
      (r) => r.familleCode !== "FLEX" && Date.parse(r.creeLe) > instant.getTime() && estVendue(r, plusTard),
    )
    expect(aVenir).toBeDefined()
    expect(await gestion.changerPalier(TRAVERSEE, aVenir!.classeId, false, "Test")).toEqual({ ok: true })
    const apres = await repository.listerReservations(plusTard, { traverseeIds: [TRAVERSEE] })
    expect(apres.some((r) => r.id === aVenir!.id)).toBe(false)
    // Les ventes faites avant la fermeture restent.
    const passees = toutes.filter((r) => r.classeId === aVenir!.classeId && Date.parse(r.creeLe) <= instant.getTime())
    for (const r of passees) expect(apres.some((x) => x.id === r.id)).toBe(true)
  })
})

describe("accès par code de démonstration", () => {
  it("ouvre une session limitée dans le temps", async () => {
    const acces = new CodeDemoAccesGestion({ code: "241241", dureeHeures: 8, stockage, horloge: () => instant })
    expect(await acces.estConnecte()).toBe(false)
    expect(await acces.connecter("000000")).toBe(false)
    expect(await acces.estConnecte()).toBe(false)
    expect(await acces.connecter(" 241 241 ")).toBe(true)
    expect(await acces.estConnecte()).toBe(true)
    instant = new Date(instant.getTime() + 8 * 3_600_000)
    expect(await acces.estConnecte()).toBe(false)
    await acces.connecter("241241")
    await acces.deconnecter()
    expect(await acces.estConnecte()).toBe(false)
  })
})

describe("synthèse des traversées", () => {
  it("donne remplissage, recette, palier en vente et alertes, cohérents avec l'inventaire", async () => {
    const { syntheseTraversees } = await import("./service-gestion")
    const etat = await gestion.etatVentes(instant)
    const lignes = syntheseTraversees(etat)
    expect(lignes).toHaveLength(80)
    const complete = lignes.find((l) => l.traversee.id === "LBV-POG-2026-11-24-1215")!
    expect(complete.indicateurs.places).toBe(complete.traversee.capaciteVendable)
    expect(complete.alertes).toContain("complete")
    expect(complete.enVente).toEqual({ ECO: null, STD: null, FLEX: null })
    const partie = lignes.find((l) => l.traversee.id === "LBV-POG-2026-11-13-1215")!
    expect(partie.statut).toBe("partie")
    expect(partie.alertes).toEqual([])
    const aVenir = lignes.find((l) => l.traversee.id === TRAVERSEE)!
    expect(aVenir.enVente.ECO?.id).toBe((await prixEco())?.classeId)
    expect(aVenir.indicateurs.remplissage).toBeCloseTo(aVenir.indicateurs.places / aVenir.traversee.capaciteVendable)
  })
})
