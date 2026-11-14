"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { Segmente } from "@/components/ui/segmente"
import { comparerMois, joursParJourSemaine, moisCouverts, moisDuJour, type Mois } from "@/domain/calendrier"
import type { ConfigCommerciale } from "@/domain/config"
import { estOuverteALaVente, jourDeDepart, joursDesTraversees } from "@/domain/programme"
import { versParametres } from "@/domain/recherche"
import { formatJourLong, formatMoisAnnee, jourLocal, NOMS_JOURS } from "@/domain/temps"
import type { CodePort, Ligne, Port, RegleProgramme } from "@/domain/types"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { cn } from "@/lib/utils"
import { repository } from "@/services"

/** Couleurs des groupes de jours, dans l'ordre du programme (mardi, vendredi, dimanche). */
const TEINTES = [
  { entete: "bg-action text-white", jour: "border-action bg-bleu-pale text-marine" },
  { entete: "bg-foret-texte text-white", jour: "border-foret-texte bg-vert-pale text-foret-texte" },
  { entete: "bg-soleil text-marine", jour: "border-soleil-bordure bg-soleil-pale text-marine" },
]

type EtatJour = "passe" | "complet" | "ouvert"

export function CalendrierHoraires({
  lignes,
  ports,
  regles,
  config,
}: {
  lignes: Ligne[]
  ports: Port[]
  regles: RegleProgramme[]
  config: ConfigCommerciale
}) {
  const maintenant = useMaintenant()
  const [ligneId, setLigneId] = useState(lignes[0].id)
  const [moisChoisi, setMoisChoisi] = useState<Mois | null>(null)
  const port = (id: string) => ports.find((p) => p.id === id)
  const ligne = lignes.find((l) => l.id === ligneId) ?? lignes[0]

  const chargerTraversees = useCallback(() => repository.listerTraversees({ ligneId }), [ligneId])
  const { donnees: traversees } = useDonnees(chargerTraversees)

  const mois = useMemo(() => (traversees ? moisCouverts(joursDesTraversees(traversees)) : []), [traversees])
  const moisDuJourCourant = maintenant ? moisDuJour(jourLocal(maintenant)) : null
  const courant =
    moisChoisi ??
    mois.find((m) => moisDuJourCourant && comparerMois(m, moisDuJourCourant) === 0) ??
    mois[0] ??
    null
  const index = courant ? mois.findIndex((m) => comparerMois(m, courant) === 0) : -1

  const duMois = useMemo(
    () =>
      traversees && courant
        ? traversees.filter((t) => {
            const m = moisDuJour(jourDeDepart(t))
            return comparerMois(m, courant) === 0
          })
        : [],
    [traversees, courant],
  )
  const chargerInventaires = useCallback(
    () => repository.listerInventaires(duMois.map((t) => t.id), maintenant ?? new Date(0)),
    [duMois, maintenant],
  )
  const { donnees: inventaires } = useDonnees(maintenant && duMois.length > 0 ? chargerInventaires : null)

  const etats = new Map<string, { etat: EtatJour }>()
  if (maintenant) {
    for (const t of duMois) {
      const restantes = inventaires?.find((i) => i.traversee.id === t.id)?.placesRestantes
      const etat: EtatJour = !estOuverteALaVente(t, maintenant, config.ventesEnLigneJusqua)
        ? "passe"
        : restantes === 0
          ? "complet"
          : "ouvert"
      etats.set(jourDeDepart(t), { etat })
    }
  }

  const regle = regles.find((r) => r.ligneId === ligneId)
  const groupes = courant && regle ? joursParJourSemaine([...etats.keys()], courant, regle.joursSemaine) : []
  const de = port(ligne.portDepartId)
  const a = port(ligne.portArriveeId)

  return (
    <>
      <div className="bg-marine px-5 pb-5 pt-5 text-white md:rounded-b-[28px] md:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[22px] font-bold md:text-[30px]">Jours de traversée</h1>
          <div className="mt-4 flex items-center justify-between rounded-champ bg-marine-2 px-1 py-1">
            <button
              type="button"
              onClick={() => setMoisChoisi(mois[index - 1])}
              disabled={index <= 0}
              aria-label="Mois précédent"
              className="flex size-12 items-center justify-center rounded-champ disabled:opacity-40"
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
            <p className="font-titre text-[17px] font-bold" aria-live="polite">
              {courant ? formatMoisAnnee(courant.annee, courant.mois) : "…"}
            </p>
            <button
              type="button"
              onClick={() => setMoisChoisi(mois[index + 1])}
              disabled={index < 0 || index >= mois.length - 1}
              aria-label="Mois suivant"
              className="flex size-12 items-center justify-center rounded-champ disabled:opacity-40"
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
          </div>
          <div className="mt-3">
            <Segmente
              sombre
              libelle="Sens de la traversée"
              valeur={ligneId}
              onChange={setLigneId}
              options={lignes.map((l) => ({
                valeur: l.id,
                libelle: `${port(l.portDepartId)?.code} → ${port(l.portArriveeId)?.code}`,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-3 px-5 py-5 md:px-8">
        <p className="text-[15px] text-gris">
          Départs de {de?.nom} vers {a?.nom}. Touchez une date pour voir les tarifs.
        </p>
        {groupes.length === 0
          ? [0, 1, 2].map((i) => <div key={i} className="h-[110px] animate-pulse rounded-carte bg-white" />)
          : groupes.map((g, i) => {
              const teinte = TEINTES[i % TEINTES.length]
              return (
                <section key={g.jourSemaine} className="overflow-hidden rounded-carte border border-bordure bg-white">
                  <h2 className={cn("px-4 py-2 font-sans text-[15px] font-bold", teinte.entete)}>
                    {NOMS_JOURS[g.jourSemaine]}
                  </h2>
                  <ul className="flex flex-wrap gap-2 p-3.5">
                    {g.jours.map((jour) => {
                      const etat = etats.get(jour)?.etat ?? "passe"
                      const numero = Number(jour.slice(8))
                      if (etat === "ouvert") {
                        const href = `/resultats?${versParametres({
                          depart: de?.code as CodePort,
                          arrivee: a?.code as CodePort,
                          date: jour,
                          dateRetour: null,
                          passagers: { adultes: 1, enfants: 0, bebes: 0 },
                        })}`
                        return (
                          <li key={jour}>
                            <Link
                              href={href}
                              aria-label={`${formatJourLong(jour)} : voir les tarifs`}
                              className={cn(
                                "flex size-12 items-center justify-center rounded-[10px] border font-titre text-[17px] font-bold tabular-nums",
                                teinte.jour,
                              )}
                            >
                              {numero}
                            </Link>
                          </li>
                        )
                      }
                      return (
                        <li
                          key={jour}
                          className="flex h-12 min-w-12 flex-col items-center justify-center rounded-[10px] bg-[#eef2f7] px-1.5 text-gris"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "font-titre font-bold tabular-nums",
                              etat === "passe" ? "text-[17px] line-through decoration-2" : "text-[15px] leading-none",
                            )}
                          >
                            {numero}
                          </span>
                          {etat === "complet" && (
                            <span aria-hidden className="text-[11px] font-semibold leading-tight">
                              Complet
                            </span>
                          )}
                          <span className="sr-only">
                            {formatJourLong(jour)} : {etat === "complet" ? "complet" : "vente close"}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
      </div>
    </>
  )
}
