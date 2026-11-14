"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { liensNavigation } from "./liens"
import { Logo } from "./logo"

/** En-tête des écrans larges ; sur mobile, chaque écran a son propre en-tête et la navigation est en bas. */
export function EnTeteOrdinateur() {
  const chemin = usePathname()
  return (
    <header className="hidden border-b border-bordure bg-white md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo taille={40} className="border border-bordure" />
          <span className="font-titre text-lg font-extrabold text-marine">LOGIMAR 241</span>
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-1">
            {liensNavigation.map(({ href, libelle }) => {
              const actif = chemin === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={actif ? "page" : undefined}
                    className={cn(
                      "rounded-champ px-4 py-2.5 text-[15px] font-semibold",
                      actif ? "bg-bleu-pale text-action" : "text-gris hover:text-encre",
                    )}
                  >
                    {libelle}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
