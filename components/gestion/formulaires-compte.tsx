"use client"

import { KeyRound, LockKeyhole } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Logo } from "@/components/site/logo"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/domain/roles"
import { changerMotDePasseGestion, connecterGestion } from "@/services/serveur/actions-gestion"

function Carte({ titre, sousTitre, children, onSubmit }: { titre: string; sousTitre: string; children: ReactNode; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ecume px-4 py-10">
      <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5 rounded-carte border border-bordure bg-white p-6">
        <div className="flex items-center gap-3">
          <Logo taille={44} className="border border-bordure" />
          <div>
            <h1 className="text-[20px] font-extrabold text-marine">{titre}</h1>
            <p className="text-[14px] text-gris">{sousTitre}</p>
          </div>
        </div>
        {children}
      </form>
    </main>
  )
}

/** Connexion d'un membre de l'équipe (e-mail et mot de passe de son compte). */
export function FormulaireConnexion({ suite, refus }: { suite: string | null; refus: boolean }) {
  const [email, setEmail] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [erreur, setErreur] = useState<string | null>(refus ? "Ce compte est désactivé ou inconnu de l’équipe." : null)
  const [enCours, setEnCours] = useState(false)

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      const r = await connecterGestion(email, motDePasse, suite ?? undefined)
      if (r.ok) {
        // Rechargement complet : la page suivante repasse par la vérification du serveur.
        window.location.assign(r.valeur.suite)
        return
      }
      setErreur(r.message)
    } catch {
      setErreur("Connexion impossible pour le moment : réessayez.")
    }
    setEnCours(false)
  }

  return (
    <Carte titre="Gestion LOGIMAR 241" sousTitre="Accès réservé à l’équipe LOGIMAR." onSubmit={valider}>
      <Champ id="email-gestion" libelle="Adresse e-mail">
        <input
          {...ariaChamp("email-gestion", undefined)}
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={classesChamp}
        />
      </Champ>
      <Champ id="mdp-gestion" libelle="Mot de passe">
        <input
          {...ariaChamp("mdp-gestion", undefined)}
          type="password"
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className={classesChamp}
        />
      </Champ>
      {erreur && (
        <p role="alert" className="rounded-champ bg-alerte-pale px-3 py-2 text-[14px] font-semibold text-alerte">
          {erreur}
        </p>
      )}
      <Bouton type="submit" pleineLargeur disabled={enCours || !email.trim() || !motDePasse}>
        <LockKeyhole aria-hidden className="size-4" />
        {enCours ? "Connexion…" : "Se connecter"}
      </Bouton>
      <p className="text-[13px] text-gris">Mot de passe oublié : demandez-en un nouveau à l’administrateur.</p>
    </Carte>
  )
}

/** Choix du mot de passe définitif (obligatoire après un mot de passe provisoire). */
export function FormulaireMotDePasse({ suite, nom }: { suite: string | null; nom: string }) {
  const [nouveau, setNouveau] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const aide = `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères, avec des lettres et des chiffres.`

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)
    try {
      const r = await changerMotDePasseGestion(nouveau, confirmation, suite ?? undefined)
      if (r.ok) {
        window.location.assign(r.valeur.suite)
        return
      }
      setErreur(r.message)
    } catch {
      setErreur("Changement impossible pour le moment : réessayez.")
    }
    setEnCours(false)
  }

  return (
    <Carte titre="Choisissez votre mot de passe" sousTitre={`${nom}, remplacez le mot de passe provisoire.`} onSubmit={valider}>
      <Champ id="mdp-nouveau" libelle="Nouveau mot de passe" aide={aide}>
        <input
          {...ariaChamp("mdp-nouveau", undefined, aide)}
          type="password"
          autoComplete="new-password"
          autoFocus
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          className={classesChamp}
        />
      </Champ>
      <Champ id="mdp-confirmation" libelle="Confirmez le mot de passe">
        <input
          {...ariaChamp("mdp-confirmation", undefined)}
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className={classesChamp}
        />
      </Champ>
      {erreur && (
        <p role="alert" className="rounded-champ bg-alerte-pale px-3 py-2 text-[14px] font-semibold text-alerte">
          {erreur}
        </p>
      )}
      <Bouton type="submit" pleineLargeur disabled={enCours || !nouveau || !confirmation}>
        <KeyRound aria-hidden className="size-4" />
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </Carte>
  )
}
