"use client"

import Link from "next/link"
import { useCallback } from "react"
import type { ConfigCommerciale } from "@/domain/config"
import { estOuverteALaVente, jourDeDepart } from "@/domain/programme"
import { versParametres } from "@/domain/recherche"
import { formatJourCourt, heureLocale } from "@/domain/temps"
import type { CodePort, Ligne, Port } from "@/domain/types"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { repository } from "@/services"

/** Prochaine traversée ouverte à la vente dans chaque sens. */
export function ProchainesTraversees({
  lignes,
  ports,
  config,
}: {
  lignes: Ligne[]
  ports: Port[]
  config: ConfigCommerciale
}) {
  const maintenant = useMaintenant()
  const charger = useCallback(() => repository.listerTraversees(), [])
  const { donnees: traversees } = useDonnees(charger)
  const port = (id: string) => ports.find((p) => p.id === id)

  const prochaines =
    traversees && maintenant
      ? lignes.flatMap((l) => {
          const t = traversees.find(
            (x) => x.ligneId === l.id && estOuverteALaVente(x, maintenant, config.ventesEnLigneJusqua),
          )
          return t ? [{ ligne: l, traversee: t }] : []
        })
      : null

  return (
    <section aria-labelledby="titre-prochaines">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="titre-prochaines" className="text-[19px] font-bold text-marine md:text-[22px]">
          Prochaines traversées
        </h2>
        <Link href="/horaires" className="text-[15px] font-semibold text-action underline underline-offset-2">
          Tout le mois
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 lg:max-w-2xl">
        {prochaines === null
          ? lignes.map((l) => <li key={l.id} className="h-[108px] animate-pulse rounded-carte bg-white" />)
          : prochaines.map(({ ligne, traversee }) => {
              const de = port(ligne.portDepartId)
              const a = port(ligne.portArriveeId)
              const jour = jourDeDepart(traversee)
              const href = `/resultats?${versParametres({
                depart: de?.code as CodePort,
                arrivee: a?.code as CodePort,
                date: jour,
                dateRetour: null,
                passagers: { adultes: 1, enfants: 0, bebes: 0 },
              })}`
              return (
                <li key={traversee.id}>
                  <Link
                    href={href}
                    className="block h-full rounded-carte border border-bordure bg-white p-3.5 hover:border-action"
                  >
                    <span className="block text-[13px] font-bold uppercase tracking-wide text-foret-texte">
                      {formatJourCourt(jour)}
                    </span>
                    <span className="mt-1 block font-titre text-[22px] font-bold tabular-nums text-encre">
                      {heureLocale(traversee.departAt)}
                    </span>
                    <span className="mt-0.5 block text-sm text-gris">
                      {de?.nom} → {a?.nom}
                    </span>
                  </Link>
                </li>
              )
            })}
      </ul>
    </section>
  )
}
