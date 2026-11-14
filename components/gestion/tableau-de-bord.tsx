"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { formatFCFA, formatFCFACompact, formatMontant, formatPourcentage } from "@/domain/format"
import {
  calculerIndicateurs,
  CANAUX,
  filtrerTraversees,
  moisDeLaPeriode,
  MOYENS,
  pickUp,
  repartitionParCanal,
  repartitionParFamille,
  repartitionParMoyen,
  rythmeReservation,
  statutAffiche,
  type Part,
} from "@/domain/indicateurs"
import { ORDRE_FAMILLES } from "@/domain/tarifs"
import { formatJourCourt, heureLocale, jourLocal, NOMS_MOIS } from "@/domain/temps"
import { useEtatVentes } from "@/lib/use-etat-ventes"
import { syntheseTraversees } from "@/services/gestion/service-gestion"
import { BadgeStatut, Chargement, classesSelect, EnTetePage, Section, Tableau, Tuile } from "./elements"
import { BarresRepartition, HistogrammeRythme } from "./graphiques"
import { LIBELLES_CANAL, LIBELLES_MOYEN, nomLigne } from "./libelles"
import { TableauTraversees } from "./tableau-traversees"

function libelleMois(mois: string): string {
  const [annee, m] = mois.split("-").map(Number)
  return `${NOMS_MOIS[m - 1]} ${annee}`
}

function part(p: Part, total: number): string {
  return total > 0 ? formatPourcentage(p.places / total) : "—"
}

export function TableauDeBord() {
  const { etat } = useEtatVentes()
  const [mois, setMois] = useState<string | null>(null)
  const [ligneId, setLigneId] = useState<string | null>(null)

  const vue = useMemo(() => {
    if (!etat) return null
    const { maintenant, parametres } = etat
    const traversees = filtrerTraversees(etat.traversees, { mois, ligneId })
    const ids = new Set(traversees.map((t) => t.id))
    const reservations = etat.reservations.filter((r) => ids.has(r.traverseeId))
    const synthese = syntheseTraversees(etat).filter((s) => ids.has(s.traversee.id))
    return {
      traversees,
      reservations,
      indicateurs: calculerIndicateurs(traversees, reservations, maintenant),
      familles: repartitionParFamille(reservations, maintenant),
      canaux: repartitionParCanal(reservations, maintenant),
      moyens: repartitionParMoyen(reservations, maintenant),
      rythme: rythmeReservation(reservations, maintenant, parametres.joursRythme),
      pickUp: pickUp(reservations, maintenant, parametres.joursPickUpPrincipal),
      prochaines: synthese.filter((s) => s.statut !== "partie").slice(0, parametres.prochainesTraversees),
      parties: synthese.filter((s) => s.statut === "partie").length,
      dernieres: reservations
        .filter((r) => Date.parse(r.creeLe) <= maintenant.getTime() && r.statut !== "brouillon")
        .sort((a, b) => Date.parse(b.creeLe) - Date.parse(a.creeLe))
        .slice(0, 8),
    }
  }, [etat, mois, ligneId])

  if (!etat || !vue) return <Chargement />
  const { referentiel, parametres, maintenant } = etat
  const { indicateurs: i } = vue
  const nomFamille = (code: string) => referentiel.familles.find((f) => f.code === code)?.nom ?? code
  const totalPlaces = ORDRE_FAMILLES.reduce((s, f) => s + vue.familles[f].places, 0)
  const traverseesParId = new Map(etat.traversees.map((t) => [t.id, t]))

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        sousTitre={
          <>
            Ventes au {formatJourCourt(jourLocal(maintenant)).toLowerCase()} à {heureLocale(maintenant)} ·{" "}
            {vue.traversees.length} traversées ({vue.parties} parties) · données d’exemple et réservations faites sur ce
            navigateur
          </>
        }
        actions={
          <>
            <label className="sr-only" htmlFor="filtre-mois">
              Période
            </label>
            <select
              id="filtre-mois"
              className={classesSelect}
              value={mois ?? ""}
              onChange={(e) => setMois(e.target.value || null)}
            >
              <option value="">Tout le programme</option>
              {moisDeLaPeriode(referentiel.config.periode).map((m) => (
                <option key={m} value={m}>
                  {libelleMois(m)}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="filtre-sens">
              Sens
            </label>
            <select
              id="filtre-sens"
              className={classesSelect}
              value={ligneId ?? ""}
              onChange={(e) => setLigneId(e.target.value || null)}
            >
              <option value="">Les deux sens</option>
              {referentiel.lignes.map((l) => (
                <option key={l.id} value={l.id}>
                  {nomLigne(l.id, referentiel.lignes, referentiel.ports)}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tuile
          libelle="Remplissage"
          valeur={i.remplissage === null ? "—" : formatPourcentage(i.remplissage)}
          detail={`${formatMontant(i.places)} places vendues sur ${formatMontant(i.capacite)}`}
        />
        <Tuile
          libelle="Recette billets"
          valeur={formatFCFACompact(i.recetteBillets)}
          detail={i.recetteOptions > 0 ? `+ ${formatFCFA(i.recetteOptions)} d’options` : "hors options"}
        />
        <Tuile
          libelle="Recette par siège offert"
          valeur={i.recetteParSiege === null ? "—" : formatFCFA(i.recetteParSiege)}
          detail="recette billets ÷ capacité"
        />
        <Tuile
          libelle="Recette moyenne par passager"
          valeur={i.recetteParPassager === null ? "—" : formatFCFA(i.recetteParPassager)}
          detail={`${formatMontant(i.passagers)} passagers, bébés compris`}
        />
        <Tuile libelle={`Pick-up ${parametres.joursPickUpPrincipal} jours`} valeur={`${formatMontant(vue.pickUp)} places`} detail={`${formatMontant(i.reservations)} réservations au total`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section titre={`Rythme de réservation — ${parametres.joursRythme} derniers jours`} className="lg:col-span-2">
          <p className="mb-2 text-[13px] text-gris">Places vendues par jour de réservation, toutes traversées du filtre.</p>
          <HistogrammeRythme points={vue.rythme} description="Places vendues par jour de réservation" />
        </Section>
        <Section titre="Répartition par tarif">
          <BarresRepartition
            lignes={ORDRE_FAMILLES.map((f) => ({
              libelle: nomFamille(f),
              valeur: vue.familles[f].places,
              etiquette: `${formatMontant(vue.familles[f].places)} places · ${part(vue.familles[f], totalPlaces)} · ${formatFCFACompact(vue.familles[f].recette)}`,
            }))}
          />
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-bordure pt-4 text-[13px]">
            <div>
              <h3 className="mb-1.5 text-[13px] font-bold text-marine">Canal</h3>
              <ul className="space-y-1">
                {CANAUX.filter((c) => vue.canaux[c].reservations > 0).map((c) => (
                  <li key={c} className="flex justify-between gap-2">
                    <span>{LIBELLES_CANAL[c]}</span>
                    <span className="tabular-nums text-gris">{part(vue.canaux[c], totalPlaces)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1.5 text-[13px] font-bold text-marine">Paiement</h3>
              <ul className="space-y-1">
                {MOYENS.filter((m) => vue.moyens[m].reservations > 0).map((m) => (
                  <li key={m} className="flex justify-between gap-2">
                    <span>{LIBELLES_MOYEN[m]}</span>
                    <span className="tabular-nums text-gris">{part(vue.moyens[m], totalPlaces)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </div>

      <Section
        titre="Prochaines traversées"
        action={
          <Link href="/admin/traversees" className="text-[14px] font-semibold text-action hover:underline">
            Toutes les traversées
          </Link>
        }
      >
        <TableauTraversees
          lignes={vue.prochaines}
          ports={referentiel.ports}
          lignesMaritimes={referentiel.lignes}
          familles={referentiel.familles}
          joursPickUp={etat.parametres.joursPickUpPrincipal}
        />
        <p className="mt-2 text-[12px] text-gris">
          Écart réf. : places vendues comparées à la moyenne des traversées déjà parties dans le même sens, au même
          nombre de jours du départ (au moins {parametres.traverseesMinReference} traversées). Alerte au-delà de ±
          {formatPourcentage(parametres.seuilEcartReference)}.
        </p>
      </Section>

      <Section
        titre="Dernières réservations"
        action={
          <Link href="/admin/reservations" className="text-[14px] font-semibold text-action hover:underline">
            Toutes les réservations
          </Link>
        }
      >
        <Tableau>
          <thead>
            <tr>
              <th>Créée le</th>
              <th>Référence</th>
              <th>Traversée</th>
              <th>Titulaire</th>
              <th className="text-right">Places</th>
              <th>Tarif</th>
              <th className="text-right">Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {vue.dernieres.map((r) => {
              const t = traverseesParId.get(r.traverseeId)
              const titulaire = r.passagers[0]
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    {formatJourCourt(jourLocal(r.creeLe))} · {heureLocale(r.creeLe)}
                    {etat.locales.has(r.id) && (
                      <span className="mt-0.5 block w-fit rounded-full bg-soleil px-2 py-0.5 text-[11px] font-semibold text-marine">
                        Ce navigateur
                      </span>
                    )}
                  </td>
                  <td className="font-semibold">{r.reference || "—"}</td>
                  <td className="whitespace-nowrap">
                    {t && (
                      <Link href={`/admin/traversees/${t.id}`} className="text-action hover:underline">
                        {nomLigne(t.ligneId, referentiel.lignes, referentiel.ports, true)} ·{" "}
                        {formatJourCourt(jourLocal(t.departAt))}
                      </Link>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{titulaire ? `${titulaire.prenom} ${titulaire.nom}` : "—"}</td>
                  <td className="text-right">{r.passagers.filter((p) => p.categorie !== "bebe").length}</td>
                  <td>{nomFamille(r.familleCode)}</td>
                  <td className="text-right whitespace-nowrap">{formatFCFA(r.total, true)}</td>
                  <td>
                    <BadgeStatut statut={statutAffiche(r, maintenant)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Tableau>
      </Section>
    </>
  )
}
