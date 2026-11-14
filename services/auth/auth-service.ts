/**
 * Compte client (cahier des charges §4.5) : facultatif, proposé juste après le paiement.
 * Identifiant = le téléphone ou l'e-mail déjà saisi. V1 : un e-mail est vérifié par un code envoyé par e-mail ;
 * un téléphone n'est pas vérifié (SMS en V2) et ne rattache que les réservations dont la référence est connue.
 */
import type { Client, PassagerEnregistre } from "@/domain/types"

export type ResultatAuth<T> = { ok: true; valeur: T } | { ok: false; message: string }

export interface EtatSession {
  client: Client
  /** E-mail en attente de vérification par code. */
  verificationRequise: boolean
}

export interface AuthService {
  session(): Promise<EtatSession | null>
  /** Crée le compte à partir d'une commande payée sur cet appareil. */
  creerCompte(commandeId: string, motDePasse: string): Promise<ResultatAuth<EtatSession & { envoiId: string | null }>>
  verifierCode(code: string): Promise<ResultatAuth<Client>>
  renvoyerCode(): Promise<ResultatAuth<{ envoiId: string }>>
  connecter(identifiant: string, motDePasse: string): Promise<ResultatAuth<EtatSession & { envoiId: string | null }>>
  deconnecter(): Promise<void>
  demanderReinitialisation(identifiant: string): Promise<ResultatAuth<{ canal: "email"; envoiId: string } | { canal: "agence" }>>
  reinitialiser(identifiant: string, code: string, motDePasse: string): Promise<ResultatAuth<Client>>
  /** Enregistre des passagers pour pré-remplir les prochaines réservations (sans doublon). */
  enregistrerPassagers(passagers: Omit<PassagerEnregistre, "id">[]): Promise<void>
  supprimerPassager(id: string): Promise<void>
  supprimerCompte(): Promise<void>
}
