/**
 * Back-office : lecture groupée des ventes et réglage des paliers.
 * En production, ce service tourne côté serveur (requêtes agrégées, journal d'audit, utilisateur connecté).
 */
import type { ParametresGestion } from "@/domain/config"
import {
  alertesTraversee,
  calculerIndicateurs,
  courbeReference,
  ecartAReference,
  grouperParTraversee,
  pickUp,
  type Alerte,
  type CourbeReference,
  type Indicateurs,
} from "@/domain/indicateurs"
import { estBlocageActif, placesReservation } from "@/domain/occupation"
import { nombrePaliersFermes, paliersEnVente, verifierChangementPalier } from "@/domain/paliers"
import { estOuverteALaVente, statutEffectif } from "@/domain/programme"
import type { ChangementPalier, ClasseReservation, CodeFamille, Reservation, StatutTraversee, Traversee } from "@/domain/types"
import type { Inventaire, Referentiel, Repository } from "../repository/repository"

export interface EtatVentes {
  /** Instant de la lecture : tous les calculs de l'écran se font à cet instant. */
  maintenant: Date
  referentiel: Referentiel
  parametres: ParametresGestion
  traversees: Traversee[]
  inventaires: Map<string, Inventaire>
  /** Toutes les réservations qui comptent à cet instant (même source que le site client). */
  reservations: Reservation[]
  /** Identifiants des réservations faites sur ce navigateur (démo). */
  locales: Set<string>
  changements: ChangementPalier[]
}

export type ResultatGestion = { ok: true } | { ok: false; message: string }

export class ServiceGestion {
  constructor(
    private readonly d: { repository: Repository; horloge: () => Date; genererId: () => string; auteur: string },
  ) {}

  /** Tout ce qu'il faut aux écrans du back-office, en une lecture. */
  async etatVentes(maintenant: Date, traverseeIds?: string[]): Promise<EtatVentes> {
    const { repository } = this.d
    const [referentiel, parametres, toutes, locales] = await Promise.all([
      repository.getReferentiel(),
      repository.getParametresGestion(),
      repository.listerTraversees(),
      repository.listerReservationsLocales(),
    ])
    const traversees = traverseeIds ? toutes.filter((t) => traverseeIds.includes(t.id)) : toutes
    const ids = traversees.map((t) => t.id)
    const [inventaires, reservations, changements] = await Promise.all([
      repository.listerInventaires(ids, maintenant),
      repository.listerReservations(maintenant, traverseeIds ? { traverseeIds: ids } : {}),
      repository.listerChangementsPaliers(),
    ])
    return {
      maintenant,
      referentiel,
      parametres,
      traversees,
      inventaires: new Map(inventaires.map((i) => [i.traversee.id, i])),
      reservations,
      locales: new Set(locales.map((r) => r.id)),
      changements: changements.filter((c) => ids.includes(c.traverseeId)),
    }
  }

  /** Ouvre ou ferme un palier, avec un motif ; le prix affiché côté client change aussitôt. */
  async changerPalier(traverseeId: string, classeId: string, ouverte: boolean, motif: string): Promise<ResultatGestion> {
    const { repository, horloge } = this.d
    const maintenant = horloge()
    const [inventaire] = await repository.listerInventaires([traverseeId], maintenant)
    if (!inventaire) return { ok: false, message: "Traversée introuvable." }
    const refus = verifierChangementPalier(inventaire.classes, classeId, ouverte, motif)
    if (refus) return { ok: false, message: refus }
    await repository.enregistrerChangementPalier({
      id: this.d.genererId(),
      traverseeId,
      classeId,
      ouverte,
      motif: motif.trim(),
      auteur: this.d.auteur,
      le: maintenant.toISOString(),
    })
    return { ok: true }
  }
}

export interface SyntheseTraversee {
  traversee: Traversee
  inventaire: Inventaire
  statut: StatutTraversee
  ouverteALaVente: boolean
  indicateurs: Indicateurs
  /** Places bloquées par un paiement en cours. */
  placesBloquees: number
  enVente: Record<CodeFamille, ClasseReservation | null>
  /** Places vendues pendant les N derniers jours, pour chaque N de parametres.joursPickUp. */
  pickUp: Record<number, number>
  /** Écart à la courbe de référence du même sens (null sans référence). */
  ecart: number | null
  alertes: Alerte[]
  paliersFermes: number
}

/** Courbe de référence de chaque sens : moyenne des traversées déjà parties (null si trop peu). */
export function referencesParLigne(etat: EtatVentes, parTraversee = grouperParTraversee(etat.reservations)): Map<string, CourbeReference | null> {
  const { parametres, maintenant } = etat
  return new Map(
    etat.referentiel.lignes.map((l) => [
      l.id,
      courbeReference(
        etat.traversees.filter((t) => t.ligneId === l.id),
        parTraversee,
        maintenant,
        parametres.joursCourbe,
        parametres.traverseesMinReference,
      ),
    ]),
  )
}

/** Une ligne de synthèse par traversée (tableau de bord, liste des traversées, fiche). */
export function syntheseTraversees(etat: EtatVentes): SyntheseTraversee[] {
  const { parametres, maintenant, referentiel } = etat
  const parTraversee = grouperParTraversee(etat.reservations)
  const references = referencesParLigne(etat, parTraversee)
  const resultat: SyntheseTraversee[] = []
  for (const traversee of etat.traversees) {
    const inventaire = etat.inventaires.get(traversee.id)
    if (!inventaire) continue
    const reservations = parTraversee.get(traversee.id) ?? []
    const indicateurs = calculerIndicateurs([traversee], reservations, maintenant)
    const statut = statutEffectif(traversee, maintenant)
    const ecart =
      statut === "partie" ? null : ecartAReference(traversee, indicateurs.places, references.get(traversee.ligneId) ?? null, maintenant)
    const paliersFermes = nombrePaliersFermes(inventaire.classes)
    resultat.push({
      traversee,
      inventaire,
      statut,
      ouverteALaVente: estOuverteALaVente(traversee, maintenant, referentiel.config.ventesEnLigneJusqua),
      indicateurs,
      placesBloquees: reservations
        .filter((r) => estBlocageActif(r, maintenant))
        .reduce((s, r) => s + placesReservation(r), 0),
      enVente: paliersEnVente(inventaire.classes, traversee.capaciteVendable, inventaire.occupation),
      pickUp: Object.fromEntries(
        [...new Set([...parametres.joursPickUp, parametres.joursPickUpPrincipal])].map((j) => [j, pickUp(reservations, maintenant, j)]),
      ),
      ecart,
      alertes:
        statut === "partie"
          ? []
          : alertesTraversee(
              { placesOccupees: inventaire.occupation.total, capacite: traversee.capaciteVendable, ecart, paliersFermes },
              { presquePlein: parametres.seuilPresquePlein, ecartReference: parametres.seuilEcartReference },
            ),
      paliersFermes,
    })
  }
  return resultat
}
