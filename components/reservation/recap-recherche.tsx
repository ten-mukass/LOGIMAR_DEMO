"use client"

import { useSearchParams } from "next/navigation"
import { resumeComposition } from "@/domain/passagers"
import { lireCriteres } from "@/domain/recherche"
import { formatJourLong } from "@/domain/temps"
import type { Port } from "@/domain/types"

/** Rappel des critères lus dans l'URL (vérifie que rien ne se perd d'un écran à l'autre). */
export function RecapRecherche({ ports, passagersMax }: { ports: Port[]; passagersMax: number }) {
  const params = useSearchParams()
  const { criteres, erreurs } = lireCriteres(
    params,
    ports.map((p) => p.code),
    passagersMax,
  )
  if (!criteres) {
    return (
      <ul role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">
        {erreurs.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    )
  }
  const nom = (code: string) => ports.find((p) => p.code === code)?.nom ?? code
  return (
    <dl className="grid gap-2 rounded-carte border border-bordure bg-white p-4">
      <div>
        <dt className="text-[13px] font-medium text-gris">Trajet</dt>
        <dd className="font-bold">
          {nom(criteres.depart)} → {nom(criteres.arrivee)}
        </dd>
      </div>
      <div>
        <dt className="text-[13px] font-medium text-gris">{criteres.dateRetour ? "Aller" : "Date"}</dt>
        <dd className="font-bold">{formatJourLong(criteres.date, true)}</dd>
      </div>
      {criteres.dateRetour && (
        <div>
          <dt className="text-[13px] font-medium text-gris">Retour</dt>
          <dd className="font-bold">{formatJourLong(criteres.dateRetour, true)}</dd>
        </div>
      )}
      <div>
        <dt className="text-[13px] font-medium text-gris">Passagers</dt>
        <dd className="font-bold">{resumeComposition(criteres.passagers)}</dd>
      </div>
    </dl>
  )
}
