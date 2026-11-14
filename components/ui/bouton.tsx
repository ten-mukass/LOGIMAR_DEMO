import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export const classesBouton = cva(
  "inline-flex items-center justify-center gap-2 rounded-champ font-titre font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variante: {
        principal: "bg-action text-white hover:bg-marine",
        contour: "border-2 border-action bg-white text-action hover:bg-bleu-pale",
        succes: "bg-foret-texte text-white hover:bg-[#09662f]",
        surMarine: "border-2 border-white/80 bg-transparent text-white hover:bg-white/10",
        lien: "text-action underline underline-offset-2 hover:text-marine",
      },
      taille: {
        grand: "h-[54px] px-6 text-[17px]",
        normal: "h-12 px-5 text-base",
        compact: "h-10 px-4 text-sm",
        libre: "",
      },
      pleineLargeur: { true: "w-full" },
    },
    defaultVariants: { variante: "principal", taille: "normal" },
  },
)

export type VariantesBouton = VariantProps<typeof classesBouton>

export function Bouton({
  className,
  variante,
  taille,
  pleineLargeur,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantesBouton) {
  return <button type={type} className={cn(classesBouton({ variante, taille, pleineLargeur }), className)} {...props} />
}
