/**
 * Programme type des traversées.
 * Horaires et jours : PERIMETRE_DEMO et affiches « Programme du mois » (à confirmer par LOGIMAR).
 * Hypothèse de la démo (docs/PLAN_DEMO.md, décision 1) : chaque jour de traversée compte un aller
 * Port-Gentil → Libreville le matin et un départ Libreville → Port-Gentil à midi.
 */
import type { RegleProgramme } from "@/domain/types"

const MARDI = 2
const VENDREDI = 5
const DIMANCHE = 0

export const regles: RegleProgramme[] = [
  {
    ligneId: "LBV-POG",
    navireId: "VICTORIA-JET",
    terminalDepartId: "TERM-LBV",
    terminalArriveeId: "TERM-POG",
    joursSemaine: [MARDI, VENDREDI, DIMANCHE],
    enregistrement: "09:30",
    depart: "12:15",
    arrivee: "15:45",
    fermetureEnregistrement: null, // à fournir par LOGIMAR
  },
  {
    ligneId: "POG-LBV",
    navireId: "VICTORIA-JET",
    terminalDepartId: "TERM-POG",
    terminalArriveeId: "TERM-LBV",
    joursSemaine: [MARDI, VENDREDI, DIMANCHE],
    enregistrement: "05:25",
    depart: "07:25",
    arrivee: "11:00",
    fermetureEnregistrement: null, // à fournir par LOGIMAR
  },
]
