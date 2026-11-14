"use client"

import { UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { liensNavigation, rubriqueActive } from "./liens"
import { Logo } from "./logo"

/** En-tête des écrans larges ; sur mobile, chaque écran a son propre en-tête et la navigation est en bas. */
export function EnTeteOrdinateur() {
  const chemin = usePathname()
  return (
    <header className="hidden border-b border-bordure bg-white md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo taille={40} className="border border-bordure" />
          <span className="whitespace-nowrap font-titre text-lg font-extrabold text-marine">LOGIMAR 241</span>
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-1">
            {liensNavigation.map(({ href, libelle }) => {
              const actif = rubriqueActive(chemin) === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={actif ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-champ px-3 py-2.5 text-[15px] font-semibold lg:px-4",
                      actif ? "bg-bleu-pale text-action" : "text-gris hover:text-encre",
                    )}
                  >
                    {libelle}
                  </Link>
                </li>
              )
            })}
            <li>
              <Link
                href="/compte"
                aria-current={chemin === "/compte" ? "page" : undefined}
                className={cn(
                  "ml-1 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-champ border border-bordure px-3 py-2 text-[15px] font-semibold lg:ml-2 lg:px-4",
                  chemin === "/compte" ? "bg-bleu-pale text-action" : "text-gris hover:text-encre",
                )}
              >
                <UserRound aria-hidden className="size-4" />
                <span className="sr-only lg:not-sr-only">Mon compte</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
