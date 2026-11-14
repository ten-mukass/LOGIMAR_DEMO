/**
 * Textes des messages envoyés au client (modèles administrables en production).
 */
import { formatFCFA } from "./format"
import { formatJourLong, heureLocale, jourLocal } from "./temps"
import type { Commande, Port, Reservation, Traversee } from "./types"

export interface SegmentMessage {
  reservation: Reservation
  traversee: Traversee
  depart: Port | undefined
  arrivee: Port | undefined
}

export function emailConfirmation(commande: Commande, segments: SegmentMessage[]): { objet: string; texte: string } {
  const premier = segments[0]
  const objet = `Votre billet LOGIMAR 241 ${premier?.reservation.reference ?? ""} — ${premier?.depart?.nom} → ${premier?.arrivee?.nom}`
  const lignes = [
    "Bonjour,",
    "",
    "Votre paiement est confirmé. Voici votre réservation :",
    "",
    ...segments.flatMap(({ reservation, traversee, depart, arrivee }, i) => [
      `${segments.length > 1 ? (i === 0 ? "Aller" : "Retour") + " — " : ""}Référence ${reservation.reference}`,
      `${depart?.nom} → ${arrivee?.nom}, ${formatJourLong(jourLocal(traversee.departAt), true).toLowerCase()}`,
      `Départ ${heureLocale(traversee.departAt)}, arrivée ${heureLocale(traversee.arriveeAt)}.`,
      `Enregistrement dès ${heureLocale(traversee.enregistrementOuvertureAt)} : après la fermeture, l’embarquement est refusé.`,
      `Passagers : ${reservation.passagers.map((p) => `${p.nom} ${p.prenom}`).join(", ")}.`,
      "",
    ]),
    `Montant payé : ${formatFCFA(commande.total)}${commande.numeroFacture ? ` (facture ${commande.numeroFacture})` : ""}.`,
    "",
    "Votre billet et votre facture sont joints en PDF. Présentez le QR code et une pièce d’identité pour chaque passager à l’embarquement.",
    "Pour retrouver votre billet : « Mes billets », avec la référence et ce contact.",
    "",
    "Bon voyage à bord du Victoria Jet,",
    "LOGIMAR 241",
  ]
  return { objet, texte: lignes.join("\n").replace(/ | /g, " ") }
}

export function emailCode(code: string, objet: "verification" | "reinitialisation", minutes: number): { objet: string; texte: string } {
  const titre = objet === "verification" ? "Confirmez votre adresse e-mail" : "Réinitialisation de votre mot de passe"
  return {
    objet: `LOGIMAR 241 — ${titre}`,
    texte: [
      "Bonjour,",
      "",
      `Votre code : ${code}`,
      "",
      `Il est valable ${minutes} minutes. Ne le communiquez à personne.`,
      "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.",
      "",
      "LOGIMAR 241",
    ].join("\n"),
  }
}
