/**
 * Où vivent les données du parcours client (étape 7B, docs/PLAN_BASE_DE_DONNEES.md) :
 * - « base » : sur le serveur, dans la base Supabase (Preview, ou poste local avec .env.local) ;
 * - « demo » : dans le navigateur (production tant que les étapes C et D ne sont pas faites, tests, poste sans base).
 * Valeur fixée au build par next.config.ts, identique côté serveur et côté navigateur.
 */
export type ModeDonnees = "base" | "demo"

export const MODE_DONNEES: ModeDonnees = process.env.NEXT_PUBLIC_LOGIMAR_DONNEES === "base" ? "base" : "demo"

export const donneesEnBase = MODE_DONNEES === "base"
