"use client"

import { LockKeyhole } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { TexteBandeauDemo } from "@/components/site/bandeau-demo"
import { Logo } from "@/components/site/logo"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { cn } from "@/lib/utils"
import { accesGestion } from "@/services"
import { gestionParComptes } from "@/services/mode-gestion"
import { deconnecterGestion, lireSessionGestion, type SessionGestion } from "@/services/serveur/actions-gestion"
import { MenuLateral, MenuMobile, useMenuReplie } from "./menu-gestion"
import { ContexteProfilGestion } from "./profil-gestion"

/**
 * Back-office et embarquement : comptes de l'équipe (mode « comptes », la page est déjà filtrée par proxy.ts),
 * ou écran de code d'accès de la démonstration (mode « code »).
 */
export function GardeGestion({ children }: { children: (seDeconnecter: () => Promise<void>) => ReactNode }) {
  return gestionParComptes ? <GardeComptes>{children}</GardeComptes> : <GardeCode>{children}</GardeCode>
}

function GardeComptes({ children }: { children: (seDeconnecter: () => Promise<void>) => ReactNode }) {
  const [profil, setProfil] = useState<SessionGestion | null | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    const versConnexion = () =>
      router.replace(`/gestion/connexion?suite=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    let actif = true
    lireSessionGestion()
      .then((p) => {
        if (!actif) return
        if (p) setProfil(p)
        else versConnexion()
      })
      .catch(() => {
        if (actif) versConnexion()
      })
    return () => {
      actif = false
    }
  }, [router])

  if (!profil) return <main className="min-h-[60dvh]" />
  return (
    <ContexteProfilGestion.Provider value={profil}>
      {children(async () => {
        await deconnecterGestion()
        router.replace("/gestion/connexion")
      })}
    </ContexteProfilGestion.Provider>
  )
}

function GardeCode({ children }: { children: (seDeconnecter: () => Promise<void>) => ReactNode }) {
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

  if (connecte === null)
    return (
      <>
        <TexteBandeauDemo />
        <main className="min-h-[60dvh]" />
      </>
    )
  if (!connecte)
    return (
      <>
        <TexteBandeauDemo />
        <Connexion onConnecte={() => setConnecte(true)} />
      </>
    )
  return children(async () => {
    await accesGestion.deconnecter()
    setConnecte(false)
  })
}

/** Back-office : écran de code d'accès, puis menu latéral (réductible) et contenu de la page. */
export function CadreGestion({ children }: { children: ReactNode }) {
  return <GardeGestion>{(seDeconnecter) => <Disposition onDeconnexion={seDeconnecter}>{children}</Disposition>}</GardeGestion>
}

function Disposition({ onDeconnexion, children }: { onDeconnexion: () => Promise<void>; children: ReactNode }) {
  const [replie, basculer] = useMenuReplie()
  return (
    // --menu : largeur occupée par le menu, pour les éléments qui se calent sur la largeur de l'écran.
    <div className={cn("flex min-h-dvh bg-ecume [--menu:0px]", replie ? "lg:[--menu:72px]" : "lg:[--menu:15rem]")}>
      <MenuLateral replie={replie} onBasculer={basculer} onDeconnexion={onDeconnexion} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TexteBandeauDemo />
        <MenuMobile onDeconnexion={onDeconnexion} />
        <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 md:px-6 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
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
