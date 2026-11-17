"use client"

import { ArrowLeft, Download, Printer, ScanLine } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import {
  compterParCategorie,
  LIBELLES_EMBARQUEMENT,
  LIBELLES_MODE,
  manifesteDeBordCsv,
  passagersPayesCsv,
  type LignePassager,
} from "@/domain/manifeste"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, formatJourLong, heureLocale, jourLocal } from "@/domain/temps"
import { telecharger } from "@/lib/telecharger"
import { useMaintenant } from "@/lib/use-maintenant"
import { cn } from "@/lib/utils"
import { serviceEmbarquement, type EtatEmbarquement } from "@/services"
import { Chargement, EnTetePage, Section, Tableau, Tuile } from "./elements"
import { nomLigne } from "./libelles"

type Onglet = "bord" | "vendus"

/** Relit l'état de l'embarquement toutes les 30 s et dès qu'un scan est fait dans un autre onglet. */
function useEtatEmbarquement(id: string): EtatEmbarquement | null | undefined {
  const tic = useMaintenant()
  const [version, setVersion] = useState(0)
  const [etat, setEtat] = useState<EtatEmbarquement | null | undefined>(undefined)

  useEffect(() => {
    const relire = () => setVersion((v) => v + 1)
    window.addEventListener("storage", relire)
    window.addEventListener("focus", relire)
    return () => {
      window.removeEventListener("storage", relire)
      window.removeEventListener("focus", relire)
    }
  }, [])

  useEffect(() => {
    if (tic === null) return
    let actif = true
    serviceEmbarquement.etat(id, new Date()).then((e) => {
      if (actif) setEtat(e)
    })
    return () => {
      actif = false
    }
  }, [id, tic, version])

  return etat
}

function resume(lignes: LignePassager[]): string {
  const c = compterParCategorie(lignes)
  return `${c.adulte} ${libelleCategorie("adulte", c.adulte)}, ${c.enfant} ${libelleCategorie("enfant", c.enfant)}, ${c.bebe} ${libelleCategorie("bebe", c.bebe)}`
}

export function EcranManifeste({ id }: { id: string }) {
  const etat = useEtatEmbarquement(id)
  const [onglet, setOnglet] = useState<Onglet>("bord")

  if (etat === undefined) return <Chargement />
  if (etat === null) return <EnTetePage titre="Traversée introuvable" />
  const { traversee: t, referentiel, maintenant, bord, passagers, compteur, cloture } = etat
  const navire = referentiel.navires.find((n) => n.id === t.navireId)
  const titre = `${nomLigne(t.ligneId, referentiel.lignes, referentiel.ports)} · ${formatJourLong(jourDeDepart(t), true)} · ${heureLocale(t.departAt)}`
  const etatAu = `état au ${formatJourCourt(jourLocal(maintenant)).toLowerCase()} à ${heureLocale(maintenant)}`

  function exporter() {
    const entete = [`${onglet === "bord" ? "Manifeste de bord" : "Billets vendus"} ${titre}`, `${navire?.nom ?? ""} · ${etatAu} · document de démonstration`]
    const csv = onglet === "bord" ? manifesteDeBordCsv(bord, (iso) => heureLocale(iso), entete) : passagersPayesCsv(passagers, entete)
    telecharger(new TextEncoder().encode(csv), `${onglet === "bord" ? "manifeste-bord" : "billets-vendus"}-${t.id}.csv`, "text/csv;charset=utf-8")
  }

  const lignes = onglet === "bord" ? bord : passagers

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
        titre={`${onglet === "bord" ? "Manifeste de bord" : "Billets vendus"} — ${titre}`}
        sousTitre={`${navire?.nom ?? ""} · ${etatAu}`}
        actions={
          <>
            <Link href={`/scan?t=${t.id}`} className={classesBouton({ variante: "contour", taille: "compact" })}>
              <ScanLine aria-hidden className="size-4" />
              Embarquement (scan)
            </Link>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:hidden">
        <Tuile libelle="À bord" valeur={String(compteur.aBord)} detail={bord.length > 0 ? resume(bord) : "aucun billet scanné"} />
        <Tuile libelle="Passagers payés" valeur={String(compteur.attendus)} detail={resume(passagers)} />
        <Tuile
          libelle={cloture ? "Absents" : "Encore attendus"}
          valeur={String(cloture ? compteur.absents : compteur.restants)}
          detail={cloture ? `embarquement clos à ${heureLocale(cloture.le)}` : "embarquement en cours"}
        />
        <Tuile
          libelle="Dernier embarquement"
          valeur={bord.length > 0 && bord.at(-1)?.embarqueLe ? heureLocale(bord.at(-1)!.embarqueLe!) : "—"}
          detail={bord.length > 0 ? `${bord.filter((l) => l.mode === "manuel").length} contrôle(s) manuel(s)` : undefined}
        />
      </div>

      <div role="tablist" aria-label="Listes de la traversée" className="flex gap-1 border-b border-bordure print:hidden">
        {(
          [
            ["bord", `Manifeste de bord (${bord.length})`],
            ["vendus", `Billets vendus (${passagers.length})`],
          ] as const
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            type="button"
            role="tab"
            aria-selected={onglet === valeur}
            onClick={() => setOnglet(valeur)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-4 text-[14px] font-semibold",
              onglet === valeur ? "border-action text-action" : "border-transparent text-gris hover:text-encre",
            )}
          >
            {libelle}
          </button>
        ))}
      </div>

      <p className="text-[13px] text-gris">
        {onglet === "bord"
          ? "Personnes réellement à bord : la liste se remplit à chaque billet scanné à l’embarquement, dans l’ordre de passage."
          : "Tous les passagers qui ont payé un billet pour cette traversée, avec leur statut d’embarquement."}{" "}
        Document de démonstration, données d’exemple ; format à valider avec LOGIMAR selon les exigences des autorités.
      </p>

      <Section titre={onglet === "bord" ? "Passagers à bord" : "Passagers payés"}>
        {lignes.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-[14px] text-gris">
              {onglet === "bord" ? "Personne à bord pour l’instant : aucun billet n’a été scanné." : "Aucun passager payé pour cette traversée."}
            </p>
            {onglet === "bord" && (
              <Link href={`/scan?t=${t.id}`} className={classesBouton({ taille: "compact" })}>
                Ouvrir l’embarquement
              </Link>
            )}
          </div>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th className="text-right">N°</th>
                {onglet === "bord" && <th>Heure</th>}
                <th>Nom</th>
                <th>Prénom</th>
                <th>Catégorie</th>
                <th>Date de naissance</th>
                <th>Pièce</th>
                <th>Numéro de pièce</th>
                <th>Référence</th>
                <th>{onglet === "bord" ? "Contrôle" : "Embarquement"}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={`${l.passagerId}-${l.numero}`}>
                  <td className="text-right text-gris">{l.numero}</td>
                  {onglet === "bord" && <td>{l.embarqueLe ? heureLocale(l.embarqueLe) : ""}</td>}
                  <td className="font-semibold">{l.nom}</td>
                  <td>{l.prenom}</td>
                  <td>{libelleCategorie(l.categorie)}</td>
                  <td>{l.dateNaissance ? l.dateNaissance.split("-").reverse().join("/") : ""}</td>
                  <td>{l.typePiece ? LIBELLES_PIECES_COURTS[l.typePiece] : ""}</td>
                  <td>{l.numeroPiece ?? ""}</td>
                  <td>{l.reference}</td>
                  <td>
                    {onglet === "bord" ? (
                      l.mode ? LIBELLES_MODE[l.mode] : ""
                    ) : (
                      <span
                        className={cn(
                          "font-semibold",
                          l.statut === "embarque" ? "text-foret-texte" : l.statut === "absent" ? "text-alerte" : "text-gris",
                        )}
                      >
                        {LIBELLES_EMBARQUEMENT[l.statut]}
                        {l.embarqueLe && ` · ${heureLocale(l.embarqueLe)}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        )}
      </Section>
    </>
  )
}
