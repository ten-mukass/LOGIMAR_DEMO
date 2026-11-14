"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { afficheNavigation, liensNavigation } from "./liens"

export function NavigationBasse() {
  const chemin = usePathname()
  if (!afficheNavigation(chemin)) return null
  return (
    <>
      {/* Réserve la place de la barre fixe en bas de page. */}
      <div aria-hidden className="h-[72px] md:hidden" />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-bordure bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid h-[72px] grid-cols-4">
          {liensNavigation.map(({ href, libelle, icone: Icone }) => {
            const actif = chemin === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={actif ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 text-[13px]",
                    actif ? "font-bold text-action" : "font-medium text-gris",
                  )}
                >
                  <Icone aria-hidden className="size-6" strokeWidth={2} />
                  {libelle}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
