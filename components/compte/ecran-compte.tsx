"use client"

import { Download, LogOut, Trash2, UserRound } from "lucide-react"
import Link from "next/link"
import { useCallback, useState } from "react"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { formatFCFA } from "@/domain/format"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { formatJourCourt, jourLocal } from "@/domain/temps"
import type { Commande, Reservation } from "@/domain/types"
import { telecharger } from "@/lib/telecharger"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { auth, cleSignatureBillet, repository, type Referentiel } from "@/services"
import { documentsDepuisReference } from "@/services/documents/documents"
import { chargerBilletsListe, ListeBillets } from "./ecran-mes-billets"

export function EcranCompte({ referentiel }: { referentiel: Referentiel }) {
  const maintenant = useMaintenant()
  const [version, setVersion] = useState(0)
  const recharger = () => setVersion((v) => v + 1)

  const charger = useCallback(async () => {
    void version
    const session = await auth.session()
    if (!session) return { session: null, billets: [], commandes: [], dernierEnvoiId: null }
    const reservations: Reservation[] = []
    for (const id of session.client.reservationIds) {
      const r = await repository.getReservation(id)
      if (r && ["emise", "embarquee", "absente"].includes(r.statut)) reservations.push(r)
    }
    const commandes: { commande: Commande; reference: string }[] = []
    for (const r of reservations) {
      if (!r.commandeId || commandes.some((c) => c.commande.id === r.commandeId)) continue
      const commande = await repository.getCommande(r.commandeId)
      if (commande?.numeroFacture) commandes.push({ commande, reference: r.reference })
    }
    const envois = await repository.listerEnvois({ clientId: session.client.id })
    return {
      session,
      billets: await chargerBilletsListe(reservations),
      commandes,
      dernierEnvoiId: envois.at(-1)?.id ?? null,
    }
  }, [version])
  const { donnees } = useDonnees(charger)

  return (
    <main>
      <div className="bg-marine px-5 py-6 text-white md:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[22px] font-bold md:text-[30px]">Mon compte</h1>
          <p className="mt-1 text-[15px] text-white/85">Billets, factures et passagers enregistrés.</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8">
        {!donnees ? (
          <div className="h-60 animate-pulse rounded-carte bg-white" />
        ) : !donnees.session ? (
          <Connexion referentiel={referentiel} onConnecte={recharger} />
        ) : donnees.session.verificationRequise ? (
          <Verification
            email={donnees.session.client.email ?? ""}
            envoiId={donnees.dernierEnvoiId}
            onVerifie={recharger}
          />
        ) : (
          <Profil
            donnees={donnees}
            referentiel={referentiel}
            maintenant={maintenant}
            onChange={recharger}
          />
        )}
      </div>
    </main>
  )
}

function Connexion({ referentiel, onConnecte }: { referentiel: Referentiel; onConnecte: () => void }) {
  const [mode, setMode] = useState<"connexion" | "oubli" | "nouveau">("connexion")
  const [identifiant, setIdentifiant] = useState("")
  const [motDePasse, setMotDePasse] = useState("")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState<{ ton: "erreur" | "info"; texte: string; envoiId?: string } | null>(null)

  async function connecter(e: React.FormEvent) {
    e.preventDefault()
    const r = await auth.connecter(identifiant, motDePasse)
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.message })
    onConnecte()
  }

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault()
    const r = await auth.demanderReinitialisation(identifiant)
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.message })
    if (r.valeur.canal === "agence") {
      const numeros = referentiel.agences.map((a) => `${a.ville} : ${a.telephones.join(" / ")}`).join(" ; ")
      return setMessage({
        ton: "info",
        texte: `Pour un compte créé avec un téléphone, la réinitialisation se fait en agence (le SMS arrivera plus tard). ${numeros}.`,
      })
    }
    setMode("nouveau")
    setMessage({ ton: "info", texte: `Un code a été envoyé à ${identifiant.trim().toLowerCase()}.`, envoiId: r.valeur.envoiId })
  }

  async function reinitialiser(e: React.FormEvent) {
    e.preventDefault()
    const r = await auth.reinitialiser(identifiant, code, motDePasse)
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.message })
    onConnecte()
  }

  const champIdentifiant = (
    <Champ id="identifiant" libelle="Téléphone ou e-mail">
      <input
        {...ariaChamp("identifiant")}
        autoComplete="username"
        placeholder="+241 … ou nom@exemple.com"
        value={identifiant}
        onChange={(e) => setIdentifiant(e.target.value)}
        className={classesChamp}
      />
    </Champ>
  )

  return (
    <section className="space-y-4 rounded-carte border border-bordure bg-white p-4">
      <h2 className="font-sans text-[17px] font-bold text-marine">
        {mode === "connexion" ? "Se connecter" : "Mot de passe oublié"}
      </h2>
      {mode === "connexion" && (
        <form onSubmit={connecter} className="space-y-3">
          {champIdentifiant}
          <Champ id="mot-de-passe" libelle="Mot de passe">
            <input
              {...ariaChamp("mot-de-passe")}
              type="password"
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className={classesChamp}
            />
          </Champ>
          <Bouton type="submit" taille="grand" pleineLargeur>
            Se connecter
          </Bouton>
        </form>
      )}
      {mode === "oubli" && (
        <form onSubmit={demanderCode} className="space-y-3">
          {champIdentifiant}
          <Bouton type="submit" taille="grand" pleineLargeur>
            Recevoir un code
          </Bouton>
        </form>
      )}
      {mode === "nouveau" && (
        <form onSubmit={reinitialiser} className="space-y-3">
          <Champ id="code-reinitialisation" libelle="Code reçu par e-mail">
            <input
              {...ariaChamp("code-reinitialisation")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={classesChamp}
            />
          </Champ>
          <Champ id="nouveau-mdp" libelle="Nouveau mot de passe" aide="8 caractères au moins.">
            <input
              {...ariaChamp("nouveau-mdp", undefined, "8 caractères au moins.")}
              type="password"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className={classesChamp}
            />
          </Champ>
          <Bouton type="submit" taille="grand" pleineLargeur>
            Changer le mot de passe
          </Bouton>
        </form>
      )}
      {message && (
        <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "text-sm font-semibold text-alerte" : "text-sm text-gris"}>
          {message.texte}
          {message.envoiId && (
            <>
              {" "}
              <Link href={`/apercu-email/${message.envoiId}`} className="font-semibold text-action underline">
                Voir l’aperçu de l’e-mail
              </Link>
            </>
          )}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setMode(mode === "connexion" ? "oubli" : "connexion")
          setMessage(null)
        }}
        className="min-h-12 font-semibold text-action underline"
      >
        {mode === "connexion" ? "Mot de passe oublié ?" : "Revenir à la connexion"}
      </button>
      <p className="text-sm text-gris">
        Pas encore de compte ? Il se crée après une réservation, depuis l’écran du billet. Réserver reste possible sans
        compte.
      </p>
    </section>
  )
}

function Verification({ email, envoiId, onVerifie }: { email: string; envoiId: string | null; onVerifie: () => void }) {
  const [code, setCode] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [dernierEnvoi, setDernierEnvoi] = useState(envoiId)

  async function verifier(e: React.FormEvent) {
    e.preventDefault()
    const r = await auth.verifierCode(code)
    if (!r.ok) return setErreur(r.message)
    onVerifie()
  }

  return (
    <form onSubmit={verifier} className="space-y-3 rounded-carte border border-bordure bg-white p-4">
      <h2 className="font-sans text-[17px] font-bold text-marine">Confirmez votre adresse e-mail</h2>
      <p className="text-sm text-gris">
        Saisissez le code envoyé à <strong className="text-encre">{email}</strong>.
        {dernierEnvoi && (
          <>
            {" "}
            <Link href={`/apercu-email/${dernierEnvoi}`} className="font-semibold text-action underline">
              Voir l’aperçu de l’e-mail
            </Link>
          </>
        )}
      </p>
      <Champ id="code-compte" libelle="Code à 6 chiffres" erreur={erreur ?? undefined}>
        <input
          {...ariaChamp("code-compte", erreur ?? undefined)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={classesChamp}
        />
      </Champ>
      <Bouton type="submit" taille="grand" pleineLargeur disabled={code.length !== 6}>
        Vérifier
      </Bouton>
      <button
        type="button"
        className="min-h-12 font-semibold text-action underline"
        onClick={async () => {
          const r = await auth.renvoyerCode()
          if (r.ok) setDernierEnvoi(r.valeur.envoiId)
        }}
      >
        Renvoyer un code
      </button>
    </form>
  )
}

function Profil({
  donnees,
  referentiel,
  maintenant,
  onChange,
}: {
  donnees: {
    session: NonNullable<Awaited<ReturnType<typeof auth.session>>>
    billets: Awaited<ReturnType<typeof chargerBilletsListe>>
    commandes: { commande: Commande; reference: string }[]
  }
  referentiel: Referentiel
  maintenant: Date | null
  onChange: () => void
}) {
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)
  const { client } = donnees.session
  const aVenir = donnees.billets.filter((b) => maintenant && Date.parse(b.traversee.arriveeAt) > maintenant.getTime())
  const passes = donnees.billets.filter((b) => maintenant && Date.parse(b.traversee.arriveeAt) <= maintenant.getTime())

  async function facture(reference: string, numero: string) {
    const documents = await documentsDepuisReference(repository, reference, cleSignatureBillet)
    if (!documents?.facture) return
    const { facturePdf } = await import("@/services/documents/pdf")
    telecharger(await facturePdf(documents.facture), `facture-${numero}.pdf`)
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-3 rounded-carte border border-bordure bg-white p-4">
        <UserRound aria-hidden className="size-10 shrink-0 rounded-full bg-bleu-pale p-2 text-marine" />
        <div className="min-w-0 flex-1 basis-48">
          <p className="break-all font-bold">{client.email ?? client.telephone}</p>
          {client.email && client.telephone && <p className="text-sm text-gris">{client.telephone}</p>}
        </div>
        <button
          type="button"
          onClick={async () => {
            await auth.deconnecter()
            onChange()
          }}
          className="inline-flex min-h-12 items-center gap-1.5 rounded-champ px-3 font-semibold text-action hover:bg-bleu-pale"
        >
          <LogOut aria-hidden className="size-5" /> Se déconnecter
        </button>
      </section>

      <section aria-labelledby="titre-billets">
        <h2 id="titre-billets" className="mb-3 text-[19px] font-bold text-marine">
          Billets à venir
        </h2>
        {aVenir.length > 0 ? (
          <ListeBillets billets={aVenir} referentiel={referentiel} />
        ) : (
          <p className="rounded-carte border border-bordure bg-white p-4 text-gris">Aucun billet à venir.</p>
        )}
        {passes.length > 0 && (
          <>
            <h3 className="mb-3 mt-5 font-sans text-[16px] font-bold text-gris">Voyages passés</h3>
            <ListeBillets billets={passes} referentiel={referentiel} passe />
          </>
        )}
      </section>

      <section aria-labelledby="titre-factures">
        <h2 id="titre-factures" className="mb-3 text-[19px] font-bold text-marine">
          Factures
        </h2>
        {donnees.commandes.length === 0 ? (
          <p className="rounded-carte border border-bordure bg-white p-4 text-gris">Aucune facture.</p>
        ) : (
          <ul className="divide-y divide-bordure rounded-carte border border-bordure bg-white">
            {donnees.commandes.map(({ commande, reference }) => (
              <li key={commande.id} className="flex items-center justify-between gap-3 p-3.5">
                <span>
                  <span className="block font-semibold">{commande.numeroFacture}</span>
                  <span className="text-sm text-gris">
                    {commande.factureEmiseLe && formatJourCourt(jourLocal(commande.factureEmiseLe))} · {formatFCFA(commande.total)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => facture(reference, commande.numeroFacture ?? "")}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-champ border border-bordure-champ px-3 font-semibold text-action hover:bg-bleu-pale"
                >
                  <Download aria-hidden className="size-4" /> PDF
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-passagers">
        <h2 id="titre-passagers" className="mb-1 text-[19px] font-bold text-marine">
          Passagers enregistrés
        </h2>
        <p className="mb-3 text-sm text-gris">Proposés pour pré-remplir vos prochaines réservations.</p>
        {client.passagers.length === 0 ? (
          <p className="rounded-carte border border-bordure bg-white p-4 text-gris">Aucun passager enregistré.</p>
        ) : (
          <ul className="divide-y divide-bordure rounded-carte border border-bordure bg-white">
            {client.passagers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3.5">
                <span>
                  <span className="block font-semibold">
                    {p.nom} {p.prenom}
                  </span>
                  <span className="text-sm text-gris">
                    {libelleCategorie(p.categorie).replace(/^./, (c) => c.toUpperCase())}
                    {p.typePiece && ` · ${LIBELLES_PIECES_COURTS[p.typePiece]}`}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${p.prenom} ${p.nom}`}
                  onClick={async () => {
                    await auth.supprimerPassager(p.id)
                    onChange()
                  }}
                  className="flex size-12 items-center justify-center rounded-champ text-gris hover:bg-ecume hover:text-alerte"
                >
                  <Trash2 aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-carte border border-bordure bg-white p-4">
        <h2 className="font-sans text-[16px] font-bold text-encre">Supprimer mon compte</h2>
        <p className="mt-1 text-sm text-gris">
          Vos billets restent valables et consultables avec leur référence ; le compte et les passagers enregistrés
          sont effacés.
        </p>
        {confirmerSuppression ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Bouton
              className="bg-alerte hover:bg-alerte"
              onClick={async () => {
                await auth.supprimerCompte()
                onChange()
              }}
            >
              Confirmer la suppression
            </Bouton>
            <Bouton variante="contour" onClick={() => setConfirmerSuppression(false)}>
              Annuler
            </Bouton>
          </div>
        ) : (
          <Bouton variante="contour" className="mt-3" onClick={() => setConfirmerSuppression(true)}>
            Supprimer mon compte
          </Bouton>
        )}
      </section>
    </>
  )
}
