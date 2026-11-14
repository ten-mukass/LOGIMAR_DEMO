/**
 * Programme des traversées : génération à partir de règles, et état d'une traversée à un instant.
 */
import { ajouterJours, dureeMinutes, instant, jourLocal, jourSemaine, joursEntre } from "./temps"
import type { CodePort, Ligne, Periode, Port, RegleProgramme, StatutTraversee, Traversee } from "./types"

/** Identifiant lisible : « LBV-POG-2026-11-17-1215 ». */
export function idTraversee(ligneId: string, jour: string, heureDepart: string): string {
  return `${ligneId}-${jour}-${heureDepart.replace(":", "")}`
}

/**
 * Crée une traversée par règle et par jour de la période dont le jour de semaine figure dans la règle.
 * Si l'heure d'arrivée est avant l'heure de départ, l'arrivée est le lendemain.
 */
export function genererTraversees(
  regles: RegleProgramme[],
  periode: Periode,
  capaciteVendable: (navireId: string) => number,
): Traversee[] {
  const traversees: Traversee[] = []
  for (const jour of joursEntre(periode.du, periode.au)) {
    for (const regle of regles) {
      if (!regle.joursSemaine.includes(jourSemaine(jour))) continue
      const departAt = instant(jour, regle.depart)
      let arriveeAt = instant(jour, regle.arrivee)
      if (Date.parse(arriveeAt) <= Date.parse(departAt)) arriveeAt = instant(ajouterJours(jour, 1), regle.arrivee)
      traversees.push({
        id: idTraversee(regle.ligneId, jour, regle.depart),
        ligneId: regle.ligneId,
        navireId: regle.navireId,
        terminalDepartId: regle.terminalDepartId,
        terminalArriveeId: regle.terminalArriveeId,
        departAt,
        arriveeAt,
        enregistrementOuvertureAt: instant(jour, regle.enregistrement),
        enregistrementFermetureAt: regle.fermetureEnregistrement ? instant(jour, regle.fermetureEnregistrement) : null,
        statut: "ouverte",
        capaciteVendable: capaciteVendable(regle.navireId),
      })
    }
  }
  return traversees.sort((a, b) => Date.parse(a.departAt) - Date.parse(b.departAt))
}

/** Jusqu'à quand la vente en ligne reste ouverte. */
export type ClotureVentes = "ouverture-enregistrement" | "depart"

export function finDesVentes(traversee: Traversee, cloture: ClotureVentes): string {
  return cloture === "depart" ? traversee.departAt : traversee.enregistrementOuvertureAt
}

export function estOuverteALaVente(traversee: Traversee, maintenant: Date, cloture: ClotureVentes): boolean {
  return traversee.statut === "ouverte" && maintenant.getTime() < Date.parse(finDesVentes(traversee, cloture))
}

/** Statut affiché : une traversée dont l'heure de départ est passée est « partie ». */
export function statutEffectif(traversee: Traversee, maintenant: Date): StatutTraversee {
  if (traversee.statut === "annulee") return "annulee"
  if (maintenant.getTime() >= Date.parse(traversee.departAt)) return "partie"
  return traversee.statut
}

export function dureeTraversee(traversee: Traversee): number {
  return dureeMinutes(traversee.departAt, traversee.arriveeAt)
}

export function jourDeDepart(traversee: Traversee): string {
  return jourLocal(traversee.departAt)
}

/** Jours (triés, sans doublon) ayant au moins une traversée de la liste. */
export function joursDesTraversees(traversees: Traversee[]): string[] {
  return [...new Set(traversees.map(jourDeDepart))].sort()
}

/** Jours où au moins une traversée de la ligne est encore ouverte à la vente. */
export function joursOuvertsALaVente(
  traversees: Traversee[],
  ligneId: string,
  maintenant: Date,
  cloture: ClotureVentes,
): string[] {
  return joursDesTraversees(
    traversees.filter((t) => t.ligneId === ligneId && estOuverteALaVente(t, maintenant, cloture)),
  )
}

/** Durée type d'une traversée, arrondie au quart d'heure (« environ 3 h 30 »). */
export function dureeTypeMinutes(regles: RegleProgramme[]): number {
  if (regles.length === 0) return 0
  const durees = regles.map((r) => {
    const d = dureeMinutes(instant("2000-01-01", r.depart), instant("2000-01-01", r.arrivee))
    return d > 0 ? d : d + 24 * 60
  })
  const moyenne = durees.reduce((s, d) => s + d, 0) / durees.length
  return Math.round(moyenne / 15) * 15
}

/** Ligne reliant deux ports, d'après leurs codes. */
export function trouverLigne(
  lignes: Ligne[],
  ports: Port[],
  depart: CodePort,
  arrivee: CodePort,
): Ligne | undefined {
  const id = (code: CodePort) => ports.find((p) => p.code === code)?.id
  return lignes.find((l) => l.portDepartId === id(depart) && l.portArriveeId === id(arrivee))
}
