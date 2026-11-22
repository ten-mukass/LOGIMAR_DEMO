"use client"

import Link from "next/link"
import { formatEcart, formatFCFA, formatMontant, formatPourcentage } from "@/domain/format"
import { ORDRE_FAMILLES } from "@/domain/tarifs"
import { formatJourCourt, heureLocale, jourLocal } from "@/domain/temps"
import type { FamilleTarifaire, Ligne, Port } from "@/domain/types"
import { cn } from "@/lib/utils"
import type { SyntheseTraversee } from "@/services/gestion/service-gestion"
import { BadgesAlertes, Jauge, Tableau } from "./elements"
import { libelleStatutTraversee, nomLigne } from "./libelles"

export function TableauTraversees({
  lignes,
  ports,
  lignesMaritimes,
  familles,
  joursPickUp,
}: {
  lignes: SyntheseTraversee[]
  ports: Port[]
  lignesMaritimes: Ligne[]
  familles: FamilleTarifaire[]
  joursPickUp: number
}) {
  const nomFamille = (code: string) => familles.find((f) => f.code === code)?.nom ?? code
  if (lignes.length === 0) return <p className="py-6 text-center text-[14px] text-gris">Aucune traversée.</p>
  return (
    <>
      <Tableau>
        <thead>
          <tr>
            <th>Départ</th>
            <th>Sens</th>
            <th className="min-w-40">Remplissage</th>
            <th className="text-right">Recette</th>
            <th className="text-right">Par siège offert</th>
            {ORDRE_FAMILLES.map((f) => (
              <th key={f} className="text-right" title="Prix en vente pour un adulte, et palier">
                {nomFamille(f)}
              </th>
            ))}
            <th className="text-right">Pick-up {joursPickUp} j</th>
            <th className="text-right">Écart réf.</th>
            <th className="min-w-28">Alertes</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const t = l.traversee
            const partie = l.statut === "partie"
            return (
              <tr key={t.id} className={cn("hover:bg-bleu-pale/60", partie && "text-gris")}>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/traversees/${t.id}`} className="font-semibold text-action underline-offset-2 hover:underline">
                    {formatJourCourt(jourLocal(t.departAt))} · {heureLocale(t.departAt)}
                  </Link>
                  <span className="block text-[12px] text-gris">{libelleStatutTraversee(l.statut, l.ouverteALaVente)}</span>
                </td>
                <td className="whitespace-nowrap">{nomLigne(t.ligneId, lignesMaritimes, ports, true)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Jauge ratio={l.indicateurs.remplissage ?? 0} libelle={`Remplissage ${t.id}`} />
                    <span className="w-11 shrink-0 text-right font-semibold whitespace-nowrap">{formatPourcentage(l.indicateurs.remplissage ?? 0)}</span>
                  </div>
                  <span className="text-[12px] text-gris">
                    {l.indicateurs.places} / {t.capaciteVendable} places
                    {l.placesBloquees > 0 && ` · ${l.placesBloquees} en paiement`}
                  </span>
                </td>
                <td className="text-right whitespace-nowrap">{formatFCFA(l.indicateurs.recetteBillets, true)}</td>
                <td className="text-right whitespace-nowrap">
                  {l.indicateurs.recetteParSiege === null ? "—" : formatFCFA(l.indicateurs.recetteParSiege, true)}
                </td>
                {ORDRE_FAMILLES.map((f) => {
                  const c = l.enVente[f]
                  return (
                    <td
                      key={f}
                      className="text-right whitespace-nowrap"
                      title={partie ? undefined : c ? `${nomFamille(f)}, palier ${c.rang}` : `${nomFamille(f)} : plus en vente`}
                    >
                      {partie || !c ? (
                        <span className="text-gris">—</span>
                      ) : (
                        <>
                          {formatMontant(c.prix.adulte)}
                          <span className="ml-1 text-[11px] text-gris">P{c.rang}</span>
                        </>
                      )}
                    </td>
                  )
                })}
                <td className="text-right">{l.pickUp[joursPickUp] ?? 0}</td>
                <td className={cn("text-right whitespace-nowrap", l.ecart !== null && l.ecart < 0 && "text-alerte")}>
                  {l.ecart === null ? "—" : formatEcart(l.ecart)}
                </td>
                <td>
                  <BadgesAlertes alertes={l.alertes} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </Tableau>
      <p className="mt-2 text-[12px] text-gris">
        Éco, VIP : prix en vente aujourd’hui pour un adulte, et palier (P1, P2…). Remplissage : places
        vendues ; les places bloquées par un paiement en cours sont indiquées à part.
      </p>
    </>
  )
}
