/**
 * Opérateurs Mobile Money et paiement simulé de la démo.
 */
import type { ConfigPaiementSimule } from "@/domain/config"
import type { OperateurMobile } from "@/domain/types"

export const operateurs: OperateurMobile[] = [
  { code: "airtel", nom: "Airtel Money", logo: "/images/airtel-money.png" },
  { code: "moov", nom: "Moov Money", logo: "/images/moov-money.png" },
]

/** PERIMETRE_DEMO : succès après 4 s ; un numéro se terminant par 0000 simule un refus. */
export const paiementSimule: ConfigPaiementSimule = {
  delaiMs: 4000,
  suffixeRefus: "0000",
}

/**
 * Clé de signature des QR codes de la démo. Elle est publique (dans le code du site) : la signature
 * ne protège donc rien ici. En production, signature côté serveur avec une clé secrète.
 */
export const cleSignatureBilletDemo = "logimar-241-demo-signature-billet" // EXEMPLE — à remplacer par LOGIMAR
