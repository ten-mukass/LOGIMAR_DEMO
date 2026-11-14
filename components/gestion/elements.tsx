import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import type { Alerte } from "@/domain/indicateurs"
import type { EtatPalier } from "@/domain/paliers"
import type { StatutReservation } from "@/domain/types"
import { cn } from "@/lib/utils"
import { LIBELLES_ALERTE, LIBELLES_ETAT_PALIER, LIBELLES_STATUT } from "./libelles"

export function EnTetePage({ titre, sousTitre, actions }: { titre: string; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold text-marine">{titre}</h1>
        {sousTitre && <p className="mt-0.5 text-[14px] text-gris">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

export function Section({
  titre,
  action,
  children,
  className,
}: {
  titre: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-carte border border-bordure bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-bordure px-4 py-3">
        <h2 className="text-[16px] font-bold text-marine">{titre}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Indicateur chiffré : libellé, valeur, détail. */
export function Tuile({ libelle, valeur, detail }: { libelle: string; valeur: string; detail?: ReactNode }) {
  return (
    <div className="rounded-carte border border-bordure bg-white px-4 py-3">
      <p className="text-[13px] font-semibold text-gris">{libelle}</p>
      <p className="mt-1 font-titre text-[24px] font-bold leading-tight text-encre">{valeur}</p>
      {detail && <p className="mt-0.5 text-[13px] text-gris">{detail}</p>}
    </div>
  )
}

/** Jauge fine de remplissage. */
export function Jauge({ ratio, libelle }: { ratio: number; libelle: string }) {
  const pourcent = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div
      role="meter"
      aria-label={libelle}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pourcent)}
      className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-bleu-pale"
    >
      <div className={cn("h-full rounded-full", pourcent >= 100 ? "bg-marine" : "bg-action")} style={{ width: `${pourcent}%` }} />
    </div>
  )
}

const TON_ALERTE: Record<Alerte, "alerte" | "soleil" | "info" | "succes"> = {
  complete: "info",
  "presque-pleine": "soleil",
  "en-avance": "succes",
  "en-retard": "alerte",
  "paliers-fermes": "info",
}

export function BadgesAlertes({ alertes, enLigne = false }: { alertes: Alerte[]; enLigne?: boolean }) {
  if (alertes.length === 0) return <span className="text-gris">—</span>
  return (
    <span className={cn("flex gap-1", enLigne ? "flex-wrap" : "flex-col items-start")}>
      {alertes.map((a) => (
        <Badge key={a} ton={TON_ALERTE[a]} className="whitespace-nowrap px-2 py-0.5 text-[12px]">
          {LIBELLES_ALERTE[a]}
        </Badge>
      ))}
    </span>
  )
}

const TON_STATUT: Partial<Record<StatutReservation, "alerte" | "soleil" | "info" | "succes">> = {
  emise: "succes",
  payee: "succes",
  embarquee: "succes",
  bloquee: "soleil",
  absente: "alerte",
}

export function BadgeStatut({ statut }: { statut: StatutReservation }) {
  return (
    <Badge ton={TON_STATUT[statut] ?? "info"} className="whitespace-nowrap px-2 py-0.5 text-[12px]">
      {LIBELLES_STATUT[statut]}
    </Badge>
  )
}

const TON_PALIER: Record<EtatPalier, "alerte" | "soleil" | "info" | "succes"> = {
  "en-vente": "succes",
  "en-attente": "info",
  epuise: "soleil",
  ferme: "alerte",
}

export function BadgePalier({ etat }: { etat: EtatPalier }) {
  return (
    <Badge ton={TON_PALIER[etat]} className="whitespace-nowrap px-2 py-0.5 text-[12px]">
      {LIBELLES_ETAT_PALIER[etat]}
    </Badge>
  )
}

/** Tableau dense : en-tête collant, défilement horizontal sur tablette. */
export function Tableau({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[13px] tabular-nums [&_td]:border-b [&_td]:border-bordure [&_td]:px-2.5 [&_td]:py-2 [&_th]:border-b [&_th]:border-bordure [&_th]:bg-ecume [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-[12px] [&_th]:font-semibold [&_th]:whitespace-nowrap [&_th]:text-gris">
        {children}
      </table>
    </div>
  )
}

export function Chargement() {
  return <p className="py-10 text-center text-[14px] text-gris">Chargement des ventes…</p>
}

export const classesSelect =
  "h-10 rounded-champ border border-bordure-champ bg-white px-3 text-[14px] text-encre focus:border-action focus:outline-none"
