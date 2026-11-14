import { cn } from "@/lib/utils"

export const classesChamp =
  "h-12 w-full rounded-champ border border-bordure-champ bg-white px-3.5 text-[16px] text-encre placeholder:text-[#7d8ca0] focus:border-action focus:outline-none focus-visible:outline-3 focus-visible:outline-ocean aria-[invalid=true]:border-alerte"

/** Libellé, champ, aide et message d'erreur reliés pour les lecteurs d'écran. */
export function Champ({
  id,
  libelle,
  erreur,
  aide,
  className,
  children,
}: {
  id: string
  libelle: string
  erreur?: string
  aide?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[14px] font-semibold text-encre">
        {libelle}
      </label>
      {children}
      {aide && !erreur && (
        <p id={`${id}-aide`} className="text-[13px] text-gris">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${id}-erreur`} className="text-[13px] font-semibold text-alerte">
          {erreur}
        </p>
      )}
    </div>
  )
}

/** Attributs ARIA d'un champ selon son erreur. */
export function ariaChamp(id: string, erreur?: string, aide?: string) {
  return {
    id,
    "aria-invalid": erreur ? true : undefined,
    "aria-describedby": erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined,
  }
}
