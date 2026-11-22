import { beforeEach, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import { generateur } from "@/domain/aleatoire"
import type { SaisiePassager } from "@/domain/passagers"
import { ServiceBillets } from "../billets/service-billets"
import { PreviewNotificationService } from "../notification/preview-notification-service"
import { SimulatedProvider } from "../paiement/simulated-provider"
import type { Operateur } from "../paiement/payment-provider"
import { DemoRepository } from "../repository/demo-repository"
import { ServiceReservation } from "../reservation/service-reservation"
import { stockageMemoire } from "../stockage"
import { LocalAuthService, normaliserIdentifiant } from "./local-auth-service"

const passagers: SaisiePassager[] = [
  { categorie: "adulte", nom: "Mba", prenom: "Paul", dateNaissance: "", typePiece: "cni", numeroPiece: "EX1234567" },
]

let instant: Date
let repository: DemoRepository
let service: ServiceReservation
let auth: LocalAuthService
let billets: ServiceBillets

/** Lit le code à 6 chiffres dans l'aperçu du dernier e-mail envoyé. */
async function dernierCode(): Promise<string> {
  const envois = await repository.listerEnvois({})
  return /(\d{6})/.exec(envois.at(-1)?.texte ?? "")?.[1] ?? ""
}

async function commandePayee(contact: { telephone?: string; email?: string }, traverseeId = "LBV-POG-2026-11-20-1215") {
  const r = await service.bloquer({
    segments: [{ traverseeId, familleCode: "ECO", totalAffiche: 0 }],
    passagers,
    telephone: contact.telephone ?? "",
    email: contact.email ?? "",
  })
  if (!r.ok) throw new Error(r.message)
  const p = await service.payer(r.valeur.commande.id, { operateur: "airtel", numero: "07123456", options: {} })
  if (!p.ok) throw new Error(p.message)
  instant = new Date(instant.getTime() + 4_000)
  await service.verifierPaiement(p.valeur.id)
  return (await service.lireCommande(r.valeur.commande.id))!
}

beforeEach(() => {
  instant = new Date("2026-11-14T10:00:00+01:00")
  const stockage = stockageMemoire()
  const horloge = () => instant
  let n = 0
  const genererId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`
  repository = new DemoRepository(seed, stockage)
  const notifications = new PreviewNotificationService(repository, horloge, genererId)
  const operateur = (code: Operateur) =>
    new SimulatedProvider(code, { ...seed.paiementSimule, stockage, horloge, envoyerCallback: () => {}, planifier: () => {} })
  service = new ServiceReservation({
    repository,
    operateurs: { airtel: operateur("airtel"), moov: operateur("moov") },
    notifications,
    horloge,
    aleatoire: generateur(3),
    genererId,
  })
  auth = new LocalAuthService({ repository, notifications, stockage, horloge, aleatoire: generateur(11), genererId })
  billets = new ServiceBillets({ repository, auth, stockage })
})

describe("compte créé après le paiement", () => {
  it("avec un e-mail : vérification par code, puis rattachement des réservations de cette adresse", async () => {
    const autre = await commandePayee({ email: "paul@example.com" }, "LBV-POG-2026-11-27-1215")
    const { commande } = await commandePayee({ email: "paul@example.com", telephone: "07123456" })

    const cree = await auth.creerCompte(commande.id, "motdepasse")
    expect(cree.ok && cree.valeur.verificationRequise).toBe(true)
    expect((await auth.session())?.client.reservationIds).toEqual(commande.reservationIds)

    expect(await auth.verifierCode("000000")).toEqual({ ok: false, message: "Code incorrect." })
    const verifie = await auth.verifierCode(await dernierCode())
    expect(verifie.ok).toBe(true)
    const session = await auth.session()
    expect(session?.verificationRequise).toBe(false)
    expect(session?.client.reservationIds).toEqual(expect.arrayContaining([...commande.reservationIds, ...autre.commande.reservationIds]))
    expect(session?.client.passagers).toHaveLength(1)
  })

  it("avec un téléphone : pas de vérification, seule la réservation en cours est rattachée", async () => {
    const { commande } = await commandePayee({ telephone: "07123456" })
    const cree = await auth.creerCompte(commande.id, "motdepasse")
    expect(cree.ok && cree.valeur.verificationRequise).toBe(false)
    expect(cree.ok && cree.valeur.client.telephone).toBe("+241 07 12 34 56")
  })

  it("refuse un mot de passe trop court et un deuxième compte pour le même identifiant", async () => {
    const { commande } = await commandePayee({ telephone: "07123456" })
    expect((await auth.creerCompte(commande.id, "court")).ok).toBe(false)
    expect((await auth.creerCompte(commande.id, "motdepasse")).ok).toBe(true)
    expect(await auth.creerCompte(commande.id, "motdepasse")).toMatchObject({ ok: false })
  })
})

describe("connexion et mot de passe oublié", () => {
  beforeEach(async () => {
    const { commande } = await commandePayee({ email: "paul@example.com" })
    await auth.creerCompte(commande.id, "motdepasse")
    await auth.verifierCode(await dernierCode())
    await auth.deconnecter()
  })

  it("connecte avec le bon mot de passe, sans révéler si le compte existe", async () => {
    expect(await auth.connecter("paul@example.com", "mauvais")).toEqual({ ok: false, message: "Identifiant ou mot de passe incorrect." })
    expect(await auth.connecter("inconnu@example.com", "motdepasse")).toEqual({ ok: false, message: "Identifiant ou mot de passe incorrect." })
    expect((await auth.connecter(" Paul@Example.com ", "motdepasse")).ok).toBe(true)
  })

  it("réinitialise le mot de passe avec un code envoyé par e-mail", async () => {
    const demande = await auth.demanderReinitialisation("paul@example.com")
    expect(demande.ok && demande.valeur.canal).toBe("email")
    expect((await auth.reinitialiser("paul@example.com", await dernierCode(), "nouveaumotdepasse")).ok).toBe(true)
    await auth.deconnecter()
    expect((await auth.connecter("paul@example.com", "nouveaumotdepasse")).ok).toBe(true)
  })

  it("renvoie vers l'agence pour un compte téléphone (SMS en V2)", async () => {
    expect(await auth.demanderReinitialisation("07123456")).toEqual({ ok: true, valeur: { canal: "agence" } })
  })

  it("supprime le compte", async () => {
    await auth.connecter("paul@example.com", "motdepasse")
    await auth.supprimerCompte()
    expect(await auth.session()).toBeNull()
    expect(await repository.trouverClient("paul@example.com")).toBeNull()
  })
})

describe("Mes billets", () => {
  it("retrouve un billet avec la référence et le contact, sans révéler lequel est faux", async () => {
    const exemple = await repository.exempleBillet(instant)
    expect(exemple).not.toBeNull()
    if (!exemple) return
    expect(await billets.autorise(exemple.reference)).toBe(false)
    expect((await billets.rechercher(exemple.reference, "+241 06 99 99 99")).ok).toBe(false)
    const trouve = await billets.rechercher(exemple.reference.toLowerCase().replace("-", " "), exemple.contact)
    expect(trouve).toEqual({ ok: true, valeur: exemple.reference })
    expect(await billets.autorise(exemple.reference)).toBe(true)
  })

  it("liste les billets payés sur cet appareil", async () => {
    const { reservations } = await commandePayee({ telephone: "07123456" })
    expect((await billets.consultables()).map((r) => r.reference)).toEqual([reservations[0].reference])
  })

  it("normalise les identifiants", () => {
    expect(normaliserIdentifiant(" Paul@Example.COM ")).toBe("paul@example.com")
    expect(normaliserIdentifiant("07 12 34 56")).toBe("+241 07 12 34 56")
    expect(normaliserIdentifiant("n'importe quoi")).toBeNull()
  })
})
