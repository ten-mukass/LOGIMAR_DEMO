import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const classesBadge = cva("inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none", {
  variants: {
    ton: {
      soleil: "bg-soleil text-marine",
      succes: "bg-vert-pale text-foret-texte",
      alerte: "bg-alerte-pale text-alerte",
      info: "bg-bleu-pale text-marine",
    },
  },
  defaultVariants: { ton: "info" },
})

export function Badge({
  className,
  ton,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof classesBadge>) {
  return <span className={cn(classesBadge({ ton }), className)} {...props} />
}
