/**
 * Repository de la démo : données d'exemple de data/seed, générées une fois en mémoire.
 * Les réservations du visiteur et les réglages du back-office s'y ajouteront (stockage du navigateur).
 */
import { calculerOccupations } from "@/domain/occupation"
import { genererTraversees, jourDeDepart } from "@/domain/programme"
import { appliquerGrille, placesRestantesTraversee } from "@/domain/tarifs"
import type { ClasseReservation, InfoTrafic, Reservation, Traversee } from "@/domain/types"
import type { Seed } from "@/data/seed"
import { genererVentes } from "@/data/seed/ventes"
import type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository"

export interface DonneesDemo {
  traversees: Traversee[]
  classesParTraversee: Map<string, ClasseReservation[]>
  ventes: Reservation[]
}

export function construireDonneesDemo(seed: Seed): DonneesDemo {
  const capacites = new Map(seed.navires.map((n) => [n.id, n.capaciteVendable]))
  const traversees = genererTraversees(seed.regles, seed.config.periode, (id) => capacites.get(id) ?? 0)
  const classesParTraversee = new Map(traversees.map((t) => [t.id, appliquerGrille(t, seed.grille)]))
  const ventes = genererVentes(traversees, classesParTraversee, seed.config.bornesAge, seed.parametresVentes)
  return { traversees, classesParTraversee, ventes }
}

export class DemoRepository implements Repository {
  private cache: DonneesDemo | null = null

  constructor(private readonly seed: Seed) {}

  private donnees(): DonneesDemo {
    if (this.cache === null) this.cache = construireDonneesDemo(this.seed)
    return this.cache
  }

  async getReferentiel(): Promise<Referentiel> {
    const s = this.seed
    return {
      config: s.config,
      ports: s.ports,
      terminaux: s.terminaux,
      lignes: s.lignes,
      navires: s.navires,
      regles: s.regles,
      familles: s.familles,
      options: s.options,
      agences: s.agences,
      textes: s.textes,
    }
  }

  async getInfosTrafic(maintenant: Date): Promise<InfoTrafic[]> {
    const t = maintenant.getTime()
    return this.seed.infosTrafic.filter((i) => i.actif && Date.parse(i.debutAt) <= t && t <= Date.parse(i.finAt))
  }

  async listerTraversees(filtre: FiltreTraversees = {}): Promise<Traversee[]> {
    return this.donnees().traversees.filter((t) => {
      if (filtre.ligneId && t.ligneId !== filtre.ligneId) return false
      const jour = jourDeDepart(t)
      if (filtre.du && jour < filtre.du) return false
      if (filtre.au && jour > filtre.au) return false
      return true
    })
  }

  async getTraversee(id: string): Promise<Traversee | null> {
    return this.donnees().traversees.find((t) => t.id === id) ?? null
  }

  async listerInventaires(traverseeIds: string[], maintenant: Date): Promise<Inventaire[]> {
    const { traversees, classesParTraversee, ventes } = this.donnees()
    const ids = new Set(traverseeIds)
    const occupations = calculerOccupations(
      ventes.filter((v) => ids.has(v.traverseeId)),
      maintenant,
    )
    return traversees
      .filter((t) => ids.has(t.id))
      .map((traversee) => {
        const occupation = occupations.get(traversee.id) ?? { total: 0, parClasse: {} }
        return {
          traversee,
          classes: classesParTraversee.get(traversee.id) ?? [],
          occupation,
          placesRestantes: placesRestantesTraversee(traversee.capaciteVendable, occupation),
        }
      })
  }
}
