import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import type { Commande, Embarquement, Envoi, Paiement, Reservation, Traversee } from "@/domain/types"
import { construireDonneesDemo, DemoRepository } from "./demo-repository"
import { PostgresRepository } from "./postgres-repository"
import type { Inventaire } from "./repository"
import { chargerExemples, type BilanChargement } from "../serveur/exemples"
import { appliquerMigrations, etatMigrations, MIGRATIONS } from "../serveur/migrations"
import { basePglite } from "../serveur/sql-pglite"
import type { Sql } from "../serveur/sql"
import { stockageMemoire } from "../stockage"

/**
 * Le PostgresRepository doit montrer exactement ce que montre la démo : on charge les mêmes données
 * d'exemple dans un vrai PostgreSQL (PGlite) et on compare les deux, puis on vérifie les écritures.
 */

let sql: Sql
let fermer: () => Promise<void>
let base: PostgresRepository
let demo: DemoRepository
let bilan: BilanChargement

const INSTANTS = [
  new Date("2026-11-01T08:00:00+01:00"),
  new Date("2026-11-20T11:30:00+01:00"),
  new Date("2026-12-15T18:00:00+01:00"),
]
const TRAVERSEE = "LBV-POG-2026-11-20-1215"

/** Les instants sortent de la base au format UTC ; on compare les moments, pas l'écriture. */
function memeInstants(t: Traversee) {
  return {
    ...t,
    departAt: Date.parse(t.departAt),
    arriveeAt: Date.parse(t.arriveeAt),
    enregistrementOuvertureAt: Date.parse(t.enregistrementOuvertureAt),
    enregistrementFermetureAt: t.enregistrementFermetureAt && Date.parse(t.enregistrementFermetureAt),
  }
}

function sansTraversee(i: Inventaire) {
  return { id: i.traversee.id, classes: i.classes, occupation: i.occupation, placesRestantes: i.placesRestantes }
}

const parId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)

beforeAll(async () => {
  ;({ sql, fermer } = await basePglite())
  await appliquerMigrations(sql)
  bilan = await chargerExemples(sql, seed)
  base = new PostgresRepository(sql, seed)
  demo = new DemoRepository(seed, stockageMemoire())
}, 120_000)

afterAll(async () => {
  await fermer()
})

describe("schéma et chargement", () => {
  it("applique chaque migration une seule fois", async () => {
    expect(await appliquerMigrations(sql)).toEqual([])
    const etat = await etatMigrations(sql)
    expect(etat.map((e) => e.version)).toEqual(MIGRATIONS.map((m) => m.version))
    expect(etat.every((e) => e.appliqueeLe !== null)).toBe(true)
  })

  it("charge les mêmes traversées, paliers et ventes que la démo", () => {
    const donnees = construireDonneesDemo(seed)
    expect(bilan.traversees).toBe(donnees.traversees.length)
    expect(bilan.paliers).toBe([...donnees.classesParTraversee.values()].flat().length)
    expect(bilan.ventesExemple).toBe(donnees.ventes.length)
    expect(bilan.ventesExemple).toBeGreaterThan(1000)
  })

  it("active la RLS sur toutes les tables", async () => {
    const tables = await sql.requete<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    )
    expect(tables.length).toBeGreaterThan(20)
    expect(tables.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([])
  })
})

describe("lectures identiques à la démo", () => {
  it("référentiel", async () => {
    expect(await base.getReferentiel()).toEqual(await demo.getReferentiel())
  })

  it("info trafic", async () => {
    for (const instant of INSTANTS) {
      const [b, d] = await Promise.all([base.getInfosTrafic(instant), demo.getInfosTrafic(instant)])
      expect(b.map((i) => i.id)).toEqual(d.map((i) => i.id))
    }
  })

  it("traversées, avec et sans filtre", async () => {
    for (const filtre of [{}, { ligneId: "LBV-POG" }, { du: "2026-11-20", au: "2026-11-27" }, { ligneId: "POG-LBV", du: "2026-12-01" }]) {
      const [b, d] = await Promise.all([base.listerTraversees(filtre), demo.listerTraversees(filtre)])
      expect(b.map(memeInstants)).toEqual(d.map(memeInstants))
    }
    expect(memeInstants((await base.getTraversee(TRAVERSEE))!)).toEqual(memeInstants((await demo.getTraversee(TRAVERSEE))!))
    expect(await base.getTraversee("inconnue")).toBeNull()
  })

  it("inventaires de toutes les traversées, à plusieurs dates", async () => {
    const ids = (await demo.listerTraversees()).map((t) => t.id)
    for (const instant of INSTANTS) {
      const [b, d] = await Promise.all([base.listerInventaires(ids, instant), demo.listerInventaires(ids, instant)])
      expect(b.map(sansTraversee)).toEqual(d.map(sansTraversee))
    }
  })

  it("réservations retenues et répartition par tarif", async () => {
    for (const instant of INSTANTS) {
      const [b, d] = await Promise.all([base.listerReservations(instant), demo.listerReservations(instant)])
      expect([...b].sort(parId)).toEqual([...d].sort(parId))
      expect(await base.repartitionParFamille(instant)).toEqual(await demo.repartitionParFamille(instant))
    }
  })

  it("paramètres de gestion et billet d'exemple", async () => {
    expect(await base.getParametresGestion()).toEqual(await demo.getParametresGestion())
    const exemple = await base.exempleBillet(INSTANTS[1])
    expect(exemple).not.toBeNull()
    expect((await base.trouverReservationParReference(exemple!.reference))?.telephone).toBe(exemple!.contact)
  })
})

describe("écritures", () => {
  const instant = INSTANTS[1]

  function nouvelleReservation(id: string, classeId: string): Reservation {
    return {
      id,
      commandeId: null,
      reference: "",
      traverseeId: TRAVERSEE,
      familleCode: classeId.includes(":VIP") ? "VIP" : "ECO",
      classeId,
      statut: "bloquee",
      telephone: "+241 07 12 34 56",
      email: null,
      passagers: [
        { id: `${id}-p1`, categorie: "adulte", nom: "ESSAI", prenom: "Un", dateNaissance: null, typePiece: "cni", numeroPiece: "AB123" },
        { id: `${id}-p2`, categorie: "enfant", nom: "ESSAI", prenom: "Deux", dateNaissance: "2018-03-09", typePiece: null, numeroPiece: null },
      ],
      prixUnitaires: { adulte: 31000, enfant: 19000, bebe: 5000 },
      options: [{ code: "BAGAGE", quantite: 2, prixUnitaire: 5000 }],
      total: 60000,
      devise: "XAF",
      bloqueeJusquA: new Date(instant.getTime() + 15 * 60_000).toISOString(),
      canal: "web",
      moyenPaiement: null,
      creeLe: instant.toISOString(),
    }
  }

  it("une vraie réservation passe avant les ventes d'exemple, comme dans la démo", async () => {
    const [inv] = await demo.listerInventaires([TRAVERSEE], instant)
    const classeId = inv.classes.find((c) => c.familleCode === "ECO" && c.ouverte)!.id
    const r = nouvelleReservation("essai-1", classeId)
    await Promise.all([base.enregistrerReservation(r), demo.enregistrerReservation(r)])

    expect(await base.getReservation("essai-1")).toEqual(r)
    const [b, d] = await Promise.all([base.listerInventaires([TRAVERSEE], instant), demo.listerInventaires([TRAVERSEE], instant)])
    expect(b.map(sansTraversee)).toEqual(d.map(sansTraversee))
    expect((await base.listerReservationsLocales()).map((x) => x.id)).toEqual(["essai-1"])
  })

  it("modifier une réservation garde l'embarquement des passagers restants", async () => {
    const r = (await base.getReservation("essai-1"))!
    const emise = { ...r, statut: "emise" as const, reference: "LGM-ESSAI", bloqueeJusquA: null }
    await Promise.all([base.enregistrerReservation(emise), demo.enregistrerReservation(emise)])
    const e: Embarquement = {
      id: "emb-1",
      traverseeId: TRAVERSEE,
      reservationId: r.id,
      passagerId: r.passagers[0].id,
      reference: "LGM-ESSAI",
      mode: "scan",
      agent: "Agent",
      embarqueLe: instant.toISOString(),
    }
    await base.enregistrerEmbarquements([e, { ...e, id: "emb-doublon" }])
    expect(await base.listerEmbarquements(TRAVERSEE)).toEqual([e])

    const reduite = { ...emise, passagers: [r.passagers[0]], options: [] }
    await Promise.all([base.enregistrerReservation(reduite), demo.enregistrerReservation(reduite)])
    const relue = (await base.getReservation(r.id))!
    expect(relue.passagers.map((p) => p.id)).toEqual([r.passagers[0].id])
    expect(relue.options).toEqual([])
    expect(await base.listerEmbarquements(TRAVERSEE)).toHaveLength(1)
    expect(await base.trouverReservationParReference("LGM-ESSAI")).toMatchObject({ id: r.id })
    expect(await base.referenceExiste("LGM-ESSAI")).toBe(true)

    await base.supprimerEmbarquement("emb-1")
    expect(await base.listerEmbarquements(TRAVERSEE)).toEqual([])
  })

  it("une fermeture de palier agit comme dans la démo (ventes d'exemple et prix)", async () => {
    const [inv] = await demo.listerInventaires([TRAVERSEE], INSTANTS[0])
    const classeId = inv.classes.find((c) => c.familleCode === "ECO" && c.rang === 2)!.id
    const changement = {
      id: "chg-1",
      traverseeId: TRAVERSEE,
      classeId,
      ouverte: false,
      motif: "Essai",
      auteur: "Essai",
      le: INSTANTS[0].toISOString(),
    }
    await Promise.all([base.enregistrerChangementPalier(changement), demo.enregistrerChangementPalier(changement)])
    expect(await base.listerChangementsPaliers(TRAVERSEE)).toEqual([changement])
    for (const i of INSTANTS) {
      const [b, d] = await Promise.all([base.listerInventaires([TRAVERSEE], i), demo.listerInventaires([TRAVERSEE], i)])
      expect(b.map(sansTraversee)).toEqual(d.map(sansTraversee))
      const [rb, rd] = await Promise.all([base.listerReservations(i, { traverseeIds: [TRAVERSEE] }), demo.listerReservations(i, { traverseeIds: [TRAVERSEE] })])
      expect([...rb].sort(parId).map((r) => r.id)).toEqual([...rd].sort(parId).map((r) => r.id))
    }
  })

  it("commande, numéro de facture sans trou, paiement et envoi", async () => {
    const commande: Commande = {
      id: "cmd-1",
      reservationIds: ["essai-1"],
      telephone: "+241 07 12 34 56",
      email: null,
      statut: "en-cours",
      total: 60000,
      numeroFacture: null,
      factureEmiseLe: null,
      clientId: null,
      creeLe: instant.toISOString(),
    }
    await base.enregistrerCommande(commande)
    expect(await base.getCommande("cmd-1")).toEqual(commande)

    expect(await base.prochainNumeroFacture(2026)).toBe("F-2026-000001")
    expect(await base.prochainNumeroFacture(2026)).toBe("F-2026-000002")
    expect(await base.prochainNumeroFacture(2027)).toBe("F-2027-000001")

    const payee = { ...commande, statut: "payee" as const, numeroFacture: "F-2026-000002", factureEmiseLe: instant.toISOString() }
    await base.enregistrerCommande(payee)
    expect(await base.getCommande("cmd-1")).toEqual(payee)
    expect((await base.getReservation("essai-1"))?.commandeId).toBe("cmd-1")

    const p: Paiement = {
      id: "pai-1",
      commandeId: "cmd-1",
      moyen: "airtel",
      numero: "+241 07 12 34 56",
      montant: 60000,
      statut: "en-attente",
      refTransaction: "TX-1",
      refOperateur: null,
      creeLe: instant.toISOString(),
      majLe: instant.toISOString(),
    }
    await base.enregistrerPaiement(p)
    const reussi = { ...p, statut: "reussi" as const, refOperateur: "OP-1", majLe: new Date(instant.getTime() + 4000).toISOString() }
    await base.enregistrerPaiement(reussi)
    expect(await base.getPaiement("pai-1")).toEqual(reussi)
    expect(await base.trouverPaiementParTransaction("TX-1")).toEqual(reussi)
    expect(await base.listerPaiements("cmd-1")).toEqual([reussi])

    const envoi: Envoi = {
      id: "env-1",
      commandeId: "cmd-1",
      clientId: null,
      canal: "email",
      destinataire: "essai@exemple.test",
      objet: "Votre billet",
      texte: "Bonjour",
      pieces: [{ nom: "billet.pdf", type: "billet" }],
      statut: "apercu",
      tentatives: 0,
      erreur: null,
      creeLe: instant.toISOString(),
    }
    await base.enregistrerEnvoi(envoi)
    expect(await base.getEnvoi("env-1")).toEqual(envoi)
    expect(await base.listerEnvois({ commandeId: "cmd-1" })).toEqual([envoi])
    expect(await base.listerEnvois({ commandeId: "autre" })).toEqual([])
  })

  it("journal des scans et clôture de l'embarquement", async () => {
    const s = { id: "scan-1", traverseeId: TRAVERSEE, reference: "LGM-ESSAI", resultat: "valide" as const, mode: "scan" as const, agent: "Agent", le: instant.toISOString() }
    await base.enregistrerScan(s)
    await base.enregistrerScan(s)
    expect(await base.listerScans(TRAVERSEE)).toEqual([s])

    const cloture = { traverseeId: TRAVERSEE, agent: "Agent", le: instant.toISOString() }
    await base.definirClotureEmbarquement(TRAVERSEE, cloture)
    expect(await base.getClotureEmbarquement(TRAVERSEE)).toEqual(cloture)
    await base.definirClotureEmbarquement(TRAVERSEE, null)
    expect(await base.getClotureEmbarquement(TRAVERSEE)).toBeNull()
  })

  it("recharger les exemples garde les vraies réservations et les changements de paliers", async () => {
    const nouveauBilan = await chargerExemples(sql, seed)
    expect(nouveauBilan).toEqual(bilan)
    expect(await base.getReservation("essai-1")).not.toBeNull()
    expect(await base.listerChangementsPaliers(TRAVERSEE)).toHaveLength(1)
    const [b, d] = await Promise.all([base.listerInventaires([TRAVERSEE], instant), demo.listerInventaires([TRAVERSEE], instant)])
    expect(b[0].placesRestantes).toBe(d[0].placesRestantes)
  })
})
