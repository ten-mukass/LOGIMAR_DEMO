"use client"

import { ArrowLeft, Download, Printer } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Bouton } from "@/components/ui/bouton"
import { compterParCategorie, LIBELLES_EMBARQUEMENT, manifeste, manifesteCsv } from "@/domain/manifeste"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, formatJourLong, heureLocale, jourLocal } from "@/domain/temps"
import { telecharger } from "@/lib/telecharger"
import { useEtatVentes } from "@/lib/use-etat-ventes"
import { Chargement, EnTetePage, Section, Tableau } from "./elements"
import { nomLigne } from "./libelles"

export function EcranManifeste({ id }: { id: string }) {
  const ids = useMemo(() => [id], [id])
  const { etat } = useEtatVentes(ids)

  const lignes = useMemo(() => (etat ? manifeste(etat.reservations, id, etat.maintenant) : []), [etat, id])

  if (!etat) return <Chargement />
  const t = etat.traversees[0]
  if (!t) return <EnTetePage titre="Traversée introuvable" />
  const { referentiel, maintenant } = etat
  const navire = referentiel.navires.find((n) => n.id === t.navireId)
  const compte = compterParCategorie(lignes)
  const titre = `${nomLigne(t.ligneId, referentiel.lignes, referentiel.ports)} · ${formatJourLong(jourDeDepart(t), true)} · ${heureLocale(t.departAt)}`

  function exporter() {
    const csv = manifesteCsv(lignes, [
      `Manifeste ${titre}`,
      `${navire?.nom ?? ""} · état au ${formatJourCourt(jourLocal(maintenant))} ${heureLocale(maintenant)} · document de démonstration`,
    ])
    telecharger(new TextEncoder().encode(csv), `manifeste-${t.id}.csv`, "text/csv;charset=utf-8")
  }

  return (
    <>
      <Link
        href={`/admin/traversees/${t.id}`}
        className="inline-flex items-center gap-1 text-[14px] font-semibold text-action hover:underline print:hidden"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Fiche de la traversée
      </Link>
      <EnTetePage
        titre={`Manifeste — ${titre}`}
        sousTitre={
          <>
            {navire?.nom} · {lignes.length} passagers payés ({compte.adulte} {libelleCategorie("adulte", compte.adulte)},{" "}
            {compte.enfant} {libelleCategorie("enfant", compte.enfant)}, {compte.bebe} {libelleCategorie("bebe", compte.bebe)}) ·
            état au {formatJourCourt(jourLocal(maintenant)).toLowerCase()} à {heureLocale(maintenant)}
          </>
        }
        actions={
          <>
            <Bouton variante="contour" taille="compact" onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" />
              Imprimer
            </Bouton>
            <Bouton variante="contour" taille="compact" onClick={exporter} disabled={lignes.length === 0}>
              <Download aria-hidden className="size-4" />
              Exporter (CSV)
            </Bouton>
          </>
        }
      />
      <p className="text-[13px] text-gris">
        Document de démonstration, données d’exemple. Format à valider avec LOGIMAR selon les exigences des autorités
        portuaires et de la police.
      </p>
      <Section titre="Passagers">
        {lignes.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-gris">Aucun passager payé pour cette traversée.</p>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th className="text-right">N°</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Catégorie</th>
                <th>Date de naissance</th>
                <th>Pièce</th>
                <th>Numéro de pièce</th>
                <th>Référence</th>
                <th>Embarquement</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={`${l.reservationId}-${l.numero}`}>
                  <td className="text-right text-gris">{l.numero}</td>
                  <td className="font-semibold">{l.nom}</td>
                  <td>{l.prenom}</td>
                  <td>{libelleCategorie(l.categorie)}</td>
                  <td>{l.dateNaissance ? l.dateNaissance.split("-").reverse().join("/") : ""}</td>
                  <td>{l.typePiece ? LIBELLES_PIECES_COURTS[l.typePiece] : ""}</td>
                  <td>{l.numeroPiece ?? ""}</td>
                  <td>{l.reference}</td>
                  <td>{LIBELLES_EMBARQUEMENT[l.statut]}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Section>
    </>
  )
}
