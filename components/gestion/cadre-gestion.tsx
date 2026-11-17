"use client"

import { ExternalLink, LayoutDashboard, LockKeyhole, LogOut, ScanLine, Ship, Ticket } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { Logo } from "@/components/site/logo"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { cn } from "@/lib/utils"
import { accesGestion } from "@/services"

const LIENS = [
  { href: "/admin", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/admin/traversees", libelle: "Traversées", icone: Ship },
  { href: "/admin/reservations", libelle: "Réservations", icone: Ticket },
  { href: "/scan", libelle: "Embarquement", icone: ScanLine },
]

function actif(chemin: string, href: string): boolean {
  return href === "/admin" ? chemin === "/admin" : chemin === href || chemin.startsWith(`${href}/`)
}

/** Écran de code d'accès tant que la session de gestion n'est pas ouverte (back-office et embarquement). */
export function GardeGestion({ children }: { children: (seDeconnecter: () => Promise<void>) => ReactNode }) {
  const [connecte, setConnecte] = useState<boolean | null>(null)

  useEffect(() => {
    let actif = true
    accesGestion.estConnecte().then((c) => {
      if (actif) setConnecte(c)
    })
    return () => {
      actif = false
    }
  }, [])

  if (connecte === null) return <main className="min-h-[60dvh]" />
  if (!connecte) return <Connexion onConnecte={() => setConnecte(true)} />
  return children(async () => {
    await accesGestion.deconnecter()
    setConnecte(false)
  })
}

/** Back-office : écran de code d'accès, puis en-tête et navigation propres à la gestion. */
export function CadreGestion({ children }: { children: ReactNode }) {
  return (
    <GardeGestion>
      {(seDeconnecter) => (
        <div className="min-h-dvh bg-ecume">
          <EnTeteGestion onDeconnexion={seDeconnecter} />
          <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 md:px-6 print:max-w-none print:p-0">{children}</main>
        </div>
      )}
    </GardeGestion>
  )
}

function EnTeteGestion({ onDeconnexion }: { onDeconnexion: () => Promise<void> }) {
  const chemin = usePathname()
  return (
    <header className="bg-marine text-white print:hidden">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <Logo taille={36} />
          <span className="leading-tight">
            <span className="block font-titre text-[16px] font-extrabold">LOGIMAR 241</span>
            <span className="block text-[12px] font-medium text-white/80">Gestion</span>
          </span>
        </Link>
        <nav aria-label="Navigation de la gestion" className="order-last w-full lg:order-none lg:w-auto">
          <ul className="flex gap-1">
            {LIENS.map(({ href, libelle, icone: Icone }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={actif(chemin, href) ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-champ px-3 text-[14px] font-semibold",
                    actif(chemin, href) ? "bg-white text-marine" : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icone aria-hidden className="size-4" />
                  {libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-champ px-3 text-[14px] font-semibold text-white/85 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink aria-hidden className="size-4" />
            Site client
          </Link>
          <button
            type="button"
            onClick={() => void onDeconnexion()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-champ border border-white/40 px-3 text-[14px] font-semibold hover:bg-white/10"
          >
            <LogOut aria-hidden className="size-4" />
            Se déconnecter
          </button>
        </div>
      </div>
    </header>
  )
}

function Connexion({ onConnecte }: { onConnecte: () => void }) {
  const [code, setCode] = useState("")
  const [erreur, setErreur] = useState<string | undefined>()
  const [enCours, setEnCours] = useState(false)

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    const ok = await accesGestion.connecter(code)
    setEnCours(false)
    if (ok) onConnecte()
    else setErreur("Code incorrect.")
  }

  return (
    <main className="flex min-h-[80dvh] items-center justify-center bg-ecume px-4 py-10">
      <form onSubmit={valider} className="w-full max-w-sm space-y-5 rounded-carte border border-bordure bg-white p-6">
        <div className="flex items-center gap-3">
          <Logo taille={44} className="border border-bordure" />
          <div>
            <h1 className="text-[20px] font-extrabold text-marine">Gestion LOGIMAR 241</h1>
            <p className="text-[14px] text-gris">Accès réservé à l’équipe LOGIMAR.</p>
          </div>
        </div>
        <Champ id="code-acces" libelle="Code d’accès" erreur={erreur} aide="Démonstration : code fourni par le présentateur.">
          <input
            {...ariaChamp("code-acces", erreur, "Démonstration : code fourni par le présentateur.")}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setErreur(undefined)
            }}
            className={classesChamp}
          />
        </Champ>
        <Bouton type="submit" pleineLargeur disabled={enCours || code.trim() === ""}>
          <LockKeyhole aria-hidden className="size-4" />
          Entrer
        </Bouton>
        <p className="text-[13px] text-gris">
          Version de démonstration : un simple code protège l’écran. La version de production aura des comptes
          nominatifs, des rôles et la double authentification.
        </p>
      </form>
    </main>
  )
}
