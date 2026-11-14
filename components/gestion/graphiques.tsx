"use client"

/**
 * Graphiques du back-office, en SVG, sans bibliothèque.
 * Marques fines, grille discrète, survol avec infobulle, et les données en tableau pour les lecteurs d'écran.
 * Couleurs : Action pour la série principale, Forêt pour la référence (paire contrôlée pour les daltonismes).
 */
import { useState } from "react"
import type { PointCourbe, PointRythme } from "@/domain/indicateurs"
import { formatMoisCourt } from "@/domain/temps"
import { formatMontant } from "@/domain/format"
import { cn } from "@/lib/utils"

const COULEUR_SERIE = "var(--c-action)"
const COULEUR_REFERENCE = "var(--c-foret)"
const COULEUR_GRILLE = "var(--c-bordure)"
const COULEUR_TEXTE = "var(--c-gris)"

/** Graduations « rondes » de 0 à au moins `max`. */
function graduations(max: number, cible = 4): number[] {
  if (max <= 0) return [0, 1]
  const brut = max / cible
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 5, 10].map((m) => m * puissance).find((p) => p >= brut) ?? brut
  const ticks: number[] = []
  for (let v = 0; v < max + pas; v += pas) ticks.push(v)
  return ticks
}

function jourCourt(jour: string): string {
  return `${Number(jour.slice(8, 10))} ${formatMoisCourt(jour)}`
}

function barreArrondie(x: number, y: number, l: number, h: number): string {
  const r = Math.min(4, l / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + l - r}Q${x + l},${y} ${x + l},${y + r}V${y + h}Z`
}

function Infobulle({ x, children }: { x: number; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[10px] border border-bordure bg-white px-2.5 py-1.5 text-[12px] whitespace-nowrap text-encre shadow-sm"
      style={{ left: `${Math.min(88, Math.max(12, x))}%` }}
    >
      {children}
    </div>
  )
}

function DonneesEnTableau({ entetes, lignes }: { entetes: string[]; lignes: (string | number)[][] }) {
  return (
    <details className="mt-2 text-[13px] print:hidden">
      <summary className="cursor-pointer font-semibold text-action">Voir les données</summary>
      <div className="mt-2 max-h-56 overflow-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr>
              {entetes.map((e) => (
                <th key={e} className="border-b border-bordure px-2 py-1 font-semibold text-gris">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                {l.map((v, j) => (
                  <td key={j} className="border-b border-bordure px-2 py-1">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

const L = 640
const H = 200
const M = { haut: 28, droite: 12, bas: 22, gauche: 40 }

/** Rythme de réservation : places vendues par jour de réservation. */
export function HistogrammeRythme({ points, description }: { points: PointRythme[]; description: string }) {
  const [survol, setSurvol] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.places))
  const ticks = graduations(max)
  const haut = ticks.at(-1) ?? max
  const largeurZone = L - M.gauche - M.droite
  const pas = largeurZone / Math.max(1, points.length)
  const barre = Math.min(24, pas * 0.6)
  const y = (v: number) => M.haut + (H - M.haut - M.bas) * (1 - v / haut)
  const total = points.reduce((s, p) => s + p.places, 0)
  const point = survol !== null ? points[survol] : null

  return (
    <figure>
      <div className="relative">
        {point && survol !== null && (
          <Infobulle x={((M.gauche + pas * (survol + 0.5)) / L) * 100}>
            <strong>{jourCourt(point.jour)}</strong> · {point.places} place{point.places > 1 ? "s" : ""} ·{" "}
            {point.reservations} réservation{point.reservations > 1 ? "s" : ""}
          </Infobulle>
        )}
        <svg viewBox={`0 0 ${L} ${H}`} className="h-auto w-full" role="img" aria-label={`${description} : ${total} places au total.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.gauche} x2={L - M.droite} y1={y(t)} y2={y(t)} stroke={COULEUR_GRILLE} strokeWidth={1} />
              <text x={M.gauche - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={COULEUR_TEXTE}>
                {formatMontant(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x = M.gauche + pas * i + (pas - barre) / 2
            const h = y(0) - y(p.places)
            const montrerDate = i === points.length - 1 || (points.length - 1 - i) % 7 === 0
            return (
              <g key={p.jour}>
                {h > 0 && (
                  <path
                    d={barreArrondie(x, y(p.places), barre, h)}
                    fill={COULEUR_SERIE}
                    opacity={survol === null || survol === i ? 1 : 0.45}
                  />
                )}
                {montrerDate && (
                  <text x={x + barre / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={COULEUR_TEXTE}>
                    {jourCourt(p.jour)}
                  </text>
                )}
                <rect
                  x={M.gauche + pas * i}
                  y={M.haut}
                  width={pas}
                  height={H - M.haut - M.bas}
                  fill="transparent"
                  onMouseEnter={() => setSurvol(i)}
                  onMouseLeave={() => setSurvol(null)}
                />
              </g>
            )
          })}
        </svg>
      </div>
      <DonneesEnTableau
        entetes={["Jour", "Places", "Réservations"]}
        lignes={points.map((p) => [jourCourt(p.jour), p.places, p.reservations])}
      />
    </figure>
  )
}

/** Courbe des places vendues cumulées de J-30 à J0, comparée à la référence. */
export function CourbeReservation({
  courbe,
  reference,
  capacite,
  libelleReference,
  actuel,
}: {
  courbe: PointCourbe[]
  reference: { joursAvant: number; places: number }[] | null
  capacite: number
  libelleReference: string
  /** Point « maintenant » (jours avant le départ, décimal) pour une traversée à venir. */
  actuel?: { joursAvant: number; places: number } | null
}) {
  const [survol, setSurvol] = useState<number | null>(null)
  const n = courbe.length
  const ticks = graduations(capacite)
  const haut = Math.max(capacite, ticks.at(-1) ?? capacite)
  const x = (i: number) => M.gauche + ((L - M.gauche - M.droite) * i) / Math.max(1, n - 1)
  const y = (v: number) => M.haut + (H - M.haut - M.bas) * (1 - v / haut)
  const connus = courbe.map((p, i) => ({ ...p, i })).filter((p) => p.places !== null) as (PointCourbe & { i: number; places: number })[]
  const trace = (pts: { i: number; places: number }[]) => pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)},${y(p.places)}`).join("")
  const refPts = reference ? reference.map((p, i) => ({ i, places: p.places })) : []
  const maintenant = actuel ? { i: n - 1 - actuel.joursAvant, places: actuel.places, joursAvant: actuel.joursAvant } : null
  if (maintenant) connus.push(maintenant)
  const dernier = connus.at(-1)
  const finRef = refPts.at(-1)
  const pointSurvol = survol !== null ? courbe[survol] : null

  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-encre">
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="1" x2="21" y1="4" y2="4" stroke={COULEUR_SERIE} strokeWidth="2" strokeLinecap="round" />
          </svg>
          Cette traversée
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="22" height="8" aria-hidden>
            <line x1="1" x2="21" y1="4" y2="4" stroke={COULEUR_REFERENCE} strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
          </svg>
          {libelleReference}
        </span>
      </figcaption>
      <div className="relative">
        {pointSurvol && survol !== null && (
          <Infobulle x={(x(survol) / L) * 100}>
            <strong>{pointSurvol.joursAvant === 0 ? "Départ" : `J-${pointSurvol.joursAvant}`}</strong> ·{" "}
            {pointSurvol.places === null ? "à venir" : `${pointSurvol.places} places`}
            {reference && ` · référence ${Math.round(reference[survol]?.places ?? 0)}`}
          </Infobulle>
        )}
        <svg
          viewBox={`0 0 ${L} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Places vendues cumulées de J-${n - 1} au départ${dernier ? ` : ${dernier.places} ${maintenant ? "aujourd’hui" : `à J-${dernier.joursAvant}`}` : ""}.`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.gauche} x2={L - M.droite} y1={y(t)} y2={y(t)} stroke={COULEUR_GRILLE} strokeWidth={1} />
              <text x={M.gauche - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={COULEUR_TEXTE}>
                {t}
              </text>
            </g>
          ))}
          <line x1={M.gauche} x2={L - M.droite} y1={y(capacite)} y2={y(capacite)} stroke={COULEUR_TEXTE} strokeWidth={1} />
          <text x={L - M.droite} y={y(capacite) - 5} textAnchor="end" fontSize={11} fill={COULEUR_TEXTE}>
            Capacité {capacite}
          </text>
          {courbe.map((p, i) =>
            i % 5 === 0 || i === n - 1 ? (
              <text key={p.joursAvant} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill={COULEUR_TEXTE}>
                {p.joursAvant === 0 ? "J0" : `J-${p.joursAvant}`}
              </text>
            ) : null,
          )}
          {survol !== null && <line x1={x(survol)} x2={x(survol)} y1={M.haut} y2={H - M.bas} stroke={COULEUR_TEXTE} strokeWidth={1} />}
          {refPts.length > 0 && (
            <path d={trace(refPts)} fill="none" stroke={COULEUR_REFERENCE} strokeWidth={2} strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {connus.length > 0 && (
            <path d={trace(connus)} fill="none" stroke={COULEUR_SERIE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          )}
          {finRef && (
            <text x={x(finRef.i) - 4} y={y(finRef.places) + 14} textAnchor="end" fontSize={11} fill={COULEUR_TEXTE}>
              {Math.round(finRef.places)}
            </text>
          )}
          {dernier && (
            <g>
              <circle cx={x(dernier.i)} cy={y(dernier.places)} r={5} fill={COULEUR_SERIE} stroke="white" strokeWidth={2} />
              <text x={x(dernier.i)} y={y(dernier.places) - 9} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--c-encre)">
                {dernier.places}
                {maintenant ? " aujourd’hui" : ""}
              </text>
            </g>
          )}
          {survol !== null && courbe[survol].places !== null && (
            <circle cx={x(survol)} cy={y(courbe[survol].places as number)} r={4} fill={COULEUR_SERIE} stroke="white" strokeWidth={2} />
          )}
          {courbe.map((p, i) => (
            <rect
              key={`zone-${p.joursAvant}`}
              x={x(i) - (L - M.gauche - M.droite) / Math.max(1, n - 1) / 2}
              y={M.haut}
              width={(L - M.gauche - M.droite) / Math.max(1, n - 1)}
              height={H - M.haut - M.bas}
              fill="transparent"
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
            />
          ))}
        </svg>
      </div>
      <DonneesEnTableau
        entetes={["Moment", "Places vendues", ...(reference ? ["Référence"] : [])]}
        lignes={courbe.map((p, i) => [
          p.joursAvant === 0 ? "Départ" : `J-${p.joursAvant}`,
          p.places ?? "—",
          ...(reference ? [Math.round(reference[i]?.places ?? 0)] : []),
        ])}
      />
    </figure>
  )
}

/** Barres horizontales étiquetées (une seule couleur : le libellé porte l'identité). */
export function BarresRepartition({
  lignes,
}: {
  lignes: { libelle: string; valeur: number; etiquette: string }[]
}) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur))
  return (
    <ul className="space-y-3">
      {lignes.map((l) => (
        <li key={l.libelle}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-semibold text-encre">{l.libelle}</span>
            <span className="tabular-nums text-gris">{l.etiquette}</span>
          </div>
          <div className="mt-1 h-3 rounded-r-[4px]" aria-hidden>
            <div
              className={cn("h-full rounded-r-[4px] bg-action")}
              style={{ width: `${(l.valeur / max) * 100}%`, minWidth: l.valeur > 0 ? 2 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
