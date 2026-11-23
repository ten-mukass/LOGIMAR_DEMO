/**
 * Services du parcours client côté serveur, sur la base (étape 7B). Jamais importé par le navigateur :
 * les écrans passent par les actions serveur de `actions-site.ts`.
 */
import { seed } from "@/data/seed"
import { maintenant } from "../horloge"
import { PreviewNotificationService } from "../notification/preview-notification-service"
import type { Operateur, PaymentProvider } from "../paiement/payment-provider"
import { SimulatedProviderServeur } from "../paiement/simulated-provider-serveur"
import { PostgresRepository } from "../repository/postgres-repository"
import { ServiceReservation } from "../reservation/service-reservation"
import { baseSupabase } from "./connexion"
import type { Sql } from "./sql"

export interface ServicesServeur {
  repository: PostgresRepository
  serviceReservation: ServiceReservation
  horloge: () => Date
}

function aleatoireCrypto(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

/** Assemble les services sur une base donnée (Supabase, ou PGlite dans les tests). */
export function creerServicesServeur(sql: Sql, horloge: () => Date = maintenant, memoireReferentiel = true): ServicesServeur {
  const repository = new PostgresRepository(sql, seed, memoireReferentiel ? { dureeMs: 5 * 60_000 } : null)
  const genererId = () => crypto.randomUUID()
  const operateur = (code: Operateur): PaymentProvider =>
    new SimulatedProviderServeur(code, {
      ...seed.paiementSimule,
      horloge,
      lireTransaction: (ref) => repository.trouverPaiementParTransaction(ref),
    })
  const serviceReservation = new ServiceReservation({
    repository,
    operateurs: { airtel: operateur("airtel"), moov: operateur("moov") },
    notifications: new PreviewNotificationService(repository, horloge, genererId),
    horloge,
    aleatoire: aleatoireCrypto,
    genererId,
  })
  return { repository, serviceReservation, horloge }
}

let instance: ServicesServeur | null = null

/** Services sur la base Supabase (une instance par serveur). */
export function servicesServeur(): ServicesServeur {
  instance ??= creerServicesServeur(baseSupabase())
  return instance
}
