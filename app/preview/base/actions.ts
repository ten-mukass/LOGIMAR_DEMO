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
import { gestionParComptes } from "@/services/mode-gestion"
import { serviceComptes } from "@/services/serveur/session-gestion"

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

/**
 * Premier administrateur des comptes de l'équipe (étape 7C) : seulement tant qu'il n'y en a aucun.
 * La personne saisit elle-même son e-mail et son mot de passe ; rien n'est journalisé en clair.
 */
export async function creerPremierAdministrateur(formulaire: FormData): Promise<void> {
  if (!accesControleBase()) throw new Error("Action réservée à la Preview.")
  if (!gestionParComptes) message("Comptes de gestion non configurés sur ce serveur.")
  const champ = (nom: string) => {
    const v = formulaire.get(nom)
    return typeof v === "string" ? v : ""
  }
  if (champ("motDePasse") !== champ("confirmation")) message("Premier administrateur : les deux mots de passe ne sont pas identiques.")
  const r = await serviceComptes().creerPremierAdministrateur({ email: champ("email"), nom: champ("nom"), motDePasse: champ("motDePasse") })
  message(
    r.ok
      ? `Administrateur créé : ${r.valeur.nom}. Connectez-vous sur /gestion/connexion, puis créez les autres comptes dans Utilisateurs.`
      : `Premier administrateur : ${r.message}`,
  )
}
