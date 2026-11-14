"use client"

import { CircleAlert } from "lucide-react"
import { useCallback } from "react"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { repository } from "@/services"

/** Bandeau d'info trafic (messages administrables, actifs à la date du jour). */
export function InfoTraficAccueil() {
  const maintenant = useMaintenant()
  const charger = useCallback(
    () => (maintenant ? repository.getInfosTrafic(maintenant) : Promise.resolve([])),
    [maintenant],
  )
  const { donnees: infos } = useDonnees(maintenant ? charger : null)
  if (!infos || infos.length === 0) return null
  return (
    <div className="space-y-2">
      {infos.map((info) => (
        <p
          key={info.id}
          className="flex gap-2.5 rounded-champ bg-soleil px-3.5 py-3 text-[15px] leading-snug text-marine"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>{info.niveau === "alerte" ? "Alerte trafic : " : "Info trafic : "}</strong>
            {info.message}
            {info.lien && info.libelleLien && (
              <>
                {" "}
                <a href={info.lien} className="font-bold text-marine underline" target="_blank" rel="noreferrer">
                  {info.libelleLien}
                </a>
              </>
            )}
          </span>
        </p>
      ))}
    </div>
  )
}
