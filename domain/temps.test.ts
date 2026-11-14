import { describe, expect, it } from "vitest"
import {
  ajouterJours,
  dureeMinutes,
  ecartJours,
  estJour,
  formatDuree,
  formatJourCourt,
  formatJourLong,
  formatMoisAnnee,
  formatMoisCourt,
  heureLocale,
  instant,
  jourLocal,
  jourSemaine,
} from "./temps"

describe("jours", () => {
  it("reconnaît les dates valides", () => {
    expect(estJour("2026-11-17")).toBe(true)
    expect(estJour("2026-02-30")).toBe(false)
    expect(estJour("17/11/2026")).toBe(false)
  })

  it("ajoute des jours en passant les mois et les années", () => {
    expect(ajouterJours("2026-12-30", 3)).toBe("2027-01-02")
    expect(ecartJours("2026-11-14", "2026-11-24")).toBe(10)
  })

  it("le 17 novembre 2026 est un mardi", () => {
    expect(jourSemaine("2026-11-17")).toBe(2)
  })
})

describe("heures du Gabon", () => {
  it("construit un instant à UTC+1", () => {
    expect(instant("2026-11-17", "12:15")).toBe("2026-11-17T12:15:00+01:00")
  })

  it("affiche l'heure locale quel que soit le fuseau de l'appareil", () => {
    expect(heureLocale("2026-11-17T11:15:00Z")).toBe("12:15")
    expect(jourLocal("2026-11-17T23:30:00Z")).toBe("2026-11-18")
  })
})

describe("durées", () => {
  it("calcule la durée au lieu de la saisir", () => {
    expect(dureeMinutes("2026-11-17T12:15:00+01:00", "2026-11-17T15:45:00+01:00")).toBe(210)
    expect(dureeMinutes("2026-11-17T07:25:00+01:00", "2026-11-17T11:00:00+01:00")).toBe(215)
  })

  it("formate les durées", () => {
    expect(formatDuree(210)).toBe("3 h 30")
    expect(formatDuree(215)).toBe("3 h 35")
    expect(formatDuree(180)).toBe("3 h")
    expect(formatDuree(45)).toBe("45 min")
    expect(formatDuree(65)).toBe("1 h 05")
  })
})

describe("libellés de dates", () => {
  it("formate en français", () => {
    expect(formatJourCourt("2026-11-17")).toBe("Mar. 17 nov.")
    expect(formatJourLong("2026-11-17")).toBe("Mardi 17 novembre")
    expect(formatJourLong("2027-01-03", true)).toBe("Dimanche 3 janvier 2027")
    expect(formatMoisAnnee(2026, 11)).toBe("Novembre 2026")
    expect(formatMoisCourt("2026-11-17")).toBe("nov.")
  })
})
