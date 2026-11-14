"use client"

import Link from "next/link"
import { useState } from "react"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { auth } from "@/services"

type Etape =
  | { nom: "proposition" }
  | { nom: "mot-de-passe"; erreur: string | null; enCours: boolean }
  | { nom: "code"; envoiId: string | null; erreur: string | null }
  | { nom: "termine" }
  | { nom: "plus-tard" }

/** « Gardez vos billets dans l'application » : création du compte juste après le paiement. */
export function CarteCompte({ commandeId, identifiant }: { commandeId: string; identifiant: string }) {
  const [etape, setEtape] = useState<Etape>({ nom: "proposition" })
  const [motDePasse, setMotDePasse] = useState("")
  const [code, setCode] = useState("")

  if (etape.nom === "plus-tard") return null

  async function creer() {
    setEtape({ nom: "mot-de-passe", erreur: null, enCours: true })
    const r = await auth.creerCompte(commandeId, motDePasse)
    if (!r.ok) return setEtape({ nom: "mot-de-passe", erreur: r.message, enCours: false })
    setEtape(r.valeur.verificationRequise ? { nom: "code", envoiId: r.valeur.envoiId, erreur: null } : { nom: "termine" })
  }

  async function verifier() {
    const r = await auth.verifierCode(code)
    if (!r.ok) return setEtape({ nom: "code", envoiId: etape.nom === "code" ? etape.envoiId : null, erreur: r.message })
    setEtape({ nom: "termine" })
  }

  return (
    <section aria-labelledby="titre-compte" className="rounded-billet bg-white p-5 text-encre">
      <h2 id="titre-compte" className="font-sans text-[17px] font-bold text-marine">
        {etape.nom === "termine" ? "Compte créé" : "Gardez vos billets dans l’application"}
      </h2>

      {etape.nom === "proposition" && (
        <>
          <p className="mt-1 text-sm text-gris">
            Choisissez un mot de passe pour le <strong className="text-encre">{identifiant}</strong> : billets, factures
            et passagers enregistrés pour la prochaine fois.
          </p>
          <Bouton variante="succes" pleineLargeur className="mt-4" onClick={() => setEtape({ nom: "mot-de-passe", erreur: null, enCours: false })}>
            Créer mon compte
          </Bouton>
          <button
            type="button"
            onClick={() => setEtape({ nom: "plus-tard" })}
            className="mt-2 block min-h-12 w-full text-center font-semibold text-action underline"
          >
            Plus tard
          </button>
        </>
      )}

      {etape.nom === "mot-de-passe" && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void creer()
          }}
        >
          <input type="text" autoComplete="username" value={identifiant} readOnly hidden />
          <Champ id="nouveau-mot-de-passe" libelle="Mot de passe" erreur={etape.erreur ?? undefined} aide="8 caractères au moins.">
            <input
              {...ariaChamp("nouveau-mot-de-passe", etape.erreur ?? undefined, "8 caractères au moins.")}
              type="password"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className={classesChamp}
            />
          </Champ>
          <Bouton type="submit" variante="succes" pleineLargeur disabled={etape.enCours}>
            {etape.enCours ? "Création…" : "Créer mon compte"}
          </Bouton>
        </form>
      )}

      {etape.nom === "code" && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void verifier()
          }}
        >
          <p className="text-sm text-gris">
            Un code de vérification a été envoyé à <strong className="text-encre">{identifiant}</strong>.
            {etape.envoiId && (
              <>
                {" "}
                <Link href={`/apercu-email/${etape.envoiId}`} className="font-semibold text-action underline">
                  Voir l’aperçu de l’e-mail
                </Link>
              </>
            )}
          </p>
          <Champ id="code-verification" libelle="Code reçu par e-mail" erreur={etape.erreur ?? undefined}>
            <input
              {...ariaChamp("code-verification", etape.erreur ?? undefined)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={classesChamp}
            />
          </Champ>
          <Bouton type="submit" variante="succes" pleineLargeur disabled={code.length !== 6}>
            Vérifier
          </Bouton>
        </form>
      )}

      {etape.nom === "termine" && (
        <p className="mt-1 text-sm text-gris">
          Vos billets, factures et passagers sont enregistrés.{" "}
          <Link href="/compte" className="font-semibold text-action underline">
            Voir mon compte
          </Link>
        </p>
      )}
    </section>
  )
}
