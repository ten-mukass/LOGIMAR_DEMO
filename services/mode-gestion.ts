/**
 * Accès à la gestion (/admin, /scan) — étape 7C, docs/PLAN_BASE_DE_DONNEES.md :
 * - « comptes » : comptes nominatifs de l'équipe (Supabase Auth + table profils), vérifiés côté serveur
 *   (proxy.ts et chaque action) ; partout où Supabase est configuré, production comprise ;
 * - « code » : code de démonstration dans le navigateur (poste local sans base, tests).
 * Valeur fixée au build par next.config.ts.
 */
export type ModeGestion = "comptes" | "code"

export const MODE_GESTION: ModeGestion = process.env.NEXT_PUBLIC_LOGIMAR_GESTION === "comptes" ? "comptes" : "code"

export const gestionParComptes = MODE_GESTION === "comptes"
