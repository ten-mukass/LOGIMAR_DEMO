"use client"

import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  Ship,
  Ticket,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Logo } from "@/components/site/logo"
import { LIBELLES_ROLES, peut, type Droit } from "@/domain/roles"
import { cn } from "@/lib/utils"
import { gestionParComptes } from "@/services/mode-gestion"
import { useProfilGestion } from "./profil-gestion"

const LIENS: { href: string; libelle: string; icone: LucideIcon; droit: Droit }[] = [
  { href: "/admin", libelle: "Tableau de bord", icone: LayoutDashboard, droit: "back-office" },
  { href: "/admin/traversees", libelle: "Traversées", icone: Ship, droit: "back-office" },
  { href: "/admin/reservations", libelle: "Réservations", icone: Ticket, droit: "back-office" },
  { href: "/scan", libelle: "Embarquement", icone: ScanLine, droit: "embarquement" },
  { href: "/admin/utilisateurs", libelle: "Utilisateurs", icone: Users, droit: "utilisateurs" },
]

function actif(chemin: string, href: string): boolean {
  return href === "/admin" ? chemin === "/admin" : chemin === href || chemin.startsWith(`${href}/`)
}

/** Préférence d'affichage propre à ce navigateur : menu réduit à ses icônes ou développé. */
const CLE_MENU = "logimar-demo:v2:menu-gestion"

/** Menu latéral réduit ou développé, mémorisé dans le navigateur (sans conséquence s'il est indisponible). */
export function useMenuReplie(): [boolean, () => void] {
  // Le cadre de gestion n'est monté qu'après la vérification d'accès, côté navigateur : lecture directe possible.
  const [replie, setReplie] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem(CLE_MENU) === "replie"
    } catch {
      return false
    }
  })
  function basculer() {
    setReplie((r) => {
      try {
        window.localStorage.setItem(CLE_MENU, r ? "deplie" : "replie")
      } catch {
        // stockage indisponible : la préférence ne sera pas retenue
      }
      return !r
    })
  }
  return [replie, basculer]
}

const classesElement =
  "group relative flex h-11 items-center gap-3 rounded-champ text-[14px] font-semibold focus-visible:outline-white"
const classesInactif = "text-white/85 hover:bg-white/10 hover:text-white"

/**
 * Libellé d'un élément. Menu réduit : seule l'icône reste, le nom passe dans aria-label (posé sur l'élément)
 * et s'affiche en infobulle au survol ou au focus clavier.
 */
function Libelle({ texte, replie }: { texte: string; replie: boolean }) {
  if (!replie) return <span className="min-w-0 overflow-hidden whitespace-nowrap">{texte}</span>
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-[8px] bg-encre px-2.5 py-1 text-[13px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {texte}
    </span>
  )
}

/** Logo, rubriques, lien vers le site client et déconnexion : commun au menu latéral et au tiroir. */
function ContenuMenu({
  replie,
  idNavigation,
  onNaviguer,
  onDeconnexion,
  basculer,
}: {
  replie: boolean
  idNavigation?: string
  onNaviguer?: () => void
  onDeconnexion: () => Promise<void>
  basculer?: { onClick: () => void }
}) {
  const chemin = usePathname()
  const profil = useProfilGestion()
  // Code de démonstration : tous les liens ; comptes : ceux du rôle (le serveur revérifie).
  const liens = LIENS.filter((l) => !gestionParComptes || (profil !== null && peut(profil.role, l.droit)))
  const disposition = replie ? "justify-center px-0" : "px-3"
  const nom = (texte: string) => (replie ? texte : undefined)
  return (
    <>
      <Link
        href="/admin"
        onClick={onNaviguer}
        aria-label={replie ? "LOGIMAR 241, gestion : tableau de bord" : undefined}
        className={cn("flex h-16 shrink-0 items-center gap-3", replie ? "justify-center" : "px-[18px]")}
      >
        <Logo taille={36} />
        {!replie && (
          <span className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
            <span className="block font-titre text-[16px] font-extrabold">LOGIMAR 241</span>
            <span className="block text-[12px] font-medium text-white/80">Gestion</span>
          </span>
        )}
      </Link>

      <nav id={idNavigation} aria-label="Navigation de la gestion" className="mt-2 px-3">
        <ul className="space-y-1">
          {liens.map(({ href, libelle, icone: Icone }) => {
            const courant = actif(chemin, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNaviguer}
                  aria-current={courant ? "page" : undefined}
                  aria-label={nom(libelle)}
                  className={cn(classesElement, disposition, courant ? "bg-white text-marine" : classesInactif)}
                >
                  <Icone aria-hidden className="size-5 shrink-0" />
                  <Libelle texte={libelle} replie={replie} />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/15 px-3 py-3">
        {profil && (
          <p
            className={cn("flex min-h-11 items-center gap-3 text-[13px] text-white/85", disposition)}
            title={replie ? `${profil.nom} · ${LIBELLES_ROLES[profil.role]}` : undefined}
          >
            <UserRound aria-hidden className="size-5 shrink-0" />
            {replie ? (
              <span className="sr-only">
                Connecté : {profil.nom}, {LIBELLES_ROLES[profil.role]}
              </span>
            ) : (
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold text-white">{profil.nom}</span>
                <span className="block truncate">{LIBELLES_ROLES[profil.role]}</span>
              </span>
            )}
          </p>
        )}
        <Link
          href="/"
          onClick={onNaviguer}
          aria-label={nom("Site client")}
          className={cn(classesElement, disposition, classesInactif)}
        >
          <ExternalLink aria-hidden className="size-5 shrink-0" />
          <Libelle texte="Site client" replie={replie} />
        </Link>
        <button
          type="button"
          onClick={() => void onDeconnexion()}
          aria-label={nom("Se déconnecter")}
          className={cn(classesElement, disposition, classesInactif, "w-full")}
        >
          <LogOut aria-hidden className="size-5 shrink-0" />
          <Libelle texte="Se déconnecter" replie={replie} />
        </button>
        {basculer && (
          <button
            type="button"
            onClick={basculer.onClick}
            aria-controls={idNavigation}
            aria-label={nom("Agrandir le menu")}
            className={cn(classesElement, disposition, classesInactif, "w-full")}
          >
            {replie ? (
              <PanelLeftOpen aria-hidden className="size-5 shrink-0" />
            ) : (
              <PanelLeftClose aria-hidden className="size-5 shrink-0" />
            )}
            <Libelle texte={replie ? "Agrandir le menu" : "Réduire le menu"} replie={replie} />
          </button>
        )}
      </div>
    </>
  )
}

/** Ordinateur : menu fixé à gauche, que l'on réduit à ses icônes pour laisser la place aux tableaux. */
export function MenuLateral({
  replie,
  onBasculer,
  onDeconnexion,
}: {
  replie: boolean
  onBasculer: () => void
  onDeconnexion: () => Promise<void>
}) {
  const idNavigation = useId()
  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col bg-marine text-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex print:hidden",
        replie ? "w-[72px]" : "w-60",
      )}
    >
      <ContenuMenu
        replie={replie}
        idNavigation={idNavigation}
        onDeconnexion={onDeconnexion}
        basculer={{ onClick: onBasculer }}
      />
    </aside>
  )
}

const ECRAN_LARGE = "(min-width: 1024px)"

/** Tablette et téléphone : barre du haut avec un bouton qui fait glisser le menu depuis la gauche. */
export function MenuMobile({ onDeconnexion }: { onDeconnexion: () => Promise<void> }) {
  const chemin = usePathname()
  const [ouvert, setOuvert] = useState(false)
  const tiroir = useRef<HTMLDialogElement>(null)
  const rubrique = LIENS.find((l) => actif(chemin, l.href))?.libelle

  useEffect(() => {
    const dialogue = tiroir.current
    if (!dialogue) return
    if (ouvert && !dialogue.open) dialogue.showModal()
    if (!ouvert && dialogue.open) dialogue.close()
  }, [ouvert])

  // Passage en écran large avec le tiroir ouvert : on le ferme, le menu latéral prend le relais.
  useEffect(() => {
    const requete = window.matchMedia(ECRAN_LARGE)
    const surChangement = (e: MediaQueryListEvent) => {
      if (e.matches) setOuvert(false)
    }
    requete.addEventListener("change", surChangement)
    return () => requete.removeEventListener("change", surChangement)
  }, [])

  const fermer = () => setOuvert(false)

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-marine px-2 text-white lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-label="Ouvrir le menu"
          aria-haspopup="dialog"
          aria-expanded={ouvert}
          className="flex size-11 items-center justify-center rounded-champ hover:bg-white/10 focus-visible:outline-white"
        >
          <Menu aria-hidden className="size-6" />
        </button>
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <Logo taille={32} />
          <span className="whitespace-nowrap font-titre text-[15px] font-extrabold">LOGIMAR 241</span>
        </Link>
        {rubrique && <span className="ml-auto truncate px-2 text-[14px] font-semibold text-white/80">{rubrique}</span>}
      </header>

      <dialog
        ref={tiroir}
        aria-label="Menu de la gestion"
        onClose={fermer}
        onClick={(e) => {
          if (e.target === tiroir.current) fermer()
        }}
        className="tiroir-gestion bg-marine p-0 text-white"
      >
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer le menu"
            className="absolute right-2 top-2.5 flex size-11 items-center justify-center rounded-champ hover:bg-white/10 focus-visible:outline-white"
          >
            <X aria-hidden className="size-6" />
          </button>
          <ContenuMenu replie={false} onNaviguer={fermer} onDeconnexion={onDeconnexion} />
        </div>
      </dialog>
    </>
  )
}
