/**
 * Opérateur simulé côté serveur (étape 7B, docs/PLAN_BASE_DE_DONNEES.md).
 *
 * Sur Vercel, une fonction serveur ne peut pas attendre 4 s puis rappeler toute seule : rien n'est planifié.
 * L'issue se déduit du paiement enregistré en base (heure de la demande, numéro) au moment où l'écran de
 * paiement redemande l'état : validé au bout de `delaiMs`, refusé si le numéro se termine par `suffixeRefus`.
 * Aucun état propre : deux serveurs différents donnent la même réponse.
 */
import type { ConfigPaiementSimule } from "@/domain/config"
import type { DemandePaiement, EvenementPaiement, Operateur, PaymentProvider, StatutTransaction } from "./payment-provider"

/** Ce que l'opérateur simulé sait d'une transaction : le paiement enregistré par le service. */
export interface TransactionConnue {
  numero: string
  /** Heure de la demande (ISO 8601). */
  creeLe: string
}

export interface OptionsSimulationServeur extends ConfigPaiementSimule {
  horloge: () => Date
  lireTransaction: (refTransaction: string) => Promise<TransactionConnue | null>
}

export class SimulatedProviderServeur implements PaymentProvider {
  constructor(
    readonly operateur: Operateur,
    private readonly options: OptionsSimulationServeur,
  ) {}

  async initierPaiement(demande: DemandePaiement): Promise<{ statut: StatutTransaction }> {
    void demande
    return { statut: "en-attente" }
  }

  async consulterStatut(refTransaction: string): Promise<{ statut: StatutTransaction; refOperateur: string | null }> {
    const t = await this.options.lireTransaction(refTransaction)
    if (!t) return { statut: "en-attente", refOperateur: null }
    const ecoule = this.options.horloge().getTime() - Date.parse(t.creeLe)
    if (ecoule < this.options.delaiMs) return { statut: "en-attente", refOperateur: null }
    const refuse = t.numero.replace(/\D/g, "").endsWith(this.options.suffixeRefus)
    return refuse
      ? { statut: "refuse", refOperateur: null }
      : { statut: "reussi", refOperateur: `SIM-${this.operateur.toUpperCase()}-${refTransaction.slice(-8)}` }
  }

  /** Pas de callback : la confirmation passe par consulterStatut. */
  async traiterCallback(contenu: unknown): Promise<EvenementPaiement | null> {
    void contenu
    return null
  }

  async rembourser(refTransaction: string, montant: number): Promise<{ statut: "reussi" | "refuse" }> {
    void refTransaction
    void montant
    return { statut: "reussi" }
  }
}
