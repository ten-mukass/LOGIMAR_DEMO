/**
 * Rôles de l'équipe LOGIMAR et ce que chacun peut faire (étape 7C, docs/PLAN_BASE_DE_DONNEES.md,
 * cahier des charges gestion §2). Fonctions pures : le serveur (proxy, actions) et les écrans s'en servent.
 * Agent de vente, exploitation et comptabilité viendront avec leurs écrans.
 */

export const ROLES = ["administrateur", "direction", "revenue", "embarquement"] as const
export type RoleGestion = (typeof ROLES)[number]

export const LIBELLES_ROLES: Record<RoleGestion, string> = {
  administrateur: "Administrateur",
  direction: "Direction",
  revenue: "Revenue manager",
  embarquement: "Agent d’embarquement",
}

export const DESCRIPTIONS_ROLES: Record<RoleGestion, string> = {
  administrateur: "Tout, y compris les comptes de l’équipe.",
  direction: "Tableau de bord, traversées, réservations et manifestes, en lecture seule.",
  revenue: "Comme la direction, et ouvre ou ferme les paliers de prix.",
  embarquement: "Écran d’embarquement seulement (scan des billets).",
}

export type Droit = "back-office" | "paliers" | "utilisateurs" | "embarquement"

const DROITS: Record<RoleGestion, Droit[]> = {
  administrateur: ["back-office", "paliers", "utilisateurs", "embarquement"],
  direction: ["back-office", "embarquement"],
  revenue: ["back-office", "paliers", "embarquement"],
  embarquement: ["embarquement"],
}

export function estRole(valeur: unknown): valeur is RoleGestion {
  return typeof valeur === "string" && (ROLES as readonly string[]).includes(valeur)
}

export function peut(role: RoleGestion, droit: Droit): boolean {
  return DROITS[role].includes(droit)
}

/** Droit exigé pour une page de gestion ; null si le chemin n'est pas réservé à l'équipe. */
export function droitPourChemin(chemin: string): Droit | null {
  const dans = (racine: string) => chemin === racine || chemin.startsWith(`${racine}/`)
  if (dans("/admin/utilisateurs")) return "utilisateurs"
  if (dans("/admin")) return "back-office"
  if (dans("/scan")) return "embarquement"
  return null
}

/** Première page d'un membre de l'équipe après sa connexion. */
export function accueilDuRole(role: RoleGestion): string {
  return peut(role, "back-office") ? "/admin" : "/scan"
}

/** Page où revenir après la connexion : celle demandée si le rôle y a droit, sinon son accueil. */
export function suiteApresConnexion(role: RoleGestion, demandee: string | null | undefined): string {
  if (demandee && demandee.startsWith("/") && !demandee.startsWith("//")) {
    const droit = droitPourChemin(demandee.split("?")[0])
    if (droit && peut(role, droit)) return demandee
  }
  return accueilDuRole(role)
}

export const LONGUEUR_MIN_MOT_DE_PASSE = 10

/** Mot de passe d'un compte de l'équipe : au moins 10 caractères, avec lettres et chiffres. */
export function erreurMotDePasse(motDePasse: string): string | null {
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`
  if (!/\p{L}/u.test(motDePasse) || !/\d/.test(motDePasse)) return "Mélangez des lettres et des chiffres."
  if (motDePasse.length > 72) return "72 caractères au plus."
  return null
}

const ALPHABET_PROVISOIRE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

/** Mot de passe provisoire (14 caractères sans ambiguïté, au moins une lettre et un chiffre). */
export function motDePasseProvisoire(aleatoire: () => number): string {
  for (;;) {
    let mdp = ""
    for (let i = 0; i < 14; i++) mdp += ALPHABET_PROVISOIRE[Math.floor(aleatoire() * ALPHABET_PROVISOIRE.length)]
    if (erreurMotDePasse(mdp) === null) return mdp
  }
}

export function estEmailEquipe(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 200
}
