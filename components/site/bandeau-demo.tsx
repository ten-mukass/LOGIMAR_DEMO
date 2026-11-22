"use client"

import { usePathname } from "next/navigation"
import { estEspaceGestion } from "./liens"

/** Bandeau discret rappelant que tout est fictif (PERIMETRE_DEMO). */
export function TexteBandeauDemo() {
  return (
    <p className="bg-encre px-4 print:hidden py-1.5 text-center text-xs font-medium text-white">
      Version de démonstration — données d’exemple
    </p>
  )
}

/** En haut du site client ; la gestion et l'embarquement le placent eux-mêmes, à côté de leur menu. */
export function BandeauDemo() {
  const chemin = usePathname()
  if (estEspaceGestion(chemin)) return null
  return <TexteBandeauDemo />
}
