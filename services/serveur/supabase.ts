/**
 * Supabase Auth côté serveur (étape 7C). Variables lues ici seulement, jamais écrites ni journalisées :
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (session de la personne connectée, dans des
 * cookies), SUPABASE_SECRET_KEY (création des comptes et mots de passe provisoires, jamais envoyée au navigateur).
 */
import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { FournisseurIdentites } from "./comptes-gestion"

function variable(nom: string, valeur: string | undefined): string {
  if (!valeur) throw new Error(`${nom} absente : comptes de gestion non configurés.`)
  return valeur
}

/** Client lié à la session de la personne (cookies de la requête en cours). */
export function clientSession(cookies: CookieMethodsServer): SupabaseClient {
  return createServerClient(
    variable("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variable("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    { cookies },
  )
}

let admin: SupabaseClient | null = null

function clientAdmin(): SupabaseClient {
  admin ??= createClient(
    variable("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    variable("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  return admin
}

/** Identités dans Supabase Auth (API d'administration, clé secrète). */
export const identitesSupabase: FournisseurIdentites = {
  async creer(email, motDePasse) {
    const { data, error } = await clientAdmin().auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
    if (error || !data.user) {
      const dejaPrise = error?.code === "email_exists" || /already/i.test(error?.message ?? "")
      return { ok: false, message: dejaPrise ? "Cette adresse a déjà un compte." : "Création du compte refusée par Supabase." }
    }
    return { ok: true, id: data.user.id }
  },
  async definirMotDePasse(id, motDePasse) {
    const { error } = await clientAdmin().auth.admin.updateUserById(id, { password: motDePasse })
    if (error) throw new Error("Changement du mot de passe refusé par Supabase.")
  },
}
