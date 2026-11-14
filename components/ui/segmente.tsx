"use client"

import { cn } from "@/lib/utils"

/** Choix exclusif entre quelques options (ex. Aller simple / Aller-retour). */
export function Segmente<T extends string>({
  options,
  valeur,
  onChange,
  libelle,
  sombre = false,
}: {
  options: { valeur: T; libelle: string }[]
  valeur: T
  onChange: (valeur: T) => void
  libelle: string
  sombre?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={libelle}
      className={cn("grid gap-1 rounded-champ p-1", sombre ? "bg-marine-2" : "bg-ecume")}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const actif = o.valeur === valeur
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(o.valeur)}
            className={cn(
              "min-h-12 rounded-[10px] px-2 text-[15px] font-semibold transition-colors",
              actif
                ? sombre
                  ? "bg-white text-marine"
                  : "bg-white text-marine shadow-sm"
                : sombre
                  ? "text-white/85 hover:text-white"
                  : "text-gris hover:text-encre",
            )}
          >
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
