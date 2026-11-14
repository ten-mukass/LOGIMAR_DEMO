/**
 * Choix des implémentations : seul endroit à modifier pour passer de la démo à la production
 * (PostgreSQL, AirtelMoneyProvider, MoovMoneyProvider, côté serveur).
 */
import { seed } from "@/data/seed"
import type { Operateur, PaymentProvider } from "./paiement/payment-provider"
import { SimulatedProvider } from "./paiement/simulated-provider"
import { DemoRepository } from "./repository/demo-repository"
import type { Repository } from "./repository/repository"
import { LocalAuthService } from "./auth/local-auth-service"
import { ServiceBillets } from "./billets/service-billets"
import { CodeDemoAccesGestion, type AccesGestion } from "./gestion/acces-gestion"
import { ServiceGestion } from "./gestion/service-gestion"
import { maintenant } from "./horloge"
import { PreviewNotificationService } from "./notification/preview-notification-service"
import { ServiceReservation } from "./reservation/service-reservation"
import { stockageNavigateur } from "./stockage"

const stockage = stockageNavigateur()

export const repository: Repository = new DemoRepository(seed, stockage)

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
      void serviceReservation.traiterCallback(operateur, contenu)
    },
    planifier: (action, delaiMs) => {
      setTimeout(action, delaiMs)
    },
  })
}

const genererId = () => crypto.randomUUID()

export const notifications = new PreviewNotificationService(repository, maintenant, genererId)

export const serviceReservation = new ServiceReservation({
  repository,
  operateurs: { airtel: operateurSimule("airtel"), moov: operateurSimule("moov") },
  notifications,
  horloge: maintenant,
  aleatoire: aleatoireCrypto,
  genererId,
})

export const auth = new LocalAuthService({
  repository,
  notifications,
  stockage,
  horloge: maintenant,
  aleatoire: aleatoireCrypto,
  genererId,
})

export const billets = new ServiceBillets({ repository, auth, stockage })

/** Back-office : accès par code de démonstration, lecture des ventes et réglage des paliers. */
export const accesGestion: AccesGestion = new CodeDemoAccesGestion({
  code: seed.gestion.codeAccesDemo,
  dureeHeures: seed.gestion.dureeSessionHeures,
  stockage,
  horloge: maintenant,
})

export const serviceGestion = new ServiceGestion({ repository, horloge: maintenant, genererId, auteur: seed.gestion.auteurDemo })

/** Clé de signature des QR codes (démo : publique ; production : signature côté serveur). */
export const cleSignatureBillet = seed.cleSignatureBilletDemo

export type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository/repository"
export type { CommandeDetaillee, DemandeBlocage, Resultat } from "./reservation/service-reservation"
export type { EtatSession } from "./auth/auth-service"
export type { EtatVentes, ResultatGestion } from "./gestion/service-gestion"
