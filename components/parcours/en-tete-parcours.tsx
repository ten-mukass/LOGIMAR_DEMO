import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const ETAPES = ["Passagers", "Paiement", "Billet"] as const

/** En-tête des écrans du parcours : retour, titre, rappel du trajet et étapes. */
export function EnTeteParcours({
  titre,
  sousTitre,
  retour,
  etape,
  action,
  sombre = false,
}: {
  titre: string
  sousTitre?: string
  /** Lien de retour, ou action (ex. libérer les places avant de revenir). */
  retour: { href: string } | { onClick: () => void }
  etape?: 1 | 2 | 3
  action?: React.ReactNode
  sombre?: boolean
}) {
  const classesRetour = cn(
    "flex size-12 shrink-0 items-center justify-center rounded-champ",
    sombre ? "bg-marine-2 text-white" : "bg-bleu-pale text-marine",
  )
  const contenuRetour = <ChevronLeft aria-hidden className="size-6" />
  return (
    <header className={cn(sombre ? "bg-marine text-white" : "border-b border-bordure bg-white text-encre")}>
      <div className="mx-auto max-w-3xl px-4 pb-3 pt-3 md:px-8">
        <div className="flex items-center gap-3">
          {"href" in retour ? (
            <Link href={retour.href} aria-label="Retour" className={classesRetour}>
              {contenuRetour}
            </Link>
          ) : (
            <button type="button" onClick={retour.onClick} aria-label="Retour" className={classesRetour}>
              {contenuRetour}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className={cn("text-[18px] font-bold leading-tight", sombre ? "text-white" : "text-marine")}>{titre}</h1>
            {sousTitre && <p className={cn("text-sm", sombre ? "text-white/85" : "text-gris")}>{sousTitre}</p>}
          </div>
          {action}
        </div>
        {etape && (
          <ol className="mt-3 grid grid-cols-3 gap-2" aria-label="Étapes de la réservation">
            {ETAPES.map((libelle, i) => {
              const n = i + 1
              const etat = n < etape ? "faite" : n === etape ? "courante" : "a-venir"
              return (
                <li key={libelle} aria-current={etat === "courante" ? "step" : undefined}>
                  <span
                    aria-hidden
                    className={cn(
                      "block h-1 rounded-full",
                      etat === "faite" ? "bg-foret-texte" : etat === "courante" ? "bg-action" : "bg-bordure",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block text-[13px] font-semibold",
                      etat === "faite" ? "text-foret-texte" : etat === "courante" ? "text-action" : "text-gris",
                    )}
                  >
                    {n}. {libelle}
                    {etat === "faite" && <span className="sr-only"> (terminée)</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </header>
  )
}
