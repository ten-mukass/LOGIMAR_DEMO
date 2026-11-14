"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { comparerMois, moisCouverts, moisDuJour, semainesDuMois } from "@/domain/calendrier"
import { formatJourLong, formatMoisAnnee } from "@/domain/temps"
import { cn } from "@/lib/utils"

const JOURS = [
  ["L", "lundi"],
  ["M", "mardi"],
  ["M", "mercredi"],
  ["J", "jeudi"],
  ["V", "vendredi"],
  ["S", "samedi"],
  ["D", "dimanche"],
] as const

/** Calendrier mensuel où seuls les jours de traversée ouverts à la vente sont cliquables. */
export function CalendrierSelection({
  joursDisponibles,
  valeur,
  onChoisir,
}: {
  joursDisponibles: string[]
  valeur: string | null
  onChoisir: (jour: string) => void
}) {
  const mois = moisCouverts(joursDisponibles)
  const [index, setIndex] = useState(() => {
    if (!valeur) return 0
    const m = moisDuJour(valeur)
    return Math.max(0, mois.findIndex((x) => comparerMois(x, m) === 0))
  })

  if (mois.length === 0) {
    return <p className="py-6 text-center text-gris">Aucune traversée n’est ouverte à la vente pour ce trajet.</p>
  }

  const courant = mois[Math.min(index, mois.length - 1)]
  const disponibles = new Set(joursDisponibles)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0}
          aria-label="Mois précédent"
          className="flex size-12 items-center justify-center rounded-champ text-action disabled:text-bordure-champ"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <p className="font-titre text-[17px] font-bold text-marine" aria-live="polite">
          {formatMoisAnnee(courant.annee, courant.mois)}
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => i + 1)}
          disabled={index >= mois.length - 1}
          aria-label="Mois suivant"
          className="flex size-12 items-center justify-center rounded-champ text-action disabled:text-bordure-champ"
        >
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            {JOURS.map(([abrege, complet]) => (
              <th key={complet} scope="col" className="pb-1 text-xs font-semibold text-gris">
                <abbr title={complet} className="no-underline">
                  {abrege}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semainesDuMois(courant).map((semaine, i) => (
            <tr key={i}>
              {semaine.map((jour, j) => {
                if (!jour) return <td key={j} />
                const numero = Number(jour.slice(8))
                if (!disponibles.has(jour)) {
                  return (
                    <td key={jour} className="h-12 text-[15px] text-[#9aa8ba]">
                      {numero}
                    </td>
                  )
                }
                const choisi = jour === valeur
                return (
                  <td key={jour}>
                    <button
                      type="button"
                      onClick={() => onChoisir(jour)}
                      aria-pressed={choisi}
                      aria-label={formatJourLong(jour, true)}
                      className={cn(
                        "h-12 w-full rounded-[10px] font-titre text-[15px] font-bold tabular-nums",
                        choisi
                          ? "bg-soleil text-marine ring-2 ring-soleil-bordure"
                          : "border border-action bg-bleu-pale text-marine hover:bg-white",
                      )}
                    >
                      {numero}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-gris">Seuls les jours de traversée ouverts à la vente sont proposés.</p>
    </div>
  )
}
