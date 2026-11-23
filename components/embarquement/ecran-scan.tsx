"use client"

import { ArrowLeft, Camera, ClipboardList, ImageUp, Lock, ScanLine, Search, Unlock } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { nomLigne } from "@/components/gestion/libelles"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import { classesChamp } from "@/components/ui/champ"
import { billetUtilise } from "@/domain/embarquement"
import { estVendue } from "@/domain/indicateurs"
import { compositionDe } from "@/domain/occupation"
import { resumeComposition } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, heureLocale, jourLocal } from "@/domain/temps"
import type { Embarquement, Reservation, ResultatControle } from "@/domain/types"
import { cameraDisponible, creerLecteurQr, vibrer, type LecteurQr } from "@/lib/lecture-qr"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { cn } from "@/lib/utils"
import {
  cleSignatureBillet,
  repositoryGestion as repository,
  serviceEmbarquement,
  type EtatEmbarquement,
  type ResultatControleBillet,
} from "@/services"
import { contenuQrBillet } from "@/services/documents/signature-billet"
import { CarteResultat } from "./carte-resultat"
import { LecteurCamera } from "./lecteur-camera"

export const LIBELLES_RESULTAT: Record<ResultatControle, string> = {
  valide: "Valide",
  "deja-scanne": "Déjà scanné",
  "autre-traversee": "Autre traversée",
  "non-valable": "Non valable",
  invalide: "Refusé",
  "embarquement-clos": "Embarquement clos",
}

/** Même QR relu par la caméra dans ce délai : ignoré (la caméra voit le billet plusieurs fois par seconde). */
const ANTI_REBOND_MS = 5000
/** Pause de la lecture après un résultat, le temps de le lire. */
const PAUSE_APRES_RESULTAT_MS = 2000

export function EcranScan() {
  const traverseeId = useSearchParams().get("t")
  return traverseeId ? <ControleTraversee traverseeId={traverseeId} /> : <ChoixTraversee />
}

/** Choix de la traversée à embarquer : celles du jour d'abord, puis les prochaines. */
function ChoixTraversee() {
  const maintenant = useMaintenant()
  const charger = useCallback(async () => {
    if (!maintenant) return null
    const [referentiel, parametres, traversees] = await Promise.all([
      repository.getReferentiel(),
      repository.getParametresGestion(),
      repository.listerTraversees(),
    ])
    // Une traversée reste proposée jusqu'à une heure après son départ (retard, embarquement tardif).
    const proposees = traversees
      .filter((t) => Date.parse(t.departAt) > maintenant.getTime() - 3_600_000)
      .slice(0, parametres.prochainesTraversees)
    const etats = await Promise.all(proposees.map((t) => serviceEmbarquement.etat(t.id, maintenant)))
    return { referentiel, etats: etats.filter((e): e is EtatEmbarquement => e !== null), aujourdhui: jourLocal(maintenant) }
  }, [maintenant])
  const { donnees } = useDonnees(maintenant ? charger : null)

  if (!donnees) return <p className="py-10 text-center text-gris">Chargement des traversées…</p>
  const { referentiel, etats, aujourdhui } = donnees
  const duJour = etats.filter((e) => jourDeDepart(e.traversee) === aujourdhui)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold text-marine">Embarquement</h1>
        <p className="text-[15px] text-gris">Choisissez la traversée à embarquer.</p>
      </div>
      {duJour.length === 0 && (
        <p className="rounded-carte bg-soleil-pale p-3 text-[14px] text-encre">
          Pas de traversée aujourd’hui. Démonstration : vous pouvez ouvrir l’embarquement d’une prochaine traversée.
        </p>
      )}
      <ul className="space-y-3">
        {etats.map((e) => (
          <li key={e.traversee.id}>
            <Link
              href={`/scan?t=${e.traversee.id}`}
              className="block rounded-carte border border-bordure bg-white p-4 hover:border-action"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-titre text-[17px] font-bold text-marine">
                  {nomLigne(e.traversee.ligneId, referentiel.lignes, referentiel.ports)}
                </span>
                {jourDeDepart(e.traversee) === aujourdhui && (
                  <span className="rounded-full bg-soleil px-2 py-0.5 text-[12px] font-semibold text-marine">Aujourd’hui</span>
                )}
              </div>
              <p className="text-[15px] text-encre">
                {formatJourCourt(jourDeDepart(e.traversee))} · départ {heureLocale(e.traversee.departAt)}
              </p>
              <p className="mt-1 text-[14px] text-gris">
                {e.compteur.aBord} à bord sur {e.compteur.attendus} attendus{e.cloture ? " · embarquement clos" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ControleTraversee({ traverseeId }: { traverseeId: string }) {
  const [version, setVersion] = useState(0)
  const [etat, setEtat] = useState<EtatEmbarquement | null | undefined>(undefined)
  const [resultat, setResultat] = useState<ResultatControleBillet | null>(null)
  const [lecteur, setLecteur] = useState<LecteurQr | null | undefined>(undefined)
  const [camera, setCamera] = useState(false)
  const [pause, setPause] = useState(false)
  const [messagePhoto, setMessagePhoto] = useState<string | null>(null)
  const [confirmerCloture, setConfirmerCloture] = useState(false)
  const dernier = useRef<{ contenu: string; t: number } | null>(null)
  const carteResultat = useRef<HTMLDivElement>(null)
  const recharger = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (resultat) carteResultat.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [resultat])

  useEffect(() => {
    let actif = true
    serviceEmbarquement.etat(traverseeId).then((e) => {
      if (actif) setEtat(e)
    })
    return () => {
      actif = false
    }
  }, [traverseeId, version])

  useEffect(() => {
    let actif = true
    creerLecteurQr().then((l) => {
      if (actif) setLecteur(() => l)
    })
    window.addEventListener("storage", recharger)
    return () => {
      actif = false
      window.removeEventListener("storage", recharger)
    }
  }, [recharger])

  const afficher = useCallback(
    (r: ResultatControleBillet) => {
      setResultat(r)
      vibrer(r.controle.resultat === "valide" ? 120 : [250, 120, 250])
      recharger()
    },
    [recharger],
  )

  /** `depuisCamera` : la caméra relit le même QR en continu, d'où l'anti-rebond (pas pour la simulation). */
  const scanner = useCallback(
    async (contenu: string, depuisCamera = true) => {
      const precedent = dernier.current
      if (depuisCamera && precedent && precedent.contenu === contenu && Date.now() - precedent.t < ANTI_REBOND_MS) return
      dernier.current = { contenu, t: Date.now() }
      setPause(true)
      afficher(await serviceEmbarquement.scanner(contenu, traverseeId))
      window.setTimeout(() => setPause(false), PAUSE_APRES_RESULTAT_MS)
    },
    [afficher, traverseeId],
  )

  async function lirePhoto(fichier: File) {
    setMessagePhoto(null)
    if (!lecteur) return
    const contenu = await lecteur(await createImageBitmap(fichier))
    if (contenu) await scanner(contenu)
    else setMessagePhoto("Aucun QR code lisible sur la photo. Reprenez-la de plus près, ou utilisez la recherche.")
  }

  async function retirer(e: Embarquement) {
    await serviceEmbarquement.retirer(e.id)
    setResultat((r) => (r ? { ...r, embarques: r.embarques.filter((x) => x.id !== e.id) } : r))
    dernier.current = null
    recharger()
  }

  if (etat === undefined) return <p className="py-10 text-center text-gris">Chargement…</p>
  if (etat === null) {
    return (
      <div className="space-y-3">
        <p role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">Traversée introuvable.</p>
        <Link href="/scan" className={classesBouton({ pleineLargeur: true })}>
          Choisir une traversée
        </Link>
      </div>
    )
  }

  const { traversee: t, referentiel, compteur, cloture } = etat
  const pourcent = compteur.attendus > 0 ? Math.round((compteur.aBord / compteur.attendus) * 100) : 0
  const clos = cloture !== null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/scan" className="inline-flex items-center gap-1 text-[14px] font-semibold text-action">
            <ArrowLeft aria-hidden className="size-4" />
            Changer de traversée
          </Link>
          <h1 className="mt-1 text-[20px] font-extrabold leading-tight text-marine">
            {nomLigne(t.ligneId, referentiel.lignes, referentiel.ports)}
          </h1>
          <p className="text-[15px] text-encre">
            {formatJourCourt(jourDeDepart(t))} · départ {heureLocale(t.departAt)}
          </p>
        </div>
      </div>

      <section aria-label="Compteur d’embarquement" className="rounded-carte bg-marine p-4 text-white">
        <p className="font-titre text-[34px] font-extrabold leading-none">
          {compteur.aBord}
          <span className="text-[18px] font-bold text-white/80"> à bord sur {compteur.attendus} attendus</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
          <div className="h-full rounded-full bg-soleil" style={{ width: `${pourcent}%` }} />
        </div>
        <p className="mt-2 text-[14px] text-white/90">
          {clos
            ? `Embarquement clos à ${heureLocale(cloture.le)} · ${compteur.absents} absent${compteur.absents > 1 ? "s" : ""}`
            : `${compteur.restants} passager${compteur.restants > 1 ? "s" : ""} encore attendu${compteur.restants > 1 ? "s" : ""}`}
        </p>
        <Link
          href={`/admin/traversees/${t.id}/manifeste`}
          className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-white underline underline-offset-2"
        >
          <ClipboardList aria-hidden className="size-4" />
          Manifeste de bord
        </Link>
      </section>

      {resultat && (
        <div ref={carteResultat} className="scroll-mt-4">
          <CarteResultat resultat={resultat} lignes={referentiel.lignes} ports={referentiel.ports} onRetirer={retirer} />
        </div>
      )}

      {!clos && (
        <section aria-label="Scanner un billet" className="space-y-3">
          {lecteur === null ? (
            <p className="rounded-carte bg-soleil-pale p-3 text-[14px] text-encre">
              Ce navigateur ne peut pas lire les QR codes. Utilisez la recherche manuelle ci-dessous.
            </p>
          ) : camera && lecteur ? (
            <>
              <LecteurCamera lecteur={lecteur} pause={pause} onCode={(contenu) => void scanner(contenu)} />
              <Bouton variante="contour" pleineLargeur onClick={() => setCamera(false)}>
                Arrêter la caméra
              </Bouton>
            </>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Bouton taille="grand" pleineLargeur disabled={!lecteur || !cameraDisponible()} onClick={() => setCamera(true)}>
                <Camera aria-hidden className="size-5" />
                Scanner avec la caméra
              </Bouton>
              <label
                className={cn(
                  classesBouton({ variante: "contour", taille: "grand", pleineLargeur: true }),
                  !lecteur && "pointer-events-none opacity-50",
                )}
              >
                <ImageUp aria-hidden className="size-5" />
                Photo du QR code
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={!lecteur}
                  onChange={(e) => {
                    const fichier = e.target.files?.[0]
                    e.target.value = ""
                    if (fichier) void lirePhoto(fichier)
                  }}
                />
              </label>
            </div>
          )}
          {lecteur && !cameraDisponible() && (
            <p className="text-[13px] text-gris">La caméra demande une connexion sécurisée (https).</p>
          )}
          {messagePhoto && (
            <p role="alert" className="text-[14px] font-semibold text-alerte">
              {messagePhoto}
            </p>
          )}
        </section>
      )}

      {!clos && <RechercheManuelle traverseeId={t.id} etat={etat} onResultat={afficher} />}

      {!clos && <SimulationDemo etat={etat} onScanner={(contenu) => scanner(contenu, false)} />}

      <Journal etat={etat} />

      <section className="rounded-carte border border-bordure bg-white p-4">
        {clos ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-semibold text-encre">
              <Lock aria-hidden className="size-4" />
              Embarquement clos à {heureLocale(cloture.le)} par {cloture.agent}.
            </p>
            <Bouton
              variante="contour"
              taille="compact"
              onClick={async () => {
                await serviceEmbarquement.rouvrir(t.id)
                setResultat(null)
                recharger()
              }}
            >
              <Unlock aria-hidden className="size-4" />
              Rouvrir l’embarquement
            </Bouton>
          </div>
        ) : confirmerCloture ? (
          <div className="space-y-2">
            <p className="text-[15px] text-encre">
              Clôturer l’embarquement ? Plus aucun billet ne pourra être contrôlé ;{" "}
              {compteur.restants} passager{compteur.restants > 1 ? "s" : ""} non embarqué{compteur.restants > 1 ? "s" : ""}{" "}
              {compteur.restants > 1 ? "seront marqués absents" : "sera marqué absent"}.
            </p>
            <div className="flex gap-2">
              <Bouton
                onClick={async () => {
                  await serviceEmbarquement.cloturer(t.id)
                  setConfirmerCloture(false)
                  setCamera(false)
                  setResultat(null)
                  recharger()
                }}
              >
                Clôturer
              </Bouton>
              <Bouton variante="lien" onClick={() => setConfirmerCloture(false)}>
                Annuler
              </Bouton>
            </div>
          </div>
        ) : (
          <Bouton variante="contour" pleineLargeur onClick={() => setConfirmerCloture(true)}>
            <Lock aria-hidden className="size-4" />
            Clôturer l’embarquement
          </Bouton>
        )}
      </section>
    </div>
  )
}

/** QR illisible ou téléphone éteint : l'agent retrouve le billet par référence, nom, téléphone ou e-mail. */
function RechercheManuelle({
  traverseeId,
  etat,
  onResultat,
}: {
  traverseeId: string
  etat: EtatEmbarquement
  onResultat: (r: ResultatControleBillet) => void
}) {
  const [texte, setTexte] = useState("")
  const [recherche, setRecherche] = useState<{ texte: string; trouves: Reservation[] }>({ texte: "", trouves: [] })
  const trouves = recherche.texte === texte ? recherche.trouves : []

  useEffect(() => {
    let actif = true
    const minuteur = window.setTimeout(() => {
      serviceEmbarquement.rechercher(texte, traverseeId).then((r) => {
        if (actif) setRecherche({ texte, trouves: r })
      })
    }, 200)
    return () => {
      actif = false
      window.clearTimeout(minuteur)
    }
  }, [texte, traverseeId])

  return (
    <details className="rounded-carte border border-bordure bg-white">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-semibold text-marine">
        <Search aria-hidden className="size-4" />
        Recherche manuelle (QR illisible)
      </summary>
      <div className="space-y-3 border-t border-bordure p-4">
        <label htmlFor="recherche-billet" className="block text-[14px] font-semibold text-encre">
          Référence, nom, téléphone ou e-mail
        </label>
        <input
          id="recherche-billet"
          type="search"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          className={classesChamp}
          autoComplete="off"
        />
        <ul className="divide-y divide-bordure">
          {trouves.map((r) => {
            const utilise = billetUtilise(r, etat.embarquements)
            const titulaire = r.passagers[0]
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-encre">
                    {titulaire ? `${titulaire.prenom} ${titulaire.nom}` : r.reference}
                  </p>
                  <p className="text-[13px] text-gris">
                    {r.reference} · {resumeComposition(compositionDe(r.passagers))}
                  </p>
                </div>
                {utilise ? (
                  <span className="shrink-0 text-[13px] font-semibold text-foret-texte">À bord</span>
                ) : (
                  <Bouton
                    taille="compact"
                    onClick={async () => {
                      onResultat(await serviceEmbarquement.controlerManuellement(r.reference, traverseeId))
                      setTexte("")
                    }}
                  >
                    Faire embarquer
                  </Bouton>
                )}
              </li>
            )
          })}
        </ul>
        {texte.trim().length >= 2 && recherche.texte === texte && trouves.length === 0 && (
          <p className="text-[14px] text-gris">Aucun billet payé ne correspond sur cette traversée.</p>
        )}
      </div>
    </details>
  )
}

/**
 * Démo seulement : faire passer des billets devant le lecteur sans second appareil.
 * Le QR est fabriqué exactement comme sur le billet du client, puis contrôlé par le même service.
 */
function SimulationDemo({ etat, onScanner }: { etat: EtatEmbarquement; onScanner: (contenu: string) => Promise<void> }) {
  const [locales, setLocales] = useState<Reservation[]>([])

  useEffect(() => {
    let actif = true
    repository.listerReservationsLocales().then((r) => {
      if (actif) setLocales(r.filter((x) => x.traverseeId === etat.traversee.id && estVendue(x, etat.maintenant)))
    })
    return () => {
      actif = false
    }
  }, [etat])

  const exemples = etat.reservations.filter(
    (r) => estVendue(r, etat.maintenant) && !locales.some((l) => l.id === r.id) && !billetUtilise(r, etat.embarquements),
  )
  const qr = (r: Reservation, traverseeId = r.traverseeId) => contenuQrBillet(r.reference, traverseeId, cleSignatureBillet)

  async function autreTraversee() {
    const traversees = await repository.listerTraversees()
    const autre = traversees.find((x) => x.id !== etat.traversee.id && Date.parse(x.departAt) > etat.maintenant.getTime())
    if (!autre) return
    const [billet] = (await repository.listerReservations(etat.maintenant, { traverseeIds: [autre.id] })).filter((r) =>
      estVendue(r, etat.maintenant),
    )
    if (billet) await onScanner(await qr(billet))
  }

  return (
    <details className="rounded-carte border border-dashed border-bordure-champ bg-white">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 font-semibold text-gris">
        <ScanLine aria-hidden className="size-4" />
        Démonstration : simuler un scan
      </summary>
      <div className="space-y-3 border-t border-bordure p-4 text-[14px]">
        <p className="text-gris">
          Pour présenter sur un seul appareil : le QR est fabriqué comme sur le billet du client, puis contrôlé normalement.
        </p>
        {locales.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-encre">Billets réservés sur cet appareil</p>
            {locales.map((r) => (
              <Bouton key={r.id} variante="contour" taille="compact" pleineLargeur onClick={async () => onScanner(await qr(r))}>
                Scanner {r.reference} ({r.passagers[0]?.prenom} {r.passagers[0]?.nom})
              </Bouton>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Bouton
            variante="contour"
            taille="compact"
            disabled={exemples.length === 0}
            onClick={async () => {
              const r = exemples[Math.floor(Math.random() * exemples.length)]
              if (r) await onScanner(await qr(r))
            }}
          >
            Billet d’exemple
          </Bouton>
          <Bouton
            variante="contour"
            taille="compact"
            disabled={exemples.length === 0}
            onClick={async () => {
              const r = exemples[0]
              if (!r) return
              const vrai = await qr(r)
              await onScanner(vrai.slice(0, -2) + (vrai.endsWith("AA") ? "BB" : "AA"))
            }}
          >
            Billet falsifié
          </Bouton>
          <Bouton variante="contour" taille="compact" onClick={() => void autreTraversee()}>
            Autre traversée
          </Bouton>
        </div>
      </div>
    </details>
  )
}

function Journal({ etat }: { etat: EtatEmbarquement }) {
  const derniers = etat.scans.slice(0, 6)
  if (derniers.length === 0) return null
  return (
    <section className="rounded-carte border border-bordure bg-white p-4">
      <h2 className="mb-2 text-[15px] font-bold text-marine">Derniers contrôles</h2>
      <ul className="space-y-1.5 text-[14px]">
        {derniers.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3">
            <span className="tabular-nums text-gris">{heureLocale(s.le)}</span>
            <span className="min-w-0 flex-1 truncate text-encre">{s.reference ?? "QR illisible"}</span>
            <span
              className={cn(
                "shrink-0 font-semibold",
                s.resultat === "valide" ? "text-foret-texte" : s.resultat === "deja-scanne" ? "text-marine" : "text-alerte",
              )}
            >
              {LIBELLES_RESULTAT[s.resultat]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
