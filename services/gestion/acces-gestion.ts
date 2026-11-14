/**
 * Accès au back-office.
 * Démo : CodeDemoAccesGestion (un simple code de démonstration, pas de rôles).
 * Production : comptes nominatifs, rôles et double facteur, vérifiés côté serveur (CAHIER_DES_CHARGES_GESTION §2).
 */
import { lireJson, type Stockage } from "../stockage"

export interface AccesGestion {
  estConnecte(): Promise<boolean>
  /** Renvoie false si le code est faux. */
  connecter(code: string): Promise<boolean>
  deconnecter(): Promise<void>
}

const CLE = "logimar-demo:v2:gestion-session"

/**
 * Code de démonstration comparé dans le navigateur : il protège l'écran, pas les données
 * (toutes les données de la démo sont dans le navigateur).
 */
export class CodeDemoAccesGestion implements AccesGestion {
  constructor(
    private readonly d: { code: string; dureeHeures: number; stockage: Stockage; horloge: () => Date },
  ) {}

  async estConnecte(): Promise<boolean> {
    const session = lireJson<{ jusqua: string | null }>(this.d.stockage, CLE, { jusqua: null })
    return session.jusqua !== null && Date.parse(session.jusqua) > this.d.horloge().getTime()
  }

  async connecter(code: string): Promise<boolean> {
    if (code.replace(/\s/g, "") !== this.d.code) return false
    const jusqua = new Date(this.d.horloge().getTime() + this.d.dureeHeures * 3_600_000).toISOString()
    this.d.stockage.ecrire(CLE, JSON.stringify({ jusqua }))
    return true
  }

  async deconnecter(): Promise<void> {
    this.d.stockage.ecrire(CLE, JSON.stringify({ jusqua: null }))
  }
}
