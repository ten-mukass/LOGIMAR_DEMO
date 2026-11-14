/**
 * Démo : aucun message ne part. Chaque envoi est inscrit au journal avec son contenu,
 * consultable sur la page « Aperçu de l'e-mail ».
 */
import type { Envoi } from "@/domain/types"
import type { Repository } from "../repository/repository"
import type { MessageEmail, NotificationService } from "./notification-service"

export class PreviewNotificationService implements NotificationService {
  constructor(
    private readonly repository: Repository,
    private readonly horloge: () => Date,
    private readonly genererId: () => string,
  ) {}

  async envoyerEmail(message: MessageEmail): Promise<Envoi> {
    const envoi: Envoi = {
      id: this.genererId(),
      commandeId: message.commandeId,
      clientId: message.clientId,
      canal: "email",
      destinataire: message.destinataire,
      objet: message.objet,
      texte: message.texte,
      pieces: message.pieces,
      statut: "apercu",
      tentatives: 1,
      erreur: null,
      creeLe: this.horloge().toISOString(),
    }
    try {
      await this.repository.enregistrerEnvoi(envoi)
    } catch (e) {
      return { ...envoi, statut: "echec", erreur: e instanceof Error ? e.message : String(e) }
    }
    return envoi
  }
}
