"use client"

import { Copy, KeyRound, UserPlus } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { DESCRIPTIONS_ROLES, LIBELLES_ROLES, ROLES, type RoleGestion } from "@/domain/roles"
import { formatJourCourt, heureLocale, jourLocal } from "@/domain/temps"
import { gestionParComptes } from "@/services/mode-gestion"
import type { EntreeJournal, Profil } from "@/services/serveur/comptes-gestion"
import {
  creerCompteGestion,
  lireComptesGestion,
  modifierCompteGestion,
  reinitialiserMotDePasseGestion,
} from "@/services/serveur/actions-gestion"
import { classesSelect, EnTetePage, Section, Tableau } from "./elements"

const LIBELLES_ACTIONS: Record<string, string> = {
  "compte-cree": "Compte créé",
  "role-modifie": "Rôle modifié",
  "compte-desactive": "Compte désactivé",
  "compte-reactive": "Compte réactivé",
  "mot-de-passe-reinitialise": "Mot de passe réinitialisé",
  "mot-de-passe-change": "Mot de passe changé",
  connexion: "Connexion",
}

const quand = (le: string) => `${formatJourCourt(jourLocal(le))} ${heureLocale(le)}`

/** Mot de passe provisoire, montré une seule fois à l'administrateur pour qu'il le transmette. */
function Provisoire({ pour, motDePasse, onFermer }: { pour: string; motDePasse: string; onFermer: () => void }) {
  const [copie, setCopie] = useState(false)
  return (
    <div role="status" className="space-y-2 rounded-carte border-2 border-soleil-bordure bg-soleil-pale p-4 text-encre">
      <p className="text-[14px]">
        Mot de passe provisoire de <strong>{pour}</strong>, à transmettre de vive voix ou par message. Il ne sera plus affiché.
        La personne choisira son propre mot de passe à sa première connexion.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-champ bg-white px-3 py-2 font-mono text-[18px] tracking-wider">{motDePasse}</code>
        <Bouton
          variante="contour"
          taille="compact"
          onClick={() => {
            void navigator.clipboard?.writeText(motDePasse).then(() => setCopie(true))
          }}
        >
          <Copy aria-hidden className="size-4" /> {copie ? "Copié" : "Copier"}
        </Bouton>
        <Bouton variante="contour" taille="compact" onClick={onFermer}>
          C’est transmis
        </Bouton>
      </div>
    </div>
  )
}

export function EcranUtilisateurs() {
  const [donnees, setDonnees] = useState<{ profils: Profil[]; journal: EntreeJournal[]; moi: string } | null>(null)
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [nom, setNom] = useState("")
  const [role, setRole] = useState<RoleGestion>("direction")
  const [message, setMessage] = useState<{ ton: "succes" | "alerte"; texte: string } | null>(null)
  const [provisoire, setProvisoire] = useState<{ pour: string; motDePasse: string } | null>(null)
  const [enCours, setEnCours] = useState(false)

  const charger = useCallback(async () => {
    try {
      setDonnees(await lireComptesGestion())
      setErreurChargement(null)
    } catch {
      setErreurChargement("Lecture des comptes impossible (accès réservé à l’administrateur).")
    }
  }, [])

  useEffect(() => {
    if (!gestionParComptes) return
    let actif = true
    lireComptesGestion()
      .then((d) => {
        if (actif) setDonnees(d)
      })
      .catch(() => {
        if (actif) setErreurChargement("Lecture des comptes impossible (accès réservé à l’administrateur).")
      })
    return () => {
      actif = false
    }
  }, [])

  if (!gestionParComptes) {
    return (
      <>
        <EnTetePage titre="Utilisateurs" />
        <p className="rounded-carte border border-bordure bg-white p-4 text-[14px]">
          Version de démonstration sur ce poste : un simple code protège la gestion. Les comptes de l’équipe sont actifs sur le site
          en ligne.
        </p>
      </>
    )
  }

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setMessage(null)
    const r = await creerCompteGestion({ email, nom, role }).catch(() => ({ ok: false as const, message: "Création impossible : réessayez." }))
    setEnCours(false)
    if (!r.ok) {
      setMessage({ ton: "alerte", texte: r.message })
      return
    }
    setProvisoire({ pour: `${r.valeur.profil.nom} (${r.valeur.profil.email})`, motDePasse: r.valeur.motDePasseProvisoire })
    setEmail("")
    setNom("")
    await charger()
  }

  async function modifier(p: Profil, changement: { role?: RoleGestion; actif?: boolean }) {
    setMessage(null)
    const r = await modifierCompteGestion(p.id, changement).catch(() => ({ ok: false as const, message: "Modification impossible." }))
    setMessage(r.ok ? { ton: "succes", texte: `Compte de ${p.nom} mis à jour.` } : { ton: "alerte", texte: r.message })
    await charger()
  }

  async function reinitialiser(p: Profil) {
    if (!window.confirm(`Donner un nouveau mot de passe provisoire à ${p.nom} ? L’ancien ne marchera plus.`)) return
    setMessage(null)
    const r = await reinitialiserMotDePasseGestion(p.id).catch(() => ({ ok: false as const, message: "Réinitialisation impossible." }))
    if (r.ok) setProvisoire({ pour: `${p.nom} (${p.email})`, motDePasse: r.valeur.motDePasseProvisoire })
    else setMessage({ ton: "alerte", texte: r.message })
    await charger()
  }

  return (
    <>
      <EnTetePage titre="Utilisateurs" sousTitre="Comptes de l’équipe LOGIMAR : rôle, état, mot de passe provisoire." />

      {provisoire && <Provisoire pour={provisoire.pour} motDePasse={provisoire.motDePasse} onFermer={() => setProvisoire(null)} />}
      {message && (
        <p role={message.ton === "alerte" ? "alert" : "status"} className={message.ton === "alerte" ? "rounded-champ bg-alerte-pale px-4 py-2 text-[14px] font-semibold text-alerte" : "rounded-champ bg-vert-pale px-4 py-2 text-[14px] font-semibold text-foret-texte"}>
          {message.texte}
        </p>
      )}
      {erreurChargement && (
        <p role="alert" className="rounded-champ bg-alerte-pale px-4 py-2 text-[14px] text-alerte">
          {erreurChargement}
        </p>
      )}

      <Section titre="Ajouter un membre de l’équipe">
        <form onSubmit={creer} className="grid gap-4 md:grid-cols-[1fr_1fr_14rem_auto] md:items-end">
          <Champ id="nouvel-email" libelle="Adresse e-mail">
            <input {...ariaChamp("nouvel-email")} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={classesChamp} />
          </Champ>
          <Champ id="nouveau-nom" libelle="Nom">
            <input {...ariaChamp("nouveau-nom")} type="text" autoComplete="off" value={nom} onChange={(e) => setNom(e.target.value)} className={classesChamp} />
          </Champ>
          <Champ id="nouveau-role" libelle="Rôle">
            <select id="nouveau-role" value={role} onChange={(e) => setRole(e.target.value as RoleGestion)} className={classesChamp}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {LIBELLES_ROLES[r]}
                </option>
              ))}
            </select>
          </Champ>
          <Bouton type="submit" disabled={enCours || !email.trim() || !nom.trim()}>
            <UserPlus aria-hidden className="size-4" /> {enCours ? "Création…" : "Créer le compte"}
          </Bouton>
        </form>
        <p className="mt-3 text-[13px] text-gris">{DESCRIPTIONS_ROLES[role]}</p>
      </Section>

      <Section titre="Comptes">
        {!donnees ? (
          <p className="py-6 text-center text-[14px] text-gris">Chargement des comptes…</p>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse e-mail</th>
                <th>Rôle</th>
                <th>État</th>
                <th>Créé le</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {donnees.profils.map((p) => {
                const moi = p.id === donnees.moi
                return (
                  <tr key={p.id} className={p.actif ? undefined : "text-gris"}>
                    <td className="font-semibold">
                      {p.nom}
                      {moi && <span className="ml-1 font-normal text-gris">(vous)</span>}
                    </td>
                    <td>{p.email}</td>
                    <td>
                      {moi ? (
                        LIBELLES_ROLES[p.role]
                      ) : (
                        <select
                          aria-label={`Rôle de ${p.nom}`}
                          value={p.role}
                          onChange={(e) => void modifier(p, { role: e.target.value as RoleGestion })}
                          className={classesSelect}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {LIBELLES_ROLES[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        <Badge ton={p.actif ? "succes" : "alerte"} className="px-2 py-0.5 text-[12px]">
                          {p.actif ? "Actif" : "Désactivé"}
                        </Badge>
                        {p.doitChangerMotDePasse && (
                          <Badge ton="soleil" className="px-2 py-0.5 text-[12px]">
                            Mot de passe provisoire
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{quand(p.creeLe)}</td>
                    <td>
                      {!moi && (
                        <span className="flex flex-wrap justify-end gap-2">
                          <Bouton variante="contour" taille="libre" className="h-8 px-3 text-[13px]" onClick={() => void reinitialiser(p)}>
                            <KeyRound aria-hidden className="size-3.5" /> Nouveau mot de passe
                          </Bouton>
                          <Bouton
                            variante="contour"
                            taille="libre"
                            className="h-8 px-3 text-[13px]"
                            onClick={() => void modifier(p, { actif: !p.actif })}
                          >
                            {p.actif ? "Désactiver" : "Réactiver"}
                          </Bouton>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Tableau>
        )}
      </Section>

      {donnees && donnees.journal.length > 0 && (
        <Section titre="Journal des comptes">
          <Tableau>
            <thead>
              <tr>
                <th>Quand</th>
                <th>Qui</th>
                <th>Action</th>
                <th>Compte</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {donnees.journal.map((j) => (
                <tr key={j.id}>
                  <td className="whitespace-nowrap">{quand(j.le)}</td>
                  <td>{j.auteurNom}</td>
                  <td>{LIBELLES_ACTIONS[j.action] ?? j.action}</td>
                  <td>{j.cible ?? "—"}</td>
                  <td className="text-gris">
                    {j.avant || j.apres
                      ? [j.avant, j.apres]
                          .map((x) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).join(", ") : ""))
                          .filter(Boolean)
                          .join(" → ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Section>
      )}
    </>
  )
}
