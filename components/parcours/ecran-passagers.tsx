"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { validerContact } from "@/domain/contact"
import { formatFCFA } from "@/domain/format"
import {
  categoriesDe,
  LIBELLES_PIECES,
  libelleCategorie,
  trancheAge,
  validerPassager,
  type BornesAge,
  type ErreursPassager,
  type SaisiePassager,
} from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { versParametres, type CriteresRecherche } from "@/domain/recherche"
import { meilleureOffre } from "@/domain/tarifs"
import { formatJourCourt, heureLocale } from "@/domain/temps"
import type { CodeFamille, TypePiece } from "@/domain/types"
import { useCriteres } from "@/lib/use-criteres"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { repository, serviceReservation, type Inventaire, type Referentiel } from "@/services"
import { lireJson, stockageNavigateur } from "@/services/stockage"
import { BarreBasse } from "./barre-basse"
import { EnTeteParcours } from "./en-tete-parcours"

interface Brouillon {
  telephone: string
  email: string
  passagers: SaisiePassager[]
}

const FAMILLES: CodeFamille[] = ["ECO", "STD", "FLEX"]

export function EcranPassagers({ referentiel }: { referentiel: Referentiel }) {
  const { ports, config } = referentiel
  const maintenant = useMaintenant()
  const { criteres, traverseeId, famille } = useCriteres(ports, config.passagersMax)
  const familleCode = FAMILLES.find((f) => f === famille)

  const charger = useCallback(async () => {
    if (!traverseeId || !maintenant) return null
    const [inventaire] = await repository.listerInventaires([traverseeId], maintenant)
    return inventaire ?? null
  }, [traverseeId, maintenant])
  const { donnees: inventaire } = useDonnees(traverseeId && maintenant ? charger : null)

  if (!criteres || !traverseeId || !familleCode || inventaire === null) {
    return <ParcoursInterrompu message="Il manque des informations sur la traversée choisie." />
  }
  if (inventaire === undefined) {
    return <div className="mx-auto mt-6 h-96 max-w-3xl animate-pulse rounded-carte bg-white" />
  }
  return (
    <FormulairePassagers
      referentiel={referentiel}
      criteres={criteres}
      inventaire={inventaire}
      familleCode={familleCode}
    />
  )
}

function ParcoursInterrompu({ message, retour = "/" }: { message: string; retour?: string }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
      <p role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">
        {message}
      </p>
      <Link href={retour} className={classesBouton({ pleineLargeur: true })}>
        Revenir à la recherche
      </Link>
    </main>
  )
}

function brouillonInitial(cle: string, criteres: CriteresRecherche): Brouillon {
  const categories = categoriesDe(criteres.passagers)
  const vide: Brouillon = {
    telephone: "",
    email: "",
    passagers: categories.map((categorie) => ({
      categorie,
      nom: "",
      prenom: "",
      dateNaissance: "",
      typePiece: "",
      numeroPiece: "",
    })),
  }
  const lu = lireJson<Brouillon | null>(sessionStockage(), cle, null)
  const memesCategories =
    lu?.passagers?.length === categories.length && lu.passagers.every((p, i) => p.categorie === categories[i])
  return lu && memesCategories ? lu : vide
}

/** Brouillon conservé le temps de l'onglet (retour arrière sans perdre la saisie). */
function sessionStockage() {
  if (typeof window === "undefined") return stockageNavigateur()
  return {
    lire: (cle: string) => {
      try {
        return window.sessionStorage.getItem(cle)
      } catch {
        return null
      }
    },
    ecrire: (cle: string, valeur: string) => {
      try {
        window.sessionStorage.setItem(cle, valeur)
      } catch {
        // sans importance : la saisie reste à l'écran
      }
    },
  }
}

function FormulairePassagers({
  referentiel,
  criteres,
  inventaire,
  familleCode,
}: {
  referentiel: Referentiel
  criteres: CriteresRecherche
  inventaire: Inventaire
  familleCode: CodeFamille
}) {
  const { config, familles } = referentiel
  const router = useRouter()
  const traversee = inventaire.traversee
  const jourVoyage = jourDeDepart(traversee)
  const cle = `logimar-demo:brouillon:${traversee.id}:${criteres.passagers.adultes}-${criteres.passagers.enfants}-${criteres.passagers.bebes}`
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonInitial(cle, criteres))
  const [afficherErreurs, setAfficherErreurs] = useState(false)
  const [envoi, setEnvoi] = useState<{ enCours: boolean; erreur: string | null }>({ enCours: false, erreur: null })

  useEffect(() => {
    sessionStockage().ecrire(cle, JSON.stringify(brouillon))
  }, [cle, brouillon])

  const offre = meilleureOffre(
    inventaire.classes,
    familleCode,
    criteres.passagers,
    traversee.capaciteVendable,
    inventaire.occupation,
  )
  const retourResultats = `/resultats?${versParametres(criteres)}`
  if (!offre.disponible) {
    return (
      <ParcoursInterrompu
        message="Ce tarif n’est plus disponible pour ce nombre de passagers. Choisissez un autre tarif ou une autre date."
        retour={retourResultats}
      />
    )
  }

  const erreursContact = validerContact(brouillon)
  const erreursPassagers: ErreursPassager[] = brouillon.passagers.map((p) =>
    validerPassager(p, jourVoyage, config.bornesAge),
  )
  const valide =
    Object.keys(erreursContact).length === 0 && erreursPassagers.every((e) => Object.keys(e).length === 0)
  const sousTitre = `${criteres.depart} → ${criteres.arrivee} · ${formatJourCourt(jourVoyage)} · ${heureLocale(traversee.departAt)}`
  const nomFamille = familles.find((f) => f.code === familleCode)?.nom ?? familleCode

  const modifierPassager = (index: number, champ: keyof SaisiePassager, valeur: string) =>
    setBrouillon((b) => ({
      ...b,
      passagers: b.passagers.map((p, i) => (i === index ? { ...p, [champ]: valeur } : p)),
    }))

  async function continuer() {
    setAfficherErreurs(true)
    if (!valide) {
      const premier = document.querySelector<HTMLElement>("[aria-invalid='true']")
      premier?.focus()
      return
    }
    setEnvoi({ enCours: true, erreur: null })
    const resultat = await serviceReservation.bloquer({
      traverseeId: traversee.id,
      familleCode,
      passagers: brouillon.passagers,
      telephone: brouillon.telephone,
      email: brouillon.email,
      totalAffiche: offre.disponible ? offre.total : 0,
    })
    if (!resultat.ok) {
      setEnvoi({ enCours: false, erreur: resultat.message })
      return
    }
    const { reservation, prixModifie } = resultat.valeur
    router.push(`/paiement/${reservation.id}${prixModifie ? "?prix=modifie" : ""}`)
  }

  return (
    <main>
      <EnTeteParcours titre="Passagers" sousTitre={sousTitre} retour={{ href: retourResultats }} etape={1} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:px-8">
        <section aria-labelledby="titre-contact" className="rounded-carte border border-bordure bg-white p-4">
          <h2 id="titre-contact" className="font-sans text-[17px] font-bold text-marine">
            Contact de la réservation
          </h2>
          <p className="mt-1 text-sm text-gris">
            Renseignez <strong className="text-encre">au moins l’un des deux</strong> : il servira à retrouver votre
            billet.
          </p>
          <div className="mt-3 space-y-3">
            <Champ id="telephone" libelle="Téléphone" erreur={afficherErreurs ? erreursContact.telephone : undefined}>
              <input
                {...ariaChamp("telephone", afficherErreurs ? (erreursContact.telephone ?? erreursContact.general) : undefined)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+241 07 12 34 56"
                value={brouillon.telephone}
                onChange={(e) => setBrouillon((b) => ({ ...b, telephone: e.target.value }))}
                className={classesChamp}
              />
            </Champ>
            <Champ id="email" libelle="E-mail" erreur={afficherErreurs ? erreursContact.email : undefined}>
              <input
                {...ariaChamp("email", afficherErreurs ? erreursContact.email : undefined)}
                type="email"
                autoComplete="email"
                placeholder="Billet et facture envoyés en PDF"
                value={brouillon.email}
                onChange={(e) => setBrouillon((b) => ({ ...b, email: e.target.value }))}
                className={classesChamp}
              />
            </Champ>
            {afficherErreurs && erreursContact.general && (
              <p className="text-[13px] font-semibold text-alerte">{erreursContact.general}</p>
            )}
          </div>
          <p className="mt-3 text-[13px] text-gris">
            Pas besoin de compte pour réserver. Le billet reste disponible dans l’application avec sa référence.
          </p>
        </section>

        {brouillon.passagers.map((p, i) => (
          <FichePassager
            key={i}
            index={i}
            saisie={p}
            erreurs={afficherErreurs ? erreursPassagers[i] : {}}
            complete={Object.keys(erreursPassagers[i]).length === 0}
            jourVoyage={jourVoyage}
            bornes={config.bornesAge}
            onChange={(champ, valeur) => modifierPassager(i, champ, valeur)}
          />
        ))}

        {envoi.erreur && (
          <p role="alert" className="rounded-carte bg-alerte-pale p-4 font-semibold text-alerte">
            {envoi.erreur}{" "}
            <Link href={retourResultats} className="underline">
              Revenir aux résultats
            </Link>
          </p>
        )}
      </div>

      <BarreBasse>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gris">
            {nomFamille} · Total
          </p>
          <p className="font-titre text-[20px] font-bold tabular-nums text-marine">{formatFCFA(offre.total)}</p>
        </div>
        <Bouton taille="grand" className="min-w-40" onClick={continuer} disabled={envoi.enCours}>
          {envoi.enCours ? "Blocage…" : "Continuer"}
        </Bouton>
      </BarreBasse>
    </main>
  )
}

function FichePassager({
  index,
  saisie,
  erreurs,
  complete,
  jourVoyage,
  bornes,
  onChange,
}: {
  index: number
  saisie: SaisiePassager
  erreurs: ErreursPassager
  complete: boolean
  jourVoyage: string
  bornes: BornesAge
  onChange: (champ: keyof SaisiePassager, valeur: string) => void
}) {
  const id = (champ: string) => `p${index + 1}-${champ}`
  const adulte = saisie.categorie === "adulte"
  const titre = `Passager ${index + 1} · ${libelleCategorie(saisie.categorie).replace(/^./, (c) => c.toUpperCase())}`
  return (
    <section
      aria-labelledby={id("titre")}
      className="rounded-carte border border-bordure bg-white p-4 focus-within:border-2 focus-within:border-action"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={id("titre")} className="font-sans text-[17px] font-bold text-marine">
          {titre}
        </h2>
        {complete ? <Badge ton="succes">Complet</Badge> : <span className="text-sm text-gris">{trancheAge(saisie.categorie, bornes)}</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Champ id={id("nom")} libelle="Nom" erreur={erreurs.nom}>
          <input
            {...ariaChamp(id("nom"), erreurs.nom)}
            autoComplete={index === 0 ? "family-name" : "off"}
            value={saisie.nom}
            onChange={(e) => onChange("nom", e.target.value)}
            className={classesChamp}
          />
        </Champ>
        <Champ id={id("prenom")} libelle="Prénom" erreur={erreurs.prenom}>
          <input
            {...ariaChamp(id("prenom"), erreurs.prenom)}
            autoComplete={index === 0 ? "given-name" : "off"}
            value={saisie.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
            className={classesChamp}
          />
        </Champ>
      </div>
      {adulte ? (
        <div className="mt-3 space-y-3">
          <Champ id={id("piece")} libelle="Pièce d’identité" erreur={erreurs.typePiece}>
            <select
              {...ariaChamp(id("piece"), erreurs.typePiece)}
              value={saisie.typePiece}
              onChange={(e) => onChange("typePiece", e.target.value as TypePiece | "")}
              className={classesChamp}
            >
              <option value="">Choisir…</option>
              {(Object.keys(LIBELLES_PIECES) as TypePiece[]).map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_PIECES[t]}
                </option>
              ))}
            </select>
          </Champ>
          <Champ
            id={id("numero")}
            libelle="Numéro de la pièce"
            erreur={erreurs.numeroPiece}
            aide="À présenter à l’embarquement."
          >
            <input
              {...ariaChamp(id("numero"), erreurs.numeroPiece, "À présenter à l’embarquement.")}
              autoComplete="off"
              autoCapitalize="characters"
              value={saisie.numeroPiece}
              onChange={(e) => onChange("numeroPiece", e.target.value)}
              className={classesChamp}
            />
          </Champ>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <Champ id={id("naissance")} libelle="Date de naissance" erreur={erreurs.dateNaissance}>
            <input
              {...ariaChamp(id("naissance"), erreurs.dateNaissance)}
              type="date"
              max={jourVoyage}
              value={saisie.dateNaissance}
              onChange={(e) => onChange("dateNaissance", e.target.value)}
              className={classesChamp}
            />
          </Champ>
          <p className="rounded-champ border border-soleil-bordure bg-soleil-pale px-3 py-2.5 text-sm text-marine">
            Prévoir l’acte de naissance {saisie.categorie === "bebe" ? "du bébé" : "de l’enfant"} à l’embarquement.
          </p>
        </div>
      )}
    </section>
  )
}
