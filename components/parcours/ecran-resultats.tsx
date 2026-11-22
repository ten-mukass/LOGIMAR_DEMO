"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import { lignesPassagers } from "@/domain/montants"
import { resumeComposition } from "@/domain/passagers"
import { estOuverteALaVente, jourDeDepart, trouverLigne } from "@/domain/programme"
import { versParametres } from "@/domain/recherche"
import {
  alertePlaces,
  conditionsFamille,
  meilleureOffre,
  offreLaMoinsChere,
  offresTraversee,
  ORDRE_FAMILLES,
  totalPassagers,
  type Offre,
} from "@/domain/tarifs"
import { ecartJours, formatJourCourt, formatJourLong, heureLocale } from "@/domain/temps"
import { formatFCFA, formatMontant } from "@/domain/format"
import type { CodeFamille } from "@/domain/types"
import { useCriteres } from "@/lib/use-criteres"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { cn } from "@/lib/utils"
import { repository, type Referentiel } from "@/services"
import { BarreBasse } from "./barre-basse"
import { CarteTraversee } from "./carte-traversee"
import { EnTeteParcours } from "./en-tete-parcours"

const NOMS_JOURS_COURTS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."]

/** Fenêtre (en jours) autour de la date choisie pour désigner le jour le moins cher. */
const FENETRE_MOINS_CHER = 7

export function EcranResultats({ referentiel }: { referentiel: Referentiel }) {
  const { ports, lignes, config, navires, terminaux, familles, options } = referentiel
  const router = useRouter()
  const maintenant = useMaintenant()
  const { criteres, erreurs, traverseeId: allerId, famille: allerFamilleBrute } = useCriteres(ports, config.passagersMax)
  const allerFamille = ORDRE_FAMILLES.find((f) => f === allerFamilleBrute) ?? null
  // Aller-retour : on choisit l'aller, puis le retour (l'aller choisi est dans l'URL : « t », « f »).
  const modeRetour = Boolean(criteres?.dateRetour && allerId && allerFamille)
  const depart = criteres ? (modeRetour ? criteres.arrivee : criteres.depart) : undefined
  const arrivee = criteres ? (modeRetour ? criteres.depart : criteres.arrivee) : undefined
  const dateCourante = criteres ? (modeRetour ? (criteres.dateRetour as string) : criteres.date) : ""
  const ligne = depart && arrivee ? trouverLigne(lignes, ports, depart, arrivee) : undefined

  const charger = useCallback(async () => {
    if (!ligne || !maintenant) return null
    const aller =
      modeRetour && allerId ? ((await repository.listerInventaires([allerId], maintenant))[0] ?? null) : null
    const traversees = (await repository.listerTraversees({ ligneId: ligne.id })).filter(
      (t) =>
        estOuverteALaVente(t, maintenant, config.ventesEnLigneJusqua) &&
        (!aller || Date.parse(t.departAt) > Date.parse(aller.traversee.arriveeAt)),
    )
    const [inventaires, repartition] = await Promise.all([
      repository.listerInventaires(
        traversees.map((t) => t.id),
        maintenant,
      ),
      repository.repartitionParFamille(maintenant),
    ])
    return { inventaires, repartition, aller }
  }, [ligne, maintenant, config.ventesEnLigneJusqua, modeRetour, allerId])
  const { donnees } = useDonnees(maintenant && ligne ? charger : null)

  const [familleChoisie, setFamilleChoisie] = useState<CodeFamille | null>(null)

  // Offres par jour (une traversée par jour et par sens dans le programme actuel : la première du jour).
  const jours = useMemo(() => {
    if (!donnees || !criteres) return []
    const parJour = new Map<string, (typeof donnees.inventaires)[number]>()
    for (const inv of donnees.inventaires) {
      const jour = jourDeDepart(inv.traversee)
      if (!parJour.has(jour)) parJour.set(jour, inv)
    }
    return [...parJour.entries()].map(([jour, inventaire]) => {
      const offres = offresTraversee(
        inventaire.classes,
        criteres.passagers,
        inventaire.traversee.capaciteVendable,
        inventaire.occupation,
      )
      return { jour, inventaire, offres, moinsChere: offreLaMoinsChere(offres) }
    })
  }, [donnees, criteres])

  if (!criteres || !ligne || !depart || !arrivee) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
        <h1 className="text-[22px] font-bold text-marine">Recherche incomplète</h1>
        <ul role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">
          {(erreurs.length > 0 ? erreurs : ["Trajet inconnu."]).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <Link href="/" className={classesBouton({ pleineLargeur: true })}>
          Nouvelle recherche
        </Link>
      </main>
    )
  }

  const nom = (code: string) => ports.find((p) => p.code === code)?.nom ?? code
  const choisi = jours.find((j) => j.jour === dateCourante)
  const voisins = jours.filter(
    (j) => j.moinsChere && Math.abs(ecartJours(dateCourante, j.jour)) <= FENETRE_MOINS_CHER,
  )
  const allerChoisi = donnees?.aller ?? null
  const offreAller =
    allerChoisi && allerFamille
      ? meilleureOffre(
          allerChoisi.classes,
          allerFamille,
          criteres.passagers,
          allerChoisi.traversee.capaciteVendable,
          allerChoisi.occupation,
        )
      : null
  const urlAller = `/resultats?${versParametres(criteres)}`
  const choixAller = `t=${encodeURIComponent(allerId ?? "")}&f=${allerFamille ?? ""}`
  const prixVoisins = voisins.map((j) => j.moinsChere?.prixUnitaires.adulte ?? Infinity)
  const prixMin = Math.min(...prixVoisins)
  const prixMax = Math.max(...prixVoisins)

  const repartition = donnees?.repartition
  const plusChoisie = repartition
    ? (Object.entries(repartition) as [CodeFamille, number][]).sort((a, b) => b[1] - a[1])[0]?.[0]
    : undefined

  const disponibles = choisi?.offres.filter((o): o is Extract<Offre, { disponible: true }> => o.disponible) ?? []
  const famille =
    familleChoisie && disponibles.some((o) => o.familleCode === familleChoisie)
      ? familleChoisie
      : (choisi?.moinsChere?.familleCode ?? null)
  const offre = disponibles.find((o) => o.familleCode === famille)
  const nomFamille = (code: CodeFamille) => familles.find((f) => f.code === code)?.nom ?? code
  const nbPassagers = totalPassagers(criteres.passagers)

  const changerJour = (jour: string) => {
    setFamilleChoisie(null)
    if (modeRetour) {
      router.replace(`/resultats?${versParametres({ ...criteres, dateRetour: jour })}&${choixAller}`, { scroll: false })
    } else {
      const dateRetour = criteres.dateRetour && criteres.dateRetour < jour ? jour : criteres.dateRetour
      router.replace(`/resultats?${versParametres({ ...criteres, date: jour, dateRetour })}`, { scroll: false })
    }
  }

  const continuer = () => {
    if (!choisi || !offre) return
    const choix = `t=${encodeURIComponent(choisi.inventaire.traversee.id)}&f=${offre.familleCode}`
    if (modeRetour) {
      router.push(`/passagers?${versParametres(criteres)}&${choixAller}&tr=${encodeURIComponent(choisi.inventaire.traversee.id)}&fr=${offre.familleCode}`)
    } else if (criteres.dateRetour) {
      router.push(`/resultats?${versParametres(criteres)}&${choix}`)
    } else {
      router.push(`/passagers?${versParametres(criteres)}&${choix}`)
    }
  }
  const totalAffiche = offre ? offre.total + (offreAller?.disponible ? offreAller.total : 0) : null

  return (
    <main>
      <div className="bg-marine text-white">
        <EnTeteParcours
          sombre
          titre={`${nom(depart)} → ${nom(arrivee)}`}
          sousTitre={`${resumeComposition(criteres.passagers)} · ${
            criteres.dateRetour ? (modeRetour ? "Retour (2/2)" : "Aller (1/2)") : "Aller simple"
          }`}
          retour={{ href: modeRetour ? urlAller : `/?${versParametres(criteres)}` }}
          action={
            <Link href={`/?${versParametres(criteres)}`} className="px-1 text-[15px] font-semibold underline">
              Modifier
            </Link>
          }
        />
        <div className="mx-auto max-w-3xl px-4 pb-4 md:px-8">
          <BandeDates
            jours={jours.map((j) => ({
              jour: j.jour,
              prix: j.moinsChere?.prixUnitaires.adulte ?? null,
              moinsCher:
                j.moinsChere !== null &&
                prixMin < prixMax &&
                voisins.includes(j) &&
                j.moinsChere.prixUnitaires.adulte === prixMin,
            }))}
            choisi={dateCourante}
            onChoisir={changerJour}
            chargement={!donnees}
          />
          <p className="mt-3 text-[13px] text-white/85">
            Seuls les jours de traversée sont affichés. Prix « dès » par adulte ; ils varient selon la date et le
            remplissage.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:px-8">
        {modeRetour && allerChoisi && (
          <div className="flex items-center justify-between gap-3 rounded-carte border border-bordure bg-white p-3.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase text-foret-texte">Aller choisi</p>
              <p className="font-semibold">
                {formatJourCourt(jourDeDepart(allerChoisi.traversee))} · {heureLocale(allerChoisi.traversee.departAt)} ·{" "}
                {allerFamille && nomFamille(allerFamille)}
                {offreAller?.disponible && ` · ${formatFCFA(offreAller.total, true)}`}
              </p>
              {offreAller && !offreAller.disponible && (
                <p className="text-sm font-semibold text-alerte">Ce tarif n’est plus disponible pour l’aller.</p>
              )}
            </div>
            <Link href={urlAller} className="shrink-0 text-[15px] font-semibold text-action underline">
              Changer
            </Link>
          </div>
        )}
        {criteres.dateRetour && !modeRetour && (
          <p className="text-sm font-semibold text-gris">Choisissez d’abord l’aller, puis le retour.</p>
        )}
        <h2 className="text-[19px] font-bold text-marine">
          {criteres.dateRetour ? (modeRetour ? "Retour · " : "Aller · ") : ""}
          {formatJourLong(dateCourante)}
        </h2>

        {!donnees ? (
          <div className="h-56 animate-pulse rounded-carte bg-white" />
        ) : !choisi ? (
          <p className="rounded-carte border border-bordure bg-white p-4 text-gris">
            Aucune traversée ouverte à la vente ce jour-là. Choisissez une autre date ci-dessus.
          </p>
        ) : (
          <>
            <CarteTraversee
              traversee={choisi.inventaire.traversee}
              navire={navires.find((n) => n.id === choisi.inventaire.traversee.navireId)}
              depart={ports.find((p) => p.code === depart)}
              arrivee={ports.find((p) => p.code === arrivee)}
              terminalDepart={terminaux.find((t) => t.id === choisi.inventaire.traversee.terminalDepartId)}
              placesRestantes={choisi.inventaire.placesRestantes}
            />

            <fieldset>
              <legend className="mb-3 font-titre text-[17px] font-bold text-marine">Choisissez votre tarif</legend>
              <div className="space-y-3">
                {choisi.offres.map((o) => {
                  const f = familles.find((x) => x.code === o.familleCode)
                  if (!f) return null
                  const alerte = alertePlaces(o, config.seuilAlertePlaces)
                  const actif = o.disponible && o.familleCode === famille
                  return (
                    <label
                      key={o.familleCode}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-carte border bg-white p-4",
                        actif ? "border-2 border-action bg-bleu-pale" : "border-bordure",
                        !o.disponible && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="radio"
                        name="famille"
                        value={o.familleCode}
                        checked={actif}
                        disabled={!o.disponible}
                        onChange={() => setFamilleChoisie(o.familleCode)}
                        className="mt-1 size-5 shrink-0 accent-action"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[17px] font-bold text-encre">{f.nom}</span>
                          <span className="font-titre text-[19px] font-bold tabular-nums text-marine">
                            {o.disponible ? formatFCFA(o.total, true) : "Indisponible"}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm text-gris">{conditionsFamille(f)}</span>
                        <span className="mt-2 flex flex-wrap gap-2">
                          {alerte !== null && (
                            <Badge ton="alerte">
                              Plus que {alerte} place{alerte > 1 ? "s" : ""} à ce prix
                            </Badge>
                          )}
                          {o.disponible && plusChoisie === o.familleCode && <Badge ton="succes">Le plus choisi</Badge>}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {offre && (
              <details className="rounded-carte border border-bordure bg-white p-4">
                <summary className="cursor-pointer font-bold text-marine">Détail du prix {nomFamille(offre.familleCode)}</summary>
                <dl className="mt-3 space-y-2 text-[15px]">
                  {lignesPassagers(offre.prixUnitaires, criteres.passagers).map((l) => (
                    <div key={l.libelle} className="flex justify-between gap-3">
                      <dt className="text-gris">
                        {l.libelle} × {formatFCFA(l.prixUnitaire, true)}
                      </dt>
                      <dd className="font-semibold tabular-nums">{formatFCFA(l.montant, true)}</dd>
                    </div>
                  ))}
                  {navires[0] && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-gris">
                        Bagages inclus : soute {navires[0].bagageSouteKg} kg, cabine {navires[0].bagageCabineKg} kg
                      </dt>
                      <dd className="font-semibold tabular-nums">{formatFCFA(0, true)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 border-t border-bordure pt-2">
                    <dt className="font-bold">Total</dt>
                    <dd className="font-bold tabular-nums">{formatFCFA(offre.total)}</dd>
                  </div>
                </dl>
                {options.length > 0 && (
                  <p className="mt-3 text-sm text-gris">Options (bagage supplémentaire, garantie) à l’étape paiement.</p>
                )}
              </details>
            )}

            <p className="px-1 text-sm text-gris">
              Les tarifs évoluent avec la date de réservation et le remplissage du navire : réserver tôt donne accès
              aux prix les plus bas.
            </p>
          </>
        )}
      </div>

      <BarreBasse>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gris">
            {modeRetour ? "Aller + retour · " : offre ? `${nomFamille(offre.familleCode)} · ` : ""}
            {nbPassagers} passager{nbPassagers > 1 ? "s" : ""}
          </p>
          <p className="font-titre text-[20px] font-bold tabular-nums text-marine">
            {totalAffiche !== null ? formatFCFA(totalAffiche) : "—"}
          </p>
        </div>
        <Bouton
          taille="grand"
          className="min-w-40"
          disabled={!offre || (modeRetour && !offreAller?.disponible)}
          onClick={continuer}
        >
          {criteres.dateRetour && !modeRetour ? "Choisir le retour" : "Continuer"}
        </Bouton>
      </BarreBasse>
    </main>
  )
}

function BandeDates({
  jours,
  choisi,
  onChoisir,
  chargement,
}: {
  jours: { jour: string; prix: number | null; moinsCher: boolean }[]
  choisi: string
  onChoisir: (jour: string) => void
  chargement: boolean
}) {
  const refChoisi = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    refChoisi.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [choisi, chargement])

  if (chargement) {
    return (
      <div className="mt-2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[88px] w-[84px] animate-pulse rounded-carte bg-marine-2" />
        ))}
      </div>
    )
  }
  return (
    <ul className="-mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" aria-label="Jours de traversée">
      {jours.map(({ jour, prix, moinsCher }) => {
        const actif = jour === choisi
        const d = new Date(`${jour}T12:00:00Z`)
        return (
          <li key={jour} className="snap-center">
            <button
              ref={actif ? refChoisi : undefined}
              type="button"
              onClick={() => onChoisir(jour)}
              aria-pressed={actif}
              aria-label={`${formatJourLong(jour)} : ${prix === null ? "complet" : `dès ${formatFCFA(prix)}`}${moinsCher ? ", moins cher" : ""}`}
              className={cn(
                "flex h-[84px] w-[78px] flex-col items-center justify-center rounded-carte border-2 text-center",
                actif
                  ? "border-white bg-white text-marine"
                  : moinsCher
                    ? "border-soleil bg-marine-2 text-white"
                    : "border-transparent bg-marine-2 text-white",
              )}
            >
              <span className="text-[13px] font-semibold">{NOMS_JOURS_COURTS[d.getUTCDay()]}</span>
              <span className="font-titre text-[20px] font-bold leading-tight">{d.getUTCDate()}</span>
              <span className={cn("text-[11px] font-semibold tabular-nums", prix === null && "opacity-80")}>
                {prix === null ? "Complet" : `dès ${formatMontant(prix)}`}
              </span>
              {moinsCher && (
                <span className={cn("text-[10px] font-extrabold uppercase", actif ? "text-foret-texte" : "text-soleil")}>
                  Moins cher
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
