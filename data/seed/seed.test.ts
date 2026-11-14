import { describe, expect, it } from "vitest"
import { calculerOccupations, placesReservation } from "@/domain/occupation"
import { categorieSelonAge } from "@/domain/passagers"
import { estReferenceValide } from "@/domain/reference"
import { verifierGrille } from "@/domain/tarifs"
import { jourLocal } from "@/domain/temps"
import { construireDonneesDemo, DemoRepository } from "@/services/repository/demo-repository"
import { seed } from "./index"

const debut = performance.now()
const donnees = construireDonneesDemo(seed)
const dureeGeneration = performance.now() - debut
const finPeriode = new Date("2027-02-01T00:00:00+01:00")

describe("données d'exemple", () => {
  it("la grille d'exemple est cohérente", () => {
    expect(verifierGrille(seed.grille)).toEqual([])
  })

  it("couvre novembre 2026 à janvier 2027, deux traversées par jour de traversée", () => {
    expect(donnees.traversees).toHaveLength(80)
    expect(jourLocal(donnees.traversees[0].departAt)).toBe("2026-11-01")
    expect(jourLocal(donnees.traversees.at(-1)!.departAt)).toBe("2027-01-31")
  })

  it("se génère vite et à l'identique", () => {
    expect(dureeGeneration).toBeLessThan(500)
    const bis = construireDonneesDemo(seed)
    expect(bis.ventes.length).toBe(donnees.ventes.length)
    expect(bis.ventes[123]).toEqual(donnees.ventes[123])
  })

  it("ne dépasse jamais la capacité ni les quotas des paliers", () => {
    const occupations = calculerOccupations(donnees.ventes, finPeriode)
    for (const t of donnees.traversees) {
      const occ = occupations.get(t.id) ?? { total: 0, parClasse: {} }
      expect(occ.total).toBeLessThanOrEqual(t.capaciteVendable)
      for (const c of donnees.classesParTraversee.get(t.id) ?? []) {
        if (c.quota !== null) expect(occ.parClasse[c.id] ?? 0).toBeLessThanOrEqual(c.quota)
      }
    }
  })

  it("remplit complètement les traversées marquées complètes", () => {
    const occupations = calculerOccupations(donnees.ventes, finPeriode)
    for (const id of seed.parametresVentes.completes) {
      const t = donnees.traversees.find((x) => x.id === id)!
      expect(occupations.get(id)?.total).toBe(t.capaciteVendable)
    }
  })

  it("a des remplissages variés", () => {
    const occupations = calculerOccupations(donnees.ventes, finPeriode)
    const taux = donnees.traversees.map((t) => (occupations.get(t.id)?.total ?? 0) / t.capaciteVendable)
    expect(Math.min(...taux)).toBeLessThan(0.5)
    expect(Math.max(...taux)).toBe(1)
  })

  it("produit des réservations valides", () => {
    const references = new Set<string>()
    const traversees = new Map(donnees.traversees.map((t) => [t.id, t]))
    for (const r of donnees.ventes) {
      expect(estReferenceValide(r.reference)).toBe(true)
      references.add(r.reference)
      expect(r.telephone !== null || r.email !== null).toBe(true)
      expect(r.passagers.some((p) => p.categorie === "adulte")).toBe(true)
      expect(placesReservation(r)).toBeGreaterThan(0)
      const t = traversees.get(r.traverseeId)!
      expect(Date.parse(r.creeLe)).toBeLessThan(Date.parse(t.departAt))
      for (const p of r.passagers) {
        if (p.dateNaissance) {
          expect(categorieSelonAge(p.dateNaissance, jourLocal(t.departAt), seed.config.bornesAge)).toBe(p.categorie)
        } else {
          expect(p.categorie).toBe("adulte")
        }
      }
    }
    expect(references.size).toBe(donnees.ventes.length)
  })
})

describe("DemoRepository", () => {
  const repo = new DemoRepository(seed)

  it("filtre les traversées par ligne et par période", async () => {
    const t = await repo.listerTraversees({ ligneId: "LBV-POG", du: "2026-11-15", au: "2026-11-24" })
    expect(t.map((x) => x.id)).toEqual([
      "LBV-POG-2026-11-15-1215",
      "LBV-POG-2026-11-17-1215",
      "LBV-POG-2026-11-20-1215",
      "LBV-POG-2026-11-22-1215",
      "LBV-POG-2026-11-24-1215",
    ])
  })

  it("donne l'inventaire à un instant : la traversée du 24 novembre est complète le 14", async () => {
    const [inv] = await repo.listerInventaires(["LBV-POG-2026-11-24-1215"], new Date("2026-11-14T12:00:00+01:00"))
    expect(inv.placesRestantes).toBe(0)
    expect(inv.classes).toHaveLength(seed.grille.length)
  })

  it("ne renvoie que les infos trafic actives", async () => {
    expect(await repo.getInfosTrafic(new Date("2026-11-14T12:00:00+01:00"))).toHaveLength(1)
    expect(await repo.getInfosTrafic(new Date("2027-03-01T12:00:00+01:00"))).toHaveLength(0)
  })
})
