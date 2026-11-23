"use server"

/**
 * Actions serveur des comptes de l'équipe (étape 7C). Chacune relit la personne connectée et son profil ;
 * toutes refusent quand la gestion n'est pas en mode « comptes ».
 */
import { erreurMotDePasse, estRole, suiteApresConnexion, type RoleGestion } from "@/domain/roles"
import { gestionParComptes } from "../mode-gestion"
import type { EntreeJournal, Profil, Resultat } from "./comptes-gestion"
import { exigerDroit, profilConnecte, serviceComptes, supabaseDeLaRequete } from "./session-gestion"

export interface SessionGestion {
  nom: string
  email: string
  role: RoleGestion
}

const MESSAGE_CONNEXION = "Adresse ou mot de passe incorrect, ou compte désactivé."

function verifierMode(): void {
  if (!gestionParComptes) throw new Error("Comptes de gestion non configurés ici.")
}

const texte = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max

export async function lireSessionGestion(): Promise<SessionGestion | null> {
  verifierMode()
  const p = await profilConnecte()
  return p && !p.doitChangerMotDePasse ? { nom: p.nom, email: p.email, role: p.role } : null
}

export async function connecterGestion(email: string, motDePasse: string, suite?: string): Promise<Resultat<{ suite: string }>> {
  verifierMode()
  if (!texte(email, 200) || !texte(motDePasse, 200) || !email.trim() || !motDePasse) return { ok: false, message: MESSAGE_CONNEXION }
  const supabase = await supabaseDeLaRequete()
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse })
  const profil = !error && data.user ? await serviceComptes().profilActif(data.user.id) : null
  if (!profil) {
    if (!error) await supabase.auth.signOut()
    return { ok: false, message: MESSAGE_CONNEXION }
  }
  await serviceComptes().noterConnexion(profil)
  const apres = suiteApresConnexion(profil.role, texte(suite, 500) ? suite : null)
  return { ok: true, valeur: { suite: profil.doitChangerMotDePasse ? `/gestion/mot-de-passe?suite=${encodeURIComponent(apres)}` : apres } }
}

export async function deconnecterGestion(): Promise<void> {
  verifierMode()
  await (await supabaseDeLaRequete()).auth.signOut()
}

/** La personne connectée choisit son mot de passe (obligatoire après un mot de passe provisoire). */
export async function changerMotDePasseGestion(nouveau: string, confirmation: string, suite?: string): Promise<Resultat<{ suite: string }>> {
  verifierMode()
  const profil = await profilConnecte()
  if (!profil) return { ok: false, message: "Session expirée : reconnectez-vous." }
  if (!texte(nouveau, 200) || nouveau !== confirmation) return { ok: false, message: "Les deux saisies ne sont pas identiques." }
  const erreur = erreurMotDePasse(nouveau)
  if (erreur) return { ok: false, message: erreur }
  const { error } = await (await supabaseDeLaRequete()).auth.updateUser({ password: nouveau })
  if (error) {
    const meme = error.code === "same_password"
    return { ok: false, message: meme ? "Choisissez un mot de passe différent du provisoire." : "Changement refusé : réessayez." }
  }
  await serviceComptes().motDePasseChange(profil.id)
  return { ok: true, valeur: { suite: suiteApresConnexion(profil.role, texte(suite, 500) ? suite : null) } }
}

// Administration des comptes ---------------------------------------------------

export async function lireComptesGestion(): Promise<{ profils: Profil[]; journal: EntreeJournal[]; moi: string }> {
  verifierMode()
  const moi = await exigerDroit("utilisateurs")
  const service = serviceComptes()
  return { profils: await service.lister(), journal: await service.journal(30), moi: moi.id }
}

export async function creerCompteGestion(saisie: {
  email: string
  nom: string
  role: RoleGestion
}): Promise<Resultat<{ profil: Profil; motDePasseProvisoire: string }>> {
  verifierMode()
  const moi = await exigerDroit("utilisateurs")
  if (!texte(saisie?.email, 200) || !texte(saisie?.nom, 200) || !estRole(saisie?.role)) {
    return { ok: false, message: "Saisie incomplète." }
  }
  return serviceComptes().creerCompte(moi.id, { email: saisie.email, nom: saisie.nom, role: saisie.role })
}

export async function modifierCompteGestion(id: string, changement: { role?: RoleGestion; actif?: boolean }): Promise<Resultat<Profil>> {
  verifierMode()
  const moi = await exigerDroit("utilisateurs")
  if (!texte(id, 100)) return { ok: false, message: "Compte introuvable." }
  const role = changement?.role
  const actif = changement?.actif
  if ((role !== undefined && !estRole(role)) || (actif !== undefined && typeof actif !== "boolean")) {
    return { ok: false, message: "Changement invalide." }
  }
  return serviceComptes().modifier(moi.id, id, { role, actif })
}

export async function reinitialiserMotDePasseGestion(id: string): Promise<Resultat<{ motDePasseProvisoire: string }>> {
  verifierMode()
  const moi = await exigerDroit("utilisateurs")
  if (!texte(id, 100)) return { ok: false, message: "Compte introuvable." }
  return serviceComptes().reinitialiserMotDePasse(moi.id, id)
}
