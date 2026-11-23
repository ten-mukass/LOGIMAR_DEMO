/**
 * Choix des implémentations : seul endroit à modifier pour passer de la démo à la production
 * (PostgreSQL, AirtelMoneyProvider, MoovMoneyProvider, côté serveur).
 *
 * Étape 7B : quand les données sont en base (services/mode-donnees.ts), le parcours client passe par le
 * serveur (RepositoryDistant, ServiceReservationDistant) ; comptes clients, back-office et embarquement
 * restent sur la démo du navigateur jusqu'aux étapes C et D.
 */
import { seed } from "@/data/seed"
import type { Operateur, PaymentProvider } from "./paiement/payment-provider"
import { SimulatedProvider } from "./paiement/simulated-provider"
import { DemoRepository } from "./repository/demo-repository"
import type { Repository } from "./repository/repository"
import { LocalAuthService } from "./auth/local-auth-service"
import { ServiceBillets } from "./billets/service-billets"
import { ServiceEmbarquement } from "./embarquement/service-embarquement"
import { CodeDemoAccesGestion, type AccesGestion } from "./gestion/acces-gestion"
import { ServiceGestion } from "./gestion/service-gestion"
import { maintenant } from "./horloge"
import { PreviewNotificationService } from "./notification/preview-notification-service"
import { donneesEnBase } from "./mode-donnees"
import { RepositoryDistant } from "./repository/repository-distant"
import { ServiceReservation } from "./reservation/service-reservation"
import { ServiceReservationDistant, type ParcoursReservation } from "./reservation/service-reservation-distant"
import { stockageNavigateur } from "./stockage"

const stockage = stockageNavigateur()

/** Données de la démo dans le navigateur (tout le site en mode démo ; comptes, gestion et scan en mode base). */
const repositoryLocal = new DemoRepository(seed, stockage)
const distant = donneesEnBase ? new RepositoryDistant(repositoryLocal, stockage) : null

/** Back-office et embarquement : sur la démo du navigateur jusqu'à l'étape D. */
export const repositoryGestion: Repository = repositoryLocal

/** Repository du site client. */
export const repository: Repository = distant ?? repositoryLocal

function aleatoireCrypto(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

function operateurSimule(code: Operateur): PaymentProvider {
  return new SimulatedProvider(code, {
    ...seed.paiementSimule,
    stockage,
    horloge: maintenant,
    // Le « webhook » de la démo : l'opérateur simulé rappelle directement le service.
    envoyerCallback: (operateur, contenu) => {
      void serviceReservationLocal.traiterCallback(operateur, contenu)
    },
    planifier: (action, delaiMs) => {
      setTimeout(action, delaiMs)
    },
  })
}

const genererId = () => crypto.randomUUID()

export const notifications = new PreviewNotificationService(repository, maintenant, genererId)

const serviceReservationLocal = new ServiceReservation({
  repository: repositoryLocal,
  operateurs: { airtel: operateurSimule("airtel"), moov: operateurSimule("moov") },
  notifications,
  horloge: maintenant,
  aleatoire: aleatoireCrypto,
  genererId,
})

export const serviceReservation: ParcoursReservation = distant ? new ServiceReservationDistant(distant) : serviceReservationLocal

export const auth = new LocalAuthService({
  repository,
  notifications,
  stockage,
  horloge: maintenant,
  aleatoire: aleatoireCrypto,
  genererId,
})

export const billets = new ServiceBillets({
  repository,
  auth,
  stockage,
  trouver: distant ? (reference, contact) => distant.rechercherBillet(reference, contact) : undefined,
})

/** Back-office : accès par code de démonstration, lecture des ventes et réglage des paliers. */
export const accesGestion: AccesGestion = new CodeDemoAccesGestion({
  code: seed.gestion.codeAccesDemo,
  dureeHeures: seed.gestion.dureeSessionHeures,
  stockage,
  horloge: maintenant,
})

export const serviceGestion = new ServiceGestion({ repository: repositoryLocal, horloge: maintenant, genererId, auteur: seed.gestion.auteurDemo })

/** Embarquement : contrôle des billets à la passerelle et manifeste de bord. */
export const serviceEmbarquement = new ServiceEmbarquement({
  repository: repositoryLocal,
  horloge: maintenant,
  genererId,
  cleSignature: seed.cleSignatureBilletDemo,
  agent: seed.gestion.auteurDemo,
})

/** Clé de signature des QR codes (démo : publique ; production : signature côté serveur). */
export const cleSignatureBillet = seed.cleSignatureBilletDemo

export { donneesEnBase } from "./mode-donnees"
export type { ParcoursReservation } from "./reservation/service-reservation-distant"
export type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository/repository"
export type { CommandeDetaillee, DemandeBlocage, Resultat } from "./reservation/service-reservation"
export type { EtatSession } from "./auth/auth-service"
export type { EtatVentes, ResultatGestion } from "./gestion/service-gestion"
export type { EtatEmbarquement, ResultatControleBillet } from "./embarquement/service-embarquement"
