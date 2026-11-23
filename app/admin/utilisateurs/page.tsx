import type { Metadata } from "next"
import { EcranUtilisateurs } from "@/components/gestion/ecran-utilisateurs"

export const metadata: Metadata = { title: "Utilisateurs" }

/** Comptes de l'équipe : réservé à l'administrateur (proxy.ts et chaque action serveur). */
export default function PageUtilisateurs() {
  return <EcranUtilisateurs />
}
