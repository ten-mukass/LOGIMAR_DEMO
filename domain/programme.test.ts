import { describe, expect, it } from "vitest"
import {
  dureeTraversee,
  dureeTypeMinutes,
  estOuverteALaVente,
  genererTraversees,
  joursDesTraversees,
  joursOuvertsALaVente,
  statutEffectif,
  trouverLigne,
} from "./programme"
import { jourSemaine } from "./temps"
import type { RegleProgramme } from "./types"

const regles: RegleProgramme[] = [
  {
    ligneId: "LBV-POG",
    navireId: "N1",
    terminalDepartId: "A",
    terminalArriveeId: "B",
    joursSemaine: [2, 5, 0],
    enregistrement: "09:30",
    depart: "12:15",
    arrivee: "15:45",
    fermetureEnregistrement: null,
  },
  {
    ligneId: "POG-LBV",
    navireId: "N1",
    terminalDepartId: "B",
    terminalArriveeId: "A",
    joursSemaine: [2, 5, 0],
    enregistrement: "05:25",
    depart: "07:25",
    arrivee: "11:00",
    fermetureEnregistrement: null,
  },
]

const traversees = genererTraversees(regles, { du: "2026-11-01", au: "2026-11-30" }, () => 150)

describe("genererTraversees", () => {
  it("ne crée des traversées que les mardis, vendredis et dimanches", () => {
    const jours = joursDesTraversees(traversees)
    expect(jours).toEqual([
      "2026-11-01", "2026-11-03", "2026-11-06", "2026-11-08", "2026-11-10", "2026-11-13", "2026-11-15",
      "2026-11-17", "2026-11-20", "2026-11-22", "2026-11-24", "2026-11-27", "2026-11-29",
    ])
    expect(jours.every((j) => [0, 2, 5].includes(jourSemaine(j)))).toBe(true)
  })

  it("crée une traversée par règle et par jour, triées par heure de départ", () => {
    expect(traversees).toHaveLength(26)
    expect(traversees[0].id).toBe("POG-LBV-2026-11-01-0725")
    expect(traversees[1].id).toBe("LBV-POG-2026-11-01-1215")
  })

  it("reprend les horaires et calcule la durée", () => {
    const t = traversees.find((x) => x.id === "LBV-POG-2026-11-17-1215")
    expect(t?.enregistrementOuvertureAt).toBe("2026-11-17T09:30:00+01:00")
    expect(t && dureeTraversee(t)).toBe(210)
    expect(t?.capaciteVendable).toBe(150)
  })

  it("place l'arrivée le lendemain si elle précède le départ", () => {
    const [nuit] = genererTraversees(
      [{ ...regles[0], joursSemaine: [2], depart: "22:00", arrivee: "01:30" }],
      { du: "2026-11-17", au: "2026-11-17" },
      () => 150,
    )
    expect(nuit.arriveeAt).toBe("2026-11-18T01:30:00+01:00")
  })
})

describe("état d'une traversée", () => {
  const t = traversees.find((x) => x.id === "LBV-POG-2026-11-17-1215")!

  it("la vente en ligne ferme à l'ouverture de l'enregistrement", () => {
    expect(estOuverteALaVente(t, new Date("2026-11-17T09:29:00+01:00"), "ouverture-enregistrement")).toBe(true)
    expect(estOuverteALaVente(t, new Date("2026-11-17T09:30:00+01:00"), "ouverture-enregistrement")).toBe(false)
    expect(estOuverteALaVente(t, new Date("2026-11-17T12:00:00+01:00"), "depart")).toBe(true)
  })

  it("une traversée partie est marquée comme telle", () => {
    expect(statutEffectif(t, new Date("2026-11-17T12:15:00+01:00"))).toBe("partie")
    expect(statutEffectif(t, new Date("2026-11-16T12:00:00+01:00"))).toBe("ouverte")
    expect(statutEffectif({ ...t, statut: "annulee" }, new Date("2026-11-18T00:00:00+01:00"))).toBe("annulee")
  })
})

describe("outils du programme", () => {
  it("donne les jours encore ouverts à la vente pour une ligne", () => {
    const jours = joursOuvertsALaVente(traversees, "LBV-POG", new Date("2026-11-17T10:00:00+01:00"), "ouverture-enregistrement")
    expect(jours[0]).toBe("2026-11-20")
    const avant = joursOuvertsALaVente(traversees, "LBV-POG", new Date("2026-11-17T09:00:00+01:00"), "ouverture-enregistrement")
    expect(avant[0]).toBe("2026-11-17")
  })

  it("arrondit la durée type au quart d'heure", () => {
    expect(dureeTypeMinutes(regles)).toBe(210)
  })

  it("retrouve la ligne entre deux ports", () => {
    const lignes = [
      { id: "LBV-POG", portDepartId: "p1", portArriveeId: "p2" },
      { id: "POG-LBV", portDepartId: "p2", portArriveeId: "p1" },
    ]
    const ports = [
      { id: "p1", code: "LBV" as const, nom: "Libreville", ville: "Libreville" },
      { id: "p2", code: "POG" as const, nom: "Port-Gentil", ville: "Port-Gentil" },
    ]
    expect(trouverLigne(lignes, ports, "POG", "LBV")?.id).toBe("POG-LBV")
  })
})
