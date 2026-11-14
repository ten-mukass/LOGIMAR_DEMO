/**
 * Le Victoria Jet, seul navire de LOGIMAR 241.
 */
import type { Navire } from "@/domain/types"

export const navires: Navire[] = [
  {
    id: "VICTORIA-JET",
    nom: "Victoria Jet",
    type: "Catamaran rapide",
    capaciteTotale: 150, // EXEMPLE — à remplacer par LOGIMAR
    capaciteVendable: 150, // EXEMPLE — à remplacer par LOGIMAR (places retirées pour l'équipage ou les autorités)
    atouts: ["Sièges climatisés"],
    photo: "/images/victoria-jet.png",
    bagageSouteKg: 20, // EXEMPLE — à remplacer par LOGIMAR
    bagageCabineKg: 5, // EXEMPLE — à remplacer par LOGIMAR
  },
]
