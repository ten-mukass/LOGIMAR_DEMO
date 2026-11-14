/**
 * Repository de la démo : données d'exemple de data/seed, générées une fois en mémoire,
 * plus les réservations et paiements du visiteur, conservés dans le navigateur.
 */
import { compositionDe, occupationAvecPriorite, occupeDesPlaces } from "@/domain/occupation"
import { genererTraversees, jourDeDepart } from "@/domain/programme"
import { appliquerGrille, placesNecessaires, placesRestantesTraversee, type Occupation } from "@/domain/tarifs"
import type {
  ClasseReservation,
  CodeFamille,
  InfoTrafic,
  Paiement,
  Reservation,
  Traversee,
} from "@/domain/types"
import type { Seed } from "@/data/seed"
import { genererVentes } from "@/data/seed/ventes"
import { lireJson, stockageMemoire, type Stockage } from "../stockage"
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

/** Données du visiteur conservées dans le navigateur. */
interface DonneesLocales {
  version: 1
  reservations: Reservation[]
  paiements: Paiement[]
}

const CLE = "logimar-demo:v1:donnees"
const VIDE: DonneesLocales = { version: 1, reservations: [], paiements: [] }

export class DemoRepository implements Repository {
  private cache: DonneesDemo | null = null

  constructor(
    private readonly seed: Seed,
    private readonly stockage: Stockage = stockageMemoire(),
  ) {}

  private donnees(): DonneesDemo {
    if (this.cache === null) this.cache = construireDonneesDemo(this.seed)
    return this.cache
  }

  private locales(): DonneesLocales {
    const d = lireJson<DonneesLocales>(this.stockage, CLE, VIDE)
    return d.version === 1 && Array.isArray(d.reservations) && Array.isArray(d.paiements) ? d : VIDE
  }

  private sauver(d: DonneesLocales): void {
    this.stockage.ecrire(CLE, JSON.stringify(d))
  }

  /** Occupation d'une traversée : réservations du visiteur d'abord, puis ventes d'exemple qui tiennent encore. */
  private occupation(traversee: Traversee, locales: Reservation[], maintenant: Date): { occupation: Occupation; ventes: Reservation[] } {
    const classes = this.donnees().classesParTraversee.get(traversee.id) ?? []
    const quotas = new Map(classes.map((c) => [c.id, c.quota]))
    const { occupation, secondairesRetenues } = occupationAvecPriorite(
      locales.filter((r) => r.traverseeId === traversee.id),
      this.donnees().ventes.filter((r) => r.traverseeId === traversee.id),
      traversee.capaciteVendable,
      quotas,
      maintenant,
    )
    return { occupation, ventes: secondairesRetenues }
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
      operateurs: s.operateurs.filter((o) => s.config.moyensPaiementActifs[o.code]),
      textes: s.textes,
      paiementSimule: s.paiementSimule,
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
    const ids = new Set(traverseeIds)
    const locales = this.locales().reservations
    return this.donnees()
      .traversees.filter((t) => ids.has(t.id))
      .map((traversee) => {
        const { occupation } = this.occupation(traversee, locales, maintenant)
        return {
          traversee,
          classes: this.donnees().classesParTraversee.get(traversee.id) ?? [],
          occupation,
          placesRestantes: placesRestantesTraversee(traversee.capaciteVendable, occupation),
        }
      })
  }

  async repartitionParFamille(maintenant: Date): Promise<Record<CodeFamille, number>> {
    const repartition: Record<CodeFamille, number> = { ECO: 0, STD: 0, FLEX: 0 }
    const vendues = [...this.donnees().ventes, ...this.locales().reservations].filter(
      (r) => r.statut !== "bloquee" && occupeDesPlaces(r, maintenant),
    )
    for (const r of vendues) repartition[r.familleCode] += placesNecessaires(compositionDe(r.passagers))
    return repartition
  }

  async getReservation(id: string): Promise<Reservation | null> {
    return (
      this.locales().reservations.find((r) => r.id === id) ??
      this.donnees().ventes.find((r) => r.id === id) ??
      null
    )
  }

  async trouverReservationParReference(reference: string): Promise<Reservation | null> {
    return (
      this.locales().reservations.find((r) => r.reference === reference) ??
      this.donnees().ventes.find((r) => r.reference === reference) ??
      null
    )
  }

  async referenceExiste(reference: string): Promise<boolean> {
    return (await this.trouverReservationParReference(reference)) !== null
  }

  async enregistrerReservation(reservation: Reservation): Promise<void> {
    const d = this.locales()
    const autres = d.reservations.filter((r) => r.id !== reservation.id)
    this.sauver({ ...d, reservations: [...autres, reservation] })
  }

  async getPaiement(id: string): Promise<Paiement | null> {
    return this.locales().paiements.find((p) => p.id === id) ?? null
  }

  async trouverPaiementParTransaction(refTransaction: string): Promise<Paiement | null> {
    return this.locales().paiements.find((p) => p.refTransaction === refTransaction) ?? null
  }

  async enregistrerPaiement(paiement: Paiement): Promise<void> {
    const d = this.locales()
    const autres = d.paiements.filter((p) => p.id !== paiement.id)
    this.sauver({ ...d, paiements: [...autres, paiement] })
  }
}
