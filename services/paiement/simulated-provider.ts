/**
 * Opérateur simulé pour la démonstration et les tests (PERIMETRE_DEMO) :
 * la demande est validée au bout de `delaiMs` ; un numéro qui se termine par `suffixeRefus` est refusé.
 * Les transactions sont conservées dans le stockage : un rechargement de page ne les perd pas.
 */
import type { ConfigPaiementSimule } from "@/domain/config"
import { lireJson, type Stockage } from "../stockage"
import type {
  DemandePaiement,
  EvenementPaiement,
  Operateur,
  PaymentProvider,
  StatutTransaction,
} from "./payment-provider"

interface TransactionSimulee {
  demande: DemandePaiement
  debut: number
  rembourse: boolean
}

/** Forme des callbacks envoyés par l'opérateur simulé. */
interface CallbackSimule {
  transaction: string
  statut: "SUCCES" | "ECHEC"
  reference_operateur: string | null
}

export interface OptionsSimulation extends ConfigPaiementSimule {
  stockage: Stockage
  horloge: () => Date
  /** Remise du callback au serveur (le « webhook » de la démo). */
  envoyerCallback: (operateur: Operateur, contenu: CallbackSimule) => void
  /** Planification (setTimeout dans le navigateur, contrôlée dans les tests). */
  planifier: (action: () => void, delaiMs: number) => void
}

export class SimulatedProvider implements PaymentProvider {
  private readonly cle: string

  constructor(
    readonly operateur: Operateur,
    private readonly options: OptionsSimulation,
  ) {
    this.cle = `logimar-demo:v1:operateur-simule:${operateur}`
  }

  private transactions(): Record<string, TransactionSimulee> {
    return lireJson<Record<string, TransactionSimulee>>(this.options.stockage, this.cle, {})
  }

  private sauver(t: Record<string, TransactionSimulee>): void {
    this.options.stockage.ecrire(this.cle, JSON.stringify(t))
  }

  private issue(t: TransactionSimulee): Exclude<StatutTransaction, "en-attente"> {
    const chiffres = t.demande.numero.replace(/\D/g, "")
    return chiffres.endsWith(this.options.suffixeRefus) ? "refuse" : "reussi"
  }

  private refOperateur(refTransaction: string): string {
    return `SIM-${this.operateur.toUpperCase()}-${refTransaction.slice(-8)}`
  }

  private statutDe(t: TransactionSimulee): StatutTransaction {
    const ecoule = this.options.horloge().getTime() - t.debut
    return ecoule >= this.options.delaiMs ? this.issue(t) : "en-attente"
  }

  async initierPaiement(demande: DemandePaiement): Promise<{ statut: StatutTransaction }> {
    const transactions = this.transactions()
    if (!transactions[demande.refTransaction]) {
      transactions[demande.refTransaction] = {
        demande,
        debut: this.options.horloge().getTime(),
        rembourse: false,
      }
      this.sauver(transactions)
      this.options.planifier(() => {
        const t = this.transactions()[demande.refTransaction]
        if (!t) return
        const statut = this.issue(t)
        this.options.envoyerCallback(this.operateur, {
          transaction: demande.refTransaction,
          statut: statut === "reussi" ? "SUCCES" : "ECHEC",
          reference_operateur: statut === "reussi" ? this.refOperateur(demande.refTransaction) : null,
        })
      }, this.options.delaiMs)
    }
    return { statut: "en-attente" }
  }

  async consulterStatut(refTransaction: string): Promise<{ statut: StatutTransaction; refOperateur: string | null }> {
    const t = this.transactions()[refTransaction]
    if (!t) return { statut: "refuse", refOperateur: null }
    const statut = this.statutDe(t)
    return { statut, refOperateur: statut === "reussi" ? this.refOperateur(refTransaction) : null }
  }

  async traiterCallback(contenu: unknown): Promise<EvenementPaiement | null> {
    if (typeof contenu !== "object" || contenu === null) return null
    const c = contenu as Partial<CallbackSimule>
    if (typeof c.transaction !== "string" || (c.statut !== "SUCCES" && c.statut !== "ECHEC")) return null
    // Un vrai opérateur signe ses callbacks ; ici on vérifie au moins que la transaction existe.
    if (!this.transactions()[c.transaction]) return null
    return {
      refTransaction: c.transaction,
      statut: c.statut === "SUCCES" ? "reussi" : "refuse",
      refOperateur: c.reference_operateur ?? null,
    }
  }

  async rembourser(refTransaction: string): Promise<{ statut: "reussi" | "refuse" }> {
    const transactions = this.transactions()
    const t = transactions[refTransaction]
    if (!t || this.statutDe(t) !== "reussi") return { statut: "refuse" }
    t.rembourse = true
    this.sauver(transactions)
    return { statut: "reussi" }
  }
}
