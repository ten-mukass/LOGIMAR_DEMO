/**
 * Choix des implémentations : seul endroit à modifier pour passer de la démo à la production
 * (PostgreSQL, AirtelMoneyProvider, MoovMoneyProvider, côté serveur).
 */
import { seed } from "@/data/seed"
import type { Operateur, PaymentProvider } from "./paiement/payment-provider"
import { SimulatedProvider } from "./paiement/simulated-provider"
import { DemoRepository } from "./repository/demo-repository"
import type { Repository } from "./repository/repository"
import { maintenant } from "./horloge"
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

export const serviceReservation = new ServiceReservation({
  repository,
  operateurs: { airtel: operateurSimule("airtel"), moov: operateurSimule("moov") },
  horloge: maintenant,
  aleatoire: aleatoireCrypto,
  genererId: () => crypto.randomUUID(),
})

/** Clé de signature des QR codes (démo : publique ; production : signature côté serveur). */
export const cleSignatureBillet = seed.cleSignatureBilletDemo

export type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository/repository"
export type { DemandeBlocage, Resultat } from "./reservation/service-reservation"
