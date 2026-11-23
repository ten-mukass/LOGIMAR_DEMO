/**
 * Session de l'équipe dans les composants serveur et les actions serveur (étape 7C).
 * Chaque action de gestion relit ici la personne connectée et son profil : le proxy ne suffit pas
 * (une action serveur est une requête POST qui pourrait échapper à son filtre).
 */
import { cookies } from "next/headers"
import { peut, type Droit } from "@/domain/roles"
import { gestionParComptes } from "../mode-gestion"
import { ServiceComptesGestion, type Profil } from "./comptes-gestion"
import { baseSupabase } from "./connexion"
import { clientSession, identitesSupabase } from "./supabase"

let service: ServiceComptesGestion | null = null

export function serviceComptes(): ServiceComptesGestion {
  service ??= new ServiceComptesGestion({
    sql: baseSupabase(),
    identites: identitesSupabase,
    horloge: () => new Date(),
    genererId: () => crypto.randomUUID(),
    aleatoire: () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32,
  })
  return service
}

/** Client Supabase sur les cookies de la requête (écriture possible dans une action serveur). */
export async function supabaseDeLaRequete() {
  const magasin = await cookies()
  return clientSession({
    getAll: () => magasin.getAll(),
    setAll: (liste) => {
      try {
        for (const { name, value, options } of liste) magasin.set(name, value, options)
      } catch {
        // Composant serveur : cookies en lecture seule ; le proxy les rafraîchit.
      }
    },
  })
}

/** Identifiant Supabase de la personne connectée (vérifié auprès de Supabase Auth), ou null. */
export async function utilisateurConnecte(): Promise<string | null> {
  if (!gestionParComptes) return null
  const { data } = await (await supabaseDeLaRequete()).auth.getUser()
  return data.user?.id ?? null
}

/** Profil actif de la personne connectée, ou null. */
export async function profilConnecte(): Promise<Profil | null> {
  const id = await utilisateurConnecte()
  return id ? serviceComptes().profilActif(id) : null
}

/** Profil connecté ayant ce droit (et un mot de passe définitif) ; sinon erreur. */
export async function exigerDroit(droit: Droit): Promise<Profil> {
  const profil = await profilConnecte()
  if (!profil || profil.doitChangerMotDePasse || !peut(profil.role, droit)) throw new Error("Accès refusé.")
  return profil
}
