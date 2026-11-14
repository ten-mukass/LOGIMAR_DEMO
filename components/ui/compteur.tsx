"use client"

import { Minus, Plus } from "lucide-react"

/** Sélecteur de quantité avec boutons − et + (cibles de 48 px). */
export function Compteur({
  libelle,
  aide,
  valeur,
  min,
  max,
  onChange,
  nomAccessible,
}: {
  libelle: string
  aide?: string
  valeur: number
  min: number
  max: number
  onChange: (valeur: number) => void
  /** Nom utilisé dans « Retirer un … » / « Ajouter un … ». */
  nomAccessible: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-semibold text-encre">{libelle}</p>
        {aide && <p className="text-sm text-gris">{aide}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(valeur - 1)}
          disabled={valeur <= min}
          aria-label={`Retirer ${nomAccessible}`}
          className="flex size-12 items-center justify-center rounded-champ border border-bordure-champ bg-white text-action disabled:text-bordure-champ"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <output aria-live="polite" className="w-6 text-center font-titre text-lg font-bold tabular-nums">
          {valeur}
        </output>
        <button
          type="button"
          onClick={() => onChange(valeur + 1)}
          disabled={valeur >= max}
          aria-label={`Ajouter ${nomAccessible}`}
          className="flex size-12 items-center justify-center rounded-champ border border-bordure-champ bg-white text-action disabled:text-bordure-champ"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}
