"use client"

import { LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { GardeGestion } from "@/components/gestion/cadre-gestion"
import { TexteBandeauDemo } from "@/components/site/bandeau-demo"
import { Logo } from "@/components/site/logo"

/** Embarquement : même code d'accès que la gestion, en-tête compact pour le téléphone de l'agent. */
export function CadreScan({ children }: { children: ReactNode }) {
  return (
    <GardeGestion>
      {(seDeconnecter) => (
        <div className="min-h-dvh bg-ecume">
          <TexteBandeauDemo />
          <header className="bg-marine text-white">
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
              <Link href="/scan" className="flex items-center gap-2.5">
                <Logo taille={34} />
                <span className="leading-tight">
                  <span className="block font-titre text-[15px] font-extrabold">LOGIMAR 241</span>
                  <span className="block text-[12px] font-medium text-white/80">Embarquement</span>
                </span>
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <Link
                  href="/admin"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-champ px-2.5 text-[14px] font-semibold text-white/90 hover:bg-white/10"
                >
                  <LayoutDashboard aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Gestion</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void seDeconnecter()}
                  aria-label="Se déconnecter"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-champ px-2.5 text-[14px] font-semibold text-white/90 hover:bg-white/10"
                >
                  <LogOut aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Se déconnecter</span>
                </button>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>
        </div>
      )}
    </GardeGestion>
  )
}
