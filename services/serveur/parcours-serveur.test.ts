import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import type { SaisiePassager } from "@/domain/passagers"
import { estReferenceValide } from "@/domain/reference"
import { trouverBillet } from "../billets/service-billets"
import { SimulatedProviderServeur } from "../paiement/simulated-provider-serveur"
import type { DemandeBlocage } from "../reservation/service-reservation"
import { chargerExemples } from "./exemples"
import { appliquerMigrations } from "./migrations"
import { creerServicesServeur, type ServicesServeur } from "./services"
import { basePglite } from "./sql-pglite"
import type { Sql } from "./sql"

/**
 * Étape 7B : le parcours client sur le serveur et la base (PGlite), avec le paiement simulé côté serveur.
 */

const ALLER = "LBV-POG-2026-11-20-1215"
const RETOUR = "POG-LBV-2026-11-22-0725"

let sql: Sql
let fermer: () => Promise<void>
let instant: Date
let s: ServicesServeur

const adulte = (n: number): SaisiePassager => ({
  categorie: "adulte",
  nom: `Essai ${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[n % 26]}${"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(n / 26) % 26]}`,
  prenom: "Passager",
  dateNaissance: "",
  typePiece: "cni",
  numeroPiece: `EX${String(n).padStart(6, "0")}`,
})

function demande(partiel: Partial<DemandeBlocage> = {}): DemandeBlocage {
  return {
    segments: [{ traverseeId: ALLER, familleCode: "ECO", totalAffiche: 0 }],
    passagers: [adulte(1), adulte(2)],
    telephone: "+241 07 12 34 56",
    email: "client@example.com",
    ...partiel,
  }
}

async function bloquer(partiel: Partial<DemandeBlocage> = {}) {
  const r = await s.serviceReservation.bloquer(demande(partiel))
  if (!r.ok) throw new Error(r.message)
  return r.valeur
}

async function placesRestantes(id = ALLER) {
  const [inv] = await s.repository.listerInventaires([id], instant)
  return inv.placesRestantes
}

beforeAll(async () => {
  ;({ sql, fermer } = await basePglite())
  await appliquerMigrations(sql)
  await chargerExemples(sql, seed)
  instant = new Date("2026-11-14T10:00:00+01:00")
  s = creerServicesServeur(sql, () => instant)
}, 120_000)

afterAll(async () => {
  await fermer()
})

describe("paiement simulé côté serveur", () => {
  const transactions = new Map<string, { numero: string; creeLe: string }>()
  const fournisseur = new SimulatedProviderServeur("airtel", {
    ...seed.paiementSimule,
    horloge: () => instant,
    lireTransaction: async (ref) => transactions.get(ref) ?? null,
  })

  it("valide au bout du délai, refuse un numéro en 0000, sans rien planifier", async () => {
    transactions.set("TX-OK", { numero: "+241 07 12 34 56", creeLe: instant.toISOString() })
    transactions.set("TX-KO", { numero: "+241 07 12 00 00", creeLe: instant.toISOString() })
    expect((await fournisseur.consulterStatut("TX-OK")).statut).toBe("en-attente")
    const apres = new Date(instant.getTime() + seed.paiementSimule.delaiMs)
    const plusTard = new SimulatedProviderServeur("airtel", {
      ...seed.paiementSimule,
      horloge: () => apres,
      lireTransaction: async (ref) => transactions.get(ref) ?? null,
    })
    expect(await plusTard.consulterStatut("TX-OK")).toEqual({ statut: "reussi", refOperateur: "SIM-AIRTEL-TX-OK" })
    expect((await plusTard.consulterStatut("TX-KO")).statut).toBe("refuse")
    expect((await plusTard.consulterStatut("TX-INCONNUE")).statut).toBe("en-attente")
    expect(await fournisseur.traiterCallback({})).toBeNull()
  })
})

describe("parcours client sur la base", () => {
  it("bloque les places dans la base et les retire de la vente", async () => {
    const avant = await placesRestantes()
    const { commande, reservations } = await bloquer()
    expect(reservations[0]).toMatchObject({ statut: "bloquee", reference: "" })
    expect(await placesRestantes()).toBe(avant - 2)
    expect((await s.repository.getCommande(commande.id))?.reservationIds).toEqual([reservations[0].id])
    await s.serviceReservation.liberer(commande.id)
    expect(await placesRestantes()).toBe(avant)
  })

  it("ne vend jamais deux fois les dernières places, même demandées en même temps", async () => {
    // On remplit la traversée jusqu'à ce qu'il reste peu de places, puis deux clients les demandent ensemble.
    while ((await placesRestantes(RETOUR)) > 6) {
      const n = Math.min(9, (await placesRestantes(RETOUR)) - 6)
      await bloquer({
        segments: [{ traverseeId: RETOUR, familleCode: "VIP", totalAffiche: 0 }],
        passagers: Array.from({ length: n }, (_, i) => adulte(100 + i)),
      })
    }
    const restantes = await placesRestantes(RETOUR)
    const groupe = {
      segments: [{ traverseeId: RETOUR, familleCode: "VIP" as const, totalAffiche: 0 }],
      passagers: Array.from({ length: restantes }, (_, i) => adulte(200 + i)),
    }
    const [a, b] = await Promise.all([s.serviceReservation.bloquer(demande(groupe)), s.serviceReservation.bloquer(demande(groupe))])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    expect(await placesRestantes(RETOUR)).toBe(0)
  })

  it("confirme le paiement quand l'écran redemande l'état : billets, références, facture et e-mail", async () => {
    const { commande, reservations } = await bloquer()
    const p = await s.serviceReservation.payer(commande.id, { operateur: "airtel", numero: "07123456", options: { BAGAGE: 1 } })
    if (!p.ok) throw new Error(p.message)
    expect((await s.serviceReservation.verifierPaiement(p.valeur.id))?.statut).toBe("en-attente")

    instant = new Date(instant.getTime() + seed.paiementSimule.delaiMs)
    // Deux relectures simultanées (deux onglets) : une seule émission.
    const [x, y] = await Promise.all([
      s.serviceReservation.verifierPaiement(p.valeur.id),
      s.serviceReservation.verifierPaiement(p.valeur.id),
    ])
    expect(x?.statut).toBe("reussi")
    expect(y?.statut).toBe("reussi")

    const detail = await s.serviceReservation.lireCommande(commande.id)
    expect(detail?.commande.statut).toBe("payee")
    expect(detail?.commande.numeroFacture).toMatch(/^F-2026-\d{6}$/)
    const emise = await s.repository.getReservation(reservations[0].id)
    expect(emise?.statut).toBe("emise")
    expect(estReferenceValide(emise?.reference ?? "")).toBe(true)
    expect(emise?.options).toEqual([{ code: "BAGAGE", quantite: 1, prixUnitaire: expect.any(Number) }])
    const envois = await s.repository.listerEnvois({ commandeId: commande.id })
    expect(envois).toHaveLength(1)
    expect(envois[0]).toMatchObject({ destinataire: "client@example.com", statut: "apercu" })

    // Une deuxième commande payée prend le numéro de facture suivant, sans trou.
    const deuxieme = await bloquer()
    const p2 = await s.serviceReservation.payer(deuxieme.commande.id, { operateur: "moov", numero: "06123456", options: {} })
    if (!p2.ok) throw new Error(p2.message)
    instant = new Date(instant.getTime() + seed.paiementSimule.delaiMs)
    await s.serviceReservation.verifierPaiement(p2.valeur.id)
    const numero = (n: string | null | undefined) => Number(n?.slice(-6))
    const facture2 = (await s.repository.getCommande(deuxieme.commande.id))?.numeroFacture
    expect(numero(facture2)).toBe(numero(detail?.commande.numeroFacture) + 1)

    // « Mes billets » : la référence seule ne suffit pas, il faut le contact de la réservation.
    const reference = emise?.reference ?? ""
    expect((await trouverBillet(s.repository, reference, "+241 07 12 34 56"))?.id).toBe(emise?.id)
    expect((await trouverBillet(s.repository, reference.toLowerCase().replace("-", " "), "CLIENT@example.com"))?.id).toBe(emise?.id)
    expect(await trouverBillet(s.repository, reference, "+241 06 00 00 01")).toBeNull()
  })

  it("refuse le paiement d'un numéro en 0000 et garde les places bloquées", async () => {
    const avant = await placesRestantes()
    const { commande } = await bloquer()
    const p = await s.serviceReservation.payer(commande.id, { operateur: "airtel", numero: "07120000", options: {} })
    if (!p.ok) throw new Error(p.message)
    instant = new Date(instant.getTime() + seed.paiementSimule.delaiMs)
    expect((await s.serviceReservation.verifierPaiement(p.valeur.id))?.statut).toBe("refuse")
    expect((await s.serviceReservation.lireCommande(commande.id))?.commande.statut).toBe("en-cours")
    expect(await placesRestantes()).toBe(avant - 2)
  })

  it("libère les places à l'expiration du blocage", async () => {
    const avant = await placesRestantes()
    const { commande } = await bloquer()
    instant = new Date(instant.getTime() + 15 * 60_000)
    expect((await s.serviceReservation.lireCommande(commande.id))?.commande.statut).toBe("expiree")
    expect(await placesRestantes()).toBeGreaterThanOrEqual(avant)
  })
})
