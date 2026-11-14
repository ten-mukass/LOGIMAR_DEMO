/**
 * Envoi des messages au client (cahier des charges §4.5) par un module unique :
 * V1 e-mail ; V2 SMS et WhatsApp, ajoutés sans toucher au parcours.
 * Démo : PreviewNotificationService (rien n'est envoyé ; aperçu consultable).
 * Production : prestataire d'e-mails, file d'attente et nouvelles tentatives.
 */
import type { Envoi } from "@/domain/types"

export interface MessageEmail {
  destinataire: string
  objet: string
  texte: string
  pieces: Envoi["pieces"]
  commandeId: string | null
  clientId: string | null
}

export interface NotificationService {
  /** Ne lève jamais d'erreur : un échec est inscrit au journal (un billet n'est jamais bloqué par un e-mail). */
  envoyerEmail(message: MessageEmail): Promise<Envoi>
}
