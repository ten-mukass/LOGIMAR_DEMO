/**
 * Messages d'info trafic affichés sur l'accueil (administrables en production).
 */
import type { InfoTrafic } from "@/domain/types"

export const infosTrafic: InfoTrafic[] = [
  {
    id: "INFO-TERMINAL-LBV",
    message: "À Libreville, embarquement au [TERMINAL À CONFIRMER].", // EXEMPLE — à remplacer par LOGIMAR
    lien: null, // lien d'itinéraire à fournir par LOGIMAR
    libelleLien: "Voir l’itinéraire",
    niveau: "information",
    debutAt: "2026-11-01T00:00:00+01:00", // EXEMPLE — à remplacer par LOGIMAR
    finAt: "2027-01-31T23:59:00+01:00", // EXEMPLE — à remplacer par LOGIMAR
    actif: true,
  },
]
