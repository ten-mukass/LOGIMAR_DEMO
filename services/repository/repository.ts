/**
 * Accès aux données. Les écrans ne connaissent que cette interface.
 * Démo : DemoRepository (données d'exemple + navigateur). Production : implémentation serveur (PostgreSQL).
 * Toutes les méthodes sont asynchrones pour que le passage au serveur ne change pas les écrans.
 */
import type { ConfigCommerciale } from "@/domain/config"
import type { Occupation } from "@/domain/tarifs"
import type {
  Agence,
  ClasseReservation,
  FamilleTarifaire,
  InfoTrafic,
  Ligne,
  Navire,
  OptionCatalogue,
  Port,
  RegleProgramme,
  Terminal,
  Traversee,
} from "@/domain/types"

export interface Referentiel {
  config: ConfigCommerciale
  ports: Port[]
  terminaux: Terminal[]
  lignes: Ligne[]
  navires: Navire[]
  /** Programme type (affiché sur la page Horaires). */
  regles: RegleProgramme[]
  familles: FamilleTarifaire[]
  options: OptionCatalogue[]
  agences: Agence[]
  textes: { regleEnregistrement: string }
}

export interface FiltreTraversees {
  ligneId?: string
  /** Jour de départ minimal (AAAA-MM-JJ, inclus). */
  du?: string
  /** Jour de départ maximal (inclus). */
  au?: string
}

/** État des ventes d'une traversée à un instant donné. */
export interface Inventaire {
  traversee: Traversee
  classes: ClasseReservation[]
  occupation: Occupation
  placesRestantes: number
}

export interface Repository {
  getReferentiel(): Promise<Referentiel>
  /** Messages d'info trafic actifs à cet instant. */
  getInfosTrafic(maintenant: Date): Promise<InfoTrafic[]>
  listerTraversees(filtre?: FiltreTraversees): Promise<Traversee[]>
  getTraversee(id: string): Promise<Traversee | null>
  listerInventaires(traverseeIds: string[], maintenant: Date): Promise<Inventaire[]>
}
