import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { generateur } from "@/domain/aleatoire"
import { erreurMotDePasse } from "@/domain/roles"
import { ServiceComptesGestion, type FournisseurIdentites } from "./comptes-gestion"
import { appliquerMigrations } from "./migrations"
import { basePglite } from "./sql-pglite"
import type { Sql } from "./sql"

/** Étape 7C : comptes de l'équipe, sur un vrai PostgreSQL (PGlite) et un faux Supabase Auth. */

let sql: Sql
let fermer: () => Promise<void>
let service: ServiceComptesGestion
let identites: Map<string, { email: string; motDePasse: string }>

const faux: FournisseurIdentites = {
  async creer(email, motDePasse) {
    if ([...identites.values()].some((i) => i.email === email)) return { ok: false, message: "Adresse déjà utilisée." }
    const id = `auth-${identites.size + 1}`
    identites.set(id, { email, motDePasse })
    return { ok: true, id }
  },
  async definirMotDePasse(id, motDePasse) {
    const i = identites.get(id)
    if (i) i.motDePasse = motDePasse
  },
}

beforeAll(async () => {
  ;({ sql, fermer } = await basePglite())
  await appliquerMigrations(sql)
}, 120_000)

afterAll(async () => {
  await fermer()
})

beforeEach(async () => {
  await sql.executer("delete from profils; delete from journal_audit;")
  identites = new Map()
  let n = 0
  service = new ServiceComptesGestion({
    sql,
    identites: faux,
    horloge: () => new Date("2026-11-24T09:00:00Z"),
    genererId: () => `j${++n}`,
    aleatoire: generateur(11),
  })
})

async function premierAdmin() {
  const r = await service.creerPremierAdministrateur({ email: " Admin@Exemple.com ", nom: "Admin  Essai", motDePasse: "victoria-jet-2026" })
  if (!r.ok) throw new Error(r.message)
  return r.valeur
}

describe("comptes de l'équipe", () => {
  it("crée le premier administrateur une seule fois, avec le mot de passe qu'il a choisi", async () => {
    expect((await service.creerPremierAdministrateur({ email: "a@exemple.com", nom: "A", motDePasse: "court" })).ok).toBe(false)
    const admin = await premierAdmin()
    expect(admin).toMatchObject({ email: "admin@exemple.com", nom: "Admin Essai", role: "administrateur", doitChangerMotDePasse: false })
    expect(identites.get(admin.id)?.motDePasse).toBe("victoria-jet-2026")
    const second = await service.creerPremierAdministrateur({ email: "b@exemple.com", nom: "B", motDePasse: "victoria-jet-2027" })
    expect(second).toMatchObject({ ok: false })
    expect((await service.journal()).map((e) => e.action)).toEqual(["compte-cree"])
  })

  it("laisse l'administrateur créer un compte avec un mot de passe provisoire, à changer", async () => {
    const admin = await premierAdmin()
    const r = await service.creerCompte(admin.id, { email: "fondateur@exemple.com", nom: "Fondateur", role: "direction" })
    if (!r.ok) throw new Error(r.message)
    const { profil, motDePasseProvisoire } = r.valeur
    expect(profil).toMatchObject({ role: "direction", actif: true, doitChangerMotDePasse: true })
    expect(erreurMotDePasse(motDePasseProvisoire)).toBeNull()
    expect(identites.get(profil.id)?.motDePasse).toBe(motDePasseProvisoire)

    await service.motDePasseChange(profil.id)
    expect((await service.profil(profil.id))?.doitChangerMotDePasse).toBe(false)
    expect(await service.creerCompte(admin.id, { email: "fondateur@exemple.com", nom: "Autre", role: "direction" })).toMatchObject({
      ok: false,
    })
  })

  it("refuse la gestion des comptes à qui n'est pas administrateur actif", async () => {
    const admin = await premierAdmin()
    const r = await service.creerCompte(admin.id, { email: "rm@exemple.com", nom: "Revenue", role: "revenue" })
    if (!r.ok) throw new Error(r.message)
    const rm = r.valeur.profil
    expect(await service.creerCompte(rm.id, { email: "x@exemple.com", nom: "X", role: "administrateur" })).toMatchObject({ ok: false })
    expect(await service.modifier(rm.id, admin.id, { actif: false })).toMatchObject({ ok: false })
    expect(await service.reinitialiserMotDePasse(rm.id, admin.id)).toMatchObject({ ok: false })
    expect(await service.creerCompte("inconnu", { email: "x@exemple.com", nom: "X", role: "direction" })).toMatchObject({ ok: false })
  })

  it("change un rôle, désactive et réactive un compte, garde toujours un administrateur", async () => {
    const admin = await premierAdmin()
    const r = await service.creerCompte(admin.id, { email: "agent@exemple.com", nom: "Agent", role: "embarquement" })
    if (!r.ok) throw new Error(r.message)
    const agent = r.valeur.profil

    expect(await service.modifier(admin.id, agent.id, { role: "revenue" })).toMatchObject({ ok: true, valeur: { role: "revenue" } })
    expect(await service.modifier(admin.id, agent.id, { actif: false })).toMatchObject({ ok: true, valeur: { actif: false } })
    expect(await service.profilActif(agent.id)).toBeNull()
    expect(await service.modifier(admin.id, agent.id, { actif: true })).toMatchObject({ ok: true })

    // Personne ne se retire ses propres droits ; le dernier administrateur reste.
    expect(await service.modifier(admin.id, admin.id, { role: "direction" })).toMatchObject({ ok: false })
    expect(await service.modifier(admin.id, agent.id, { role: "administrateur" })).toMatchObject({ ok: true })
    expect(await service.modifier(agent.id, admin.id, { role: "direction" })).toMatchObject({ ok: true })
    expect(await service.modifier(admin.id, agent.id, { actif: false })).toMatchObject({ ok: false })
    expect(await service.modifier(agent.id, admin.id, { role: "inconnu" as never })).toMatchObject({ ok: false })

    const actions = (await service.journal()).map((e) => e.action)
    expect(actions).toContain("role-modifie")
    expect(actions).toContain("compte-desactive")
    expect(actions).toContain("compte-reactive")
  })

  it("réinitialise un mot de passe oublié avec un nouveau provisoire", async () => {
    const admin = await premierAdmin()
    const r = await service.creerCompte(admin.id, { email: "d@exemple.com", nom: "Direction", role: "direction" })
    if (!r.ok) throw new Error(r.message)
    await service.motDePasseChange(r.valeur.profil.id)
    const reinit = await service.reinitialiserMotDePasse(admin.id, r.valeur.profil.id)
    if (!reinit.ok) throw new Error(reinit.message)
    expect(identites.get(r.valeur.profil.id)?.motDePasse).toBe(reinit.valeur.motDePasseProvisoire)
    expect((await service.profil(r.valeur.profil.id))?.doitChangerMotDePasse).toBe(true)
  })

  it("valide les saisies", async () => {
    const admin = await premierAdmin()
    expect(await service.creerCompte(admin.id, { email: "pas-une-adresse", nom: "X", role: "direction" })).toMatchObject({ ok: false })
    expect(await service.creerCompte(admin.id, { email: "x@exemple.com", nom: " ", role: "direction" })).toMatchObject({ ok: false })
    expect(await service.creerCompte(admin.id, { email: "x@exemple.com", nom: "X Y", role: "pirate" as never })).toMatchObject({
      ok: false,
    })
  })
})
