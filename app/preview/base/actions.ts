"use server"

/**
 * Actions de la page de contrôle de la base : refusées hors Preview (et hors développement local).
 */
import { redirect } from "next/navigation"
import { seed } from "@/data/seed"
import { baseSupabase } from "@/services/serveur/connexion"
import { accesControleBase } from "@/services/serveur/controle"
import { chargerExemples } from "@/services/serveur/exemples"
import { appliquerMigrations } from "@/services/serveur/migrations"

function message(texte: string): never {
  redirect(`/preview/base?message=${encodeURIComponent(texte)}`)
}

export async function appliquerLesMigrations(): Promise<void> {
  if (!accesControleBase()) throw new Error("Action réservée à la Preview.")
  const appliquees = await appliquerMigrations(baseSupabase())
  message(appliquees.length ? `Migrations appliquées : ${appliquees.join(", ")}.` : "Aucune migration à appliquer.")
}

export async function chargerLesExemples(): Promise<void> {
  if (!accesControleBase()) throw new Error("Action réservée à la Preview.")
  const bilan = await chargerExemples(baseSupabase(), seed)
  message(
    `Données d'exemple chargées : ${bilan.traversees} traversées, ${bilan.paliers} paliers, ${bilan.ventesExemple} ventes, ${bilan.passagersExemple} passagers.`,
  )
}
