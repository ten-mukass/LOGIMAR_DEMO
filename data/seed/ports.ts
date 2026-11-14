/**
 * Ports, terminaux et lignes.
 * Les terminaux restent « [À CONFIRMER] » tant que LOGIMAR ne les a pas indiqués (PERIMETRE_DEMO).
 */
import type { Ligne, Port, Terminal } from "@/domain/types"

export const ports: Port[] = [
  { id: "POG", code: "POG", nom: "Port-Gentil", ville: "Port-Gentil" },
  { id: "LBV", code: "LBV", nom: "Libreville", ville: "Libreville" },
]

export const terminaux: Terminal[] = [
  {
    id: "TERM-LBV",
    portId: "LBV",
    nom: "[À CONFIRMER]", // terminal de Libreville à fournir par LOGIMAR
    adresse: null,
    lienItineraire: null,
    actif: true,
  },
  {
    id: "TERM-POG",
    portId: "POG",
    nom: "[À CONFIRMER]", // terminal de Port-Gentil à fournir par LOGIMAR
    adresse: null,
    lienItineraire: null,
    actif: true,
  },
]

export const lignes: Ligne[] = [
  { id: "LBV-POG", portDepartId: "LBV", portArriveeId: "POG" },
  { id: "POG-LBV", portDepartId: "POG", portArriveeId: "LBV" },
]
