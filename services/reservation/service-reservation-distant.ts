/**
 * Parcours de réservation vu du navigateur quand les données sont en base (étape 7B) : chaque étape est une
 * action serveur ; prix, places, blocage, émission et facture sont décidés sur le serveur.
 * Les réservations reçues sont retenues sur l'appareil (billets consultables ici).
 */
import type { LigneOption, Paiement } from "@/domain/types"
import type { Operateur } from "../paiement/payment-provider"
import * as actions from "../serveur/actions-site"
import type { RepositoryDistant } from "../repository/repository-distant"
import type { CommandeDetaillee, DemandeBlocage, Resultat, ServiceReservation } from "./service-reservation"

/** Ce que les écrans utilisent du service de réservation, en démo comme en base. */
export type ParcoursReservation = Pick<ServiceReservation, "bloquer" | "lireCommande" | "liberer" | "payer" | "verifierPaiement">

export class ServiceReservationDistant implements ParcoursReservation {
  constructor(private readonly repository: RepositoryDistant) {}

  async bloquer(demande: DemandeBlocage): Promise<Resultat<CommandeDetaillee & { prixModifie: boolean }>> {
    const resultat = await actions.bloquerPlaces(demande)
    if (resultat.ok) this.repository.memoriser(resultat.valeur.reservations)
    return resultat
  }

  async lireCommande(id: string): Promise<CommandeDetaillee | null> {
    const detail = await actions.lireCommandeDetaillee(id)
    if (detail) this.repository.memoriser(detail.reservations)
    return detail
  }

  liberer(commandeId: string): Promise<void> {
    return actions.libererPlaces(commandeId)
  }

  payer(
    commandeId: string,
    saisie: { operateur: Operateur; numero: string; options: Partial<Record<LigneOption["code"], number>> },
  ): Promise<Resultat<Paiement>> {
    return actions.demanderPaiement(commandeId, saisie)
  }

  verifierPaiement(paiementId: string): Promise<Paiement | null> {
    return actions.suivrePaiement(paiementId)
  }
}
