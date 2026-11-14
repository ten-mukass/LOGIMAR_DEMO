"use client"

import { useMemo, useState } from "react"
import { filtrerTraversees, moisDeLaPeriode } from "@/domain/indicateurs"
import { NOMS_MOIS } from "@/domain/temps"
import { useEtatVentes } from "@/lib/use-etat-ventes"
import { syntheseTraversees } from "@/services/gestion/service-gestion"
import { Chargement, classesSelect, EnTetePage, Section } from "./elements"
import { nomLigne } from "./libelles"
import { TableauTraversees } from "./tableau-traversees"

type Moment = "a-venir" | "parties" | "toutes"

export function ListeTraversees() {
  const { etat } = useEtatVentes()
  const [mois, setMois] = useState<string | null>(null)
  const [ligneId, setLigneId] = useState<string | null>(null)
  const [moment, setMoment] = useState<Moment>("a-venir")

  const lignes = useMemo(() => {
    if (!etat) return []
    const ids = new Set(filtrerTraversees(etat.traversees, { mois, ligneId }).map((t) => t.id))
    return syntheseTraversees(etat).filter(
      (s) =>
        ids.has(s.traversee.id) &&
        (moment === "toutes" || (moment === "parties") === (s.statut === "partie")),
    )
  }, [etat, mois, ligneId, moment])

  if (!etat) return <Chargement />
  const { referentiel } = etat
  return (
    <>
      <EnTetePage
        titre="Traversées"
        sousTitre={`${lignes.length} traversée${lignes.length > 1 ? "s" : ""} · cliquez sur une date pour ouvrir la fiche (paliers, courbe, manifeste)`}
        actions={
          <>
            <label className="sr-only" htmlFor="traversees-moment">
              Moment
            </label>
            <select id="traversees-moment" className={classesSelect} value={moment} onChange={(e) => setMoment(e.target.value as Moment)}>
              <option value="a-venir">À venir</option>
              <option value="parties">Parties</option>
              <option value="toutes">Toutes</option>
            </select>
            <label className="sr-only" htmlFor="traversees-mois">
              Mois
            </label>
            <select id="traversees-mois" className={classesSelect} value={mois ?? ""} onChange={(e) => setMois(e.target.value || null)}>
              <option value="">Tous les mois</option>
              {moisDeLaPeriode(referentiel.config.periode).map((m) => {
                const [a, n] = m.split("-").map(Number)
                return (
                  <option key={m} value={m}>
                    {NOMS_MOIS[n - 1]} {a}
                  </option>
                )
              })}
            </select>
            <label className="sr-only" htmlFor="traversees-sens">
              Sens
            </label>
            <select id="traversees-sens" className={classesSelect} value={ligneId ?? ""} onChange={(e) => setLigneId(e.target.value || null)}>
              <option value="">Les deux sens</option>
              {referentiel.lignes.map((l) => (
                <option key={l.id} value={l.id}>
                  {nomLigne(l.id, referentiel.lignes, referentiel.ports)}
                </option>
              ))}
            </select>
          </>
        }
      />
      <Section titre="Programme">
        <TableauTraversees
          lignes={lignes}
          ports={referentiel.ports}
          lignesMaritimes={referentiel.lignes}
          familles={referentiel.familles}
          joursPickUp={etat.parametres.joursPickUpPrincipal}
        />
      </Section>
    </>
  )
}
