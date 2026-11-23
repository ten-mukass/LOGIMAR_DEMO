/**
 * Comptes de l'équipe LOGIMAR (étape 7C) : profils (nom, rôle, état), création par l'administrateur avec un
 * mot de passe provisoire, journal d'audit. Côté serveur uniquement.
 *
 * Les identifiants eux-mêmes sont dans Supabase Auth, derrière l'interface `FournisseurIdentites`
 * (remplacée par un faux dans les tests). Supabase n'envoie pas d'e-mails sans service d'envoi : pas
 * d'invitation ni de lien de réinitialisation, l'administrateur transmet le mot de passe provisoire.
 */
import {
  erreurMotDePasse,
  estEmailEquipe,
  estRole,
  LIBELLES_ROLES,
  motDePasseProvisoire,
  peut,
  type RoleGestion,
} from "@/domain/roles"
import { iso, json, type Ligne, type Sql } from "./sql"

export interface Profil {
  id: string
  email: string
  nom: string
  role: RoleGestion
  actif: boolean
  doitChangerMotDePasse: boolean
  creeLe: string
}

export interface EntreeJournal {
  id: string
  le: string
  auteurNom: string
  action: string
  cible: string | null
  avant: unknown
  apres: unknown
  motif: string | null
}

export interface FournisseurIdentites {
  /** Crée l'identité (e-mail confirmé d'office) ; message lisible en cas de refus (adresse déjà prise…). */
  creer(email: string, motDePasse: string): Promise<{ ok: true; id: string } | { ok: false; message: string }>
  definirMotDePasse(id: string, motDePasse: string): Promise<void>
}

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; message: string }

const refus = <T>(message: string): Resultat<T> => ({ ok: false, message })

function profil(l: Ligne): Profil {
  return {
    id: String(l.id),
    email: String(l.email),
    nom: String(l.nom),
    role: l.role as RoleGestion,
    actif: Boolean(l.actif),
    doitChangerMotDePasse: Boolean(l.doit_changer_mot_de_passe),
    creeLe: iso(l.cree_le),
  }
}

const nettoyerNom = (nom: string) => nom.trim().replace(/\s+/g, " ")

export class ServiceComptesGestion {
  constructor(
    private readonly d: {
      sql: Sql
      identites: FournisseurIdentites
      horloge: () => Date
      genererId: () => string
      aleatoire: () => number
    },
  ) {}

  // Lectures -----------------------------------------------------------------

  async profil(id: string): Promise<Profil | null> {
    const [l] = await this.d.sql.requete("select * from profils where id = $1", [id])
    return l ? profil(l) : null
  }

  /** Profil d'un membre actif de l'équipe ; null sinon (compte inconnu ou désactivé). */
  async profilActif(id: string): Promise<Profil | null> {
    const p = await this.profil(id)
    return p?.actif ? p : null
  }

  async lister(): Promise<Profil[]> {
    return (await this.d.sql.requete("select * from profils order by actif desc, nom, email")).map(profil)
  }

  async administrateurExiste(): Promise<boolean> {
    const [l] = await this.d.sql.requete("select count(*)::int as n from profils where role = 'administrateur' and actif")
    return Number(l?.n ?? 0) > 0
  }

  async journal(limite = 30): Promise<EntreeJournal[]> {
    const lignes = await this.d.sql.requete("select * from journal_audit order by le desc, id desc limit $1", [limite])
    return lignes.map((l) => ({
      id: String(l.id),
      le: iso(l.le),
      auteurNom: String(l.auteur_nom),
      action: String(l.action),
      cible: (l.cible ?? null) as string | null,
      avant: l.avant === null ? null : json(l.avant),
      apres: l.apres === null ? null : json(l.apres),
      motif: (l.motif ?? null) as string | null,
    }))
  }

  // Écritures ----------------------------------------------------------------

  private async journaliser(
    sql: Sql,
    auteur: Pick<Profil, "id" | "nom"> | null,
    action: string,
    cible: string | null,
    avant: unknown,
    apres: unknown,
  ): Promise<void> {
    await sql.requete(
      `insert into journal_audit (id, le, auteur_id, auteur_nom, action, cible, avant, apres)
       values ($1, $2::timestamptz, $3, $4, $5, $6, $7::text::jsonb, $8::text::jsonb)`,
      [
        this.d.genererId(),
        this.d.horloge().toISOString(),
        auteur?.id ?? null,
        auteur?.nom ?? "Installation",
        action,
        cible,
        avant === null ? null : JSON.stringify(avant),
        apres === null ? null : JSON.stringify(apres),
      ],
    )
  }

  /** L'auteur doit être un administrateur actif (relu en base : un droit retiré compte tout de suite). */
  private async administrateur(auteurId: string): Promise<Profil | null> {
    const auteur = await this.profilActif(auteurId)
    return auteur && peut(auteur.role, "utilisateurs") ? auteur : null
  }

  private validerSaisie(email: string, nom: string, role: unknown): string | null {
    if (!estEmailEquipe(email)) return "Adresse e-mail invalide."
    const n = nettoyerNom(nom)
    if (n.length < 2 || n.length > 80) return "Indiquez le nom (2 à 80 caractères)."
    if (!estRole(role)) return "Rôle inconnu."
    return null
  }

  private async inscrire(
    auteur: Profil | null,
    saisie: { email: string; nom: string; role: RoleGestion },
    motDePasse: string,
    doitChanger: boolean,
  ): Promise<Resultat<Profil>> {
    const email = saisie.email.trim().toLowerCase()
    const [existant] = await this.d.sql.requete("select 1 from profils where email = $1", [email])
    if (existant) return refus("Un compte existe déjà avec cette adresse.")
    const identite = await this.d.identites.creer(email, motDePasse)
    if (!identite.ok) return refus(identite.message)
    const nouveau: Profil = {
      id: identite.id,
      email,
      nom: nettoyerNom(saisie.nom),
      role: saisie.role,
      actif: true,
      doitChangerMotDePasse: doitChanger,
      creeLe: this.d.horloge().toISOString(),
    }
    await this.d.sql.transaction(async (sql) => {
      await sql.requete(
        `insert into profils (id, email, nom, role, actif, doit_changer_mot_de_passe, cree_le, cree_par, maj_le)
         values ($1, $2, $3, $4, true, $5, $6::timestamptz, $7, $6::timestamptz)`,
        [nouveau.id, nouveau.email, nouveau.nom, nouveau.role, doitChanger, nouveau.creeLe, auteur?.id ?? null],
      )
      await this.journaliser(sql, auteur, "compte-cree", nouveau.email, null, { nom: nouveau.nom, role: nouveau.role })
    })
    return { ok: true, valeur: nouveau }
  }

  /**
   * Premier administrateur (page de contrôle de la Preview) : seulement tant qu'il n'y a aucun
   * administrateur actif. Le mot de passe est choisi par la personne elle-même.
   */
  async creerPremierAdministrateur(saisie: { email: string; nom: string; motDePasse: string }): Promise<Resultat<Profil>> {
    if (await this.administrateurExiste()) return refus("Un administrateur existe déjà : il crée les autres comptes.")
    const erreur = this.validerSaisie(saisie.email, saisie.nom, "administrateur") ?? erreurMotDePasse(saisie.motDePasse)
    if (erreur) return refus(erreur)
    return this.inscrire(null, { email: saisie.email, nom: saisie.nom, role: "administrateur" }, saisie.motDePasse, false)
  }

  /** Nouveau compte, avec un mot de passe provisoire à transmettre (affiché une seule fois). */
  async creerCompte(
    auteurId: string,
    saisie: { email: string; nom: string; role: RoleGestion },
  ): Promise<Resultat<{ profil: Profil; motDePasseProvisoire: string }>> {
    const auteur = await this.administrateur(auteurId)
    if (!auteur) return refus("Réservé à l’administrateur.")
    const erreur = this.validerSaisie(saisie.email, saisie.nom, saisie.role)
    if (erreur) return refus(erreur)
    const provisoire = motDePasseProvisoire(this.d.aleatoire)
    const cree = await this.inscrire(auteur, saisie, provisoire, true)
    return cree.ok ? { ok: true, valeur: { profil: cree.valeur, motDePasseProvisoire: provisoire } } : cree
  }

  /** Change le rôle ou l'état d'un compte. On ne se retire pas ses propres droits, et il reste toujours un administrateur. */
  async modifier(auteurId: string, id: string, changement: { role?: RoleGestion; actif?: boolean }): Promise<Resultat<Profil>> {
    const auteur = await this.administrateur(auteurId)
    if (!auteur) return refus("Réservé à l’administrateur.")
    if (changement.role !== undefined && !estRole(changement.role)) return refus("Rôle inconnu.")
    const cible = await this.profil(id)
    if (!cible) return refus("Compte introuvable.")
    if (cible.id === auteur.id) return refus("Vous ne pouvez pas modifier votre propre rôle ni désactiver votre compte.")
    const apres: Profil = { ...cible, role: changement.role ?? cible.role, actif: changement.actif ?? cible.actif }
    const retireAdmin = cible.role === "administrateur" && cible.actif && (apres.role !== "administrateur" || !apres.actif)
    return this.d.sql.transaction(async (sql) => {
      if (retireAdmin) {
        const [l] = await sql.requete("select count(*)::int as n from profils where role = 'administrateur' and actif and id <> $1", [cible.id])
        if (Number(l?.n ?? 0) === 0) return refus<Profil>("Il doit rester au moins un administrateur actif.")
      }
      await sql.requete("update profils set role = $2, actif = $3, maj_le = $4::timestamptz where id = $1", [
        cible.id,
        apres.role,
        apres.actif,
        this.d.horloge().toISOString(),
      ])
      if (apres.role !== cible.role) {
        await this.journaliser(sql, auteur, "role-modifie", cible.email, { role: LIBELLES_ROLES[cible.role] }, { role: LIBELLES_ROLES[apres.role] })
      }
      if (apres.actif !== cible.actif) {
        await this.journaliser(sql, auteur, apres.actif ? "compte-reactive" : "compte-desactive", cible.email, null, null)
      }
      return { ok: true as const, valeur: apres }
    })
  }

  /** Nouveau mot de passe provisoire (mot de passe oublié) ; la personne devra le changer. */
  async reinitialiserMotDePasse(auteurId: string, id: string): Promise<Resultat<{ motDePasseProvisoire: string }>> {
    const auteur = await this.administrateur(auteurId)
    if (!auteur) return refus("Réservé à l’administrateur.")
    const cible = await this.profil(id)
    if (!cible) return refus("Compte introuvable.")
    const provisoire = motDePasseProvisoire(this.d.aleatoire)
    await this.d.identites.definirMotDePasse(cible.id, provisoire)
    await this.d.sql.transaction(async (sql) => {
      await sql.requete("update profils set doit_changer_mot_de_passe = true, maj_le = $2::timestamptz where id = $1", [
        cible.id,
        this.d.horloge().toISOString(),
      ])
      await this.journaliser(sql, auteur, "mot-de-passe-reinitialise", cible.email, null, null)
    })
    return { ok: true, valeur: { motDePasseProvisoire: provisoire } }
  }

  /** Après le changement du mot de passe par la personne elle-même (fait dans Supabase Auth). */
  async motDePasseChange(id: string): Promise<void> {
    const p = await this.profil(id)
    if (!p) return
    await this.d.sql.transaction(async (sql) => {
      await sql.requete("update profils set doit_changer_mot_de_passe = false, maj_le = $2::timestamptz where id = $1", [
        id,
        this.d.horloge().toISOString(),
      ])
      await this.journaliser(sql, p, "mot-de-passe-change", p.email, null, null)
    })
  }

  /** Connexion réussie ou refusée (compte désactivé) : gardée au journal. */
  async noterConnexion(p: Profil): Promise<void> {
    await this.journaliser(this.d.sql, p, "connexion", p.email, null, null)
  }
}
