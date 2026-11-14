"use client"

import { ChevronDown, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Fragment, useMemo, useState } from "react"
import { Bouton } from "@/components/ui/bouton"
import { formatFCFA, formatMontant } from "@/domain/format"
import { statutAffiche } from "@/domain/indicateurs"
import { filtrerReservations, type FiltreReservations } from "@/domain/manifeste"
import { compositionDe } from "@/domain/occupation"
import { LIBELLES_PIECES_COURTS, libelleCategorie, resumeComposition } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, formatMoisCourt, heureLocale, jourLocal, NOMS_MOIS } from "@/domain/temps"
import type { Canal, Reservation, StatutReservation } from "@/domain/types"
import { useEtatVentes } from "@/lib/use-etat-ventes"
import { cn } from "@/lib/utils"
import { BadgeStatut, Chargement, classesSelect, EnTetePage, Section, Tableau } from "./elements"
import { LIBELLES_CANAL, LIBELLES_MOYEN_COURTS, LIBELLES_STATUT, nomLigne } from "./libelles"

const PAR_PAGE = 50

/** « 20 nov. » */
function jourCourt(jour: string): string {
  return `${Number(jour.slice(8, 10))} ${formatMoisCourt(jour)}`
}
const STATUTS: StatutReservation[] = ["emise", "payee", "bloquee", "expiree", "annulee", "embarquee", "absente", "remboursee"]
const CANAUX: Canal[] = ["web", "agence", "telephone"]

export function ListeReservations() {
  const { etat } = useEtatVentes()
  const params = useSearchParams()
  const router = useRouter()
  const traverseeId = params.get("traversee")
  const [texte, setTexte] = useState("")
  const [statut, setStatut] = useState<StatutReservation | null>(null)
  const [canal, setCanal] = useState<Canal | null>(null)
  const [origine, setOrigine] = useState<"toutes" | "navigateur">("toutes")
  const [page, setPage] = useState(0)
  const [ouverte, setOuverte] = useState<string | null>(null)

  const filtre: FiltreReservations = { texte, traverseeId, statut, canal }
  const resultats = useMemo(() => {
    if (!etat) return []
    const base = origine === "navigateur" ? etat.reservations.filter((r) => etat.locales.has(r.id)) : etat.reservations
    return filtrerReservations(base, { texte, traverseeId, statut, canal }, etat.maintenant)
  }, [etat, texte, traverseeId, statut, canal, origine])

  if (!etat) return <Chargement />
  const { referentiel, maintenant } = etat
  const traversees = new Map(etat.traversees.map((t) => [t.id, t]))
  const nomFamille = (code: string) => referentiel.familles.find((f) => f.code === code)?.nom ?? code
  const pages = Math.max(1, Math.ceil(resultats.length / PAR_PAGE))
  const pageCourante = Math.min(page, pages - 1)
  const visibles = resultats.slice(pageCourante * PAR_PAGE, (pageCourante + 1) * PAR_PAGE)
  const libelleTraversee = (id: string, court = true) => {
    const t = traversees.get(id)
    if (!t) return id
    const jour = court ? jourCourt(jourDeDepart(t)) : formatJourCourt(jourDeDepart(t))
    return `${nomLigne(t.ligneId, referentiel.lignes, referentiel.ports, court)} · ${jour} · ${heureLocale(t.departAt)}`
  }
  const changer = (action: () => void) => {
    action()
    setPage(0)
    setOuverte(null)
  }
  const moisTraversees = [...new Set(etat.traversees.map((t) => jourDeDepart(t).slice(0, 7)))]

  return (
    <>
      <EnTetePage
        titre="Réservations"
        sousTitre={`${formatMontant(resultats.length)} réservation${resultats.length > 1 ? "s" : ""}${filtre.traverseeId ? ` · ${libelleTraversee(filtre.traverseeId, false)}` : ""} · ventes d’exemple et réservations faites sur ce navigateur`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
          <label htmlFor="recherche-reservation" className="sr-only">
            Rechercher
          </label>
          <input
            id="recherche-reservation"
            type="search"
            value={texte}
            onChange={(e) => changer(() => setTexte(e.target.value))}
            placeholder="Référence, nom, téléphone ou e-mail"
            className={cn(classesSelect, "w-full pl-9")}
          />
        </div>
        <label htmlFor="filtre-traversee" className="sr-only">
          Traversée
        </label>
        <select
          id="filtre-traversee"
          className={cn(classesSelect, "max-w-72")}
          value={traverseeId ?? ""}
          onChange={(e) =>
            changer(() => router.replace(e.target.value ? `/admin/reservations?traversee=${e.target.value}` : "/admin/reservations"))
          }
        >
          <option value="">Toutes les traversées</option>
          {moisTraversees.map((m) => {
            const [a, n] = m.split("-").map(Number)
            return (
              <optgroup key={m} label={`${NOMS_MOIS[n - 1]} ${a}`}>
                {etat.traversees
                  .filter((t) => jourDeDepart(t).startsWith(m))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {libelleTraversee(t.id)}
                    </option>
                  ))}
              </optgroup>
            )
          })}
        </select>
        <label htmlFor="filtre-statut" className="sr-only">
          Statut
        </label>
        <select
          id="filtre-statut"
          className={classesSelect}
          value={statut ?? ""}
          onChange={(e) => changer(() => setStatut((e.target.value || null) as StatutReservation | null))}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {LIBELLES_STATUT[s]}
            </option>
          ))}
        </select>
        <label htmlFor="filtre-canal" className="sr-only">
          Canal
        </label>
        <select
          id="filtre-canal"
          className={classesSelect}
          value={canal ?? ""}
          onChange={(e) => changer(() => setCanal((e.target.value || null) as Canal | null))}
        >
          <option value="">Tous les canaux</option>
          {CANAUX.map((c) => (
            <option key={c} value={c}>
              {LIBELLES_CANAL[c]}
            </option>
          ))}
        </select>
        <label htmlFor="filtre-origine" className="sr-only">
          Origine
        </label>
        <select
          id="filtre-origine"
          className={classesSelect}
          value={origine}
          onChange={(e) => changer(() => setOrigine(e.target.value as "toutes" | "navigateur"))}
        >
          <option value="toutes">Toutes origines</option>
          <option value="navigateur">Faites sur ce navigateur</option>
        </select>
      </div>

      <Section titre="Liste">
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-gris">Aucune réservation ne correspond.</p>
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Détail</span>
                </th>
                <th>Créée le</th>
                <th>Référence</th>
                <th>Traversée</th>
                <th>Titulaire</th>
                <th>Passagers</th>
                <th>Tarif</th>
                <th className="text-right">Montant</th>
                <th>Canal · paiement</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => {
                const detail = ouverte === r.id
                const titulaire = r.passagers[0]
                return (
                  <Fragment key={r.id}>
                    <tr className={cn("hover:bg-bleu-pale/60", detail && "bg-bleu-pale/60")}>
                      <td className="w-8">
                        <button
                          type="button"
                          aria-expanded={detail}
                          aria-label={`Détail de la réservation ${r.reference || r.id}`}
                          onClick={() => setOuverte(detail ? null : r.id)}
                          className="inline-flex size-8 items-center justify-center rounded-champ text-action hover:bg-bleu-pale"
                        >
                          {detail ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
                        </button>
                      </td>
                      <td className="whitespace-nowrap">
                        {jourCourt(jourLocal(r.creeLe))} · {heureLocale(r.creeLe)}
                        {etat.locales.has(r.id) && (
                          <span className="mt-0.5 block w-fit rounded-full bg-soleil px-2 py-0.5 text-[11px] font-semibold text-marine">
                            Ce navigateur
                          </span>
                        )}
                      </td>
                      <td className="font-semibold whitespace-nowrap">{r.reference || "—"}</td>
                      <td className="whitespace-nowrap">
                        <Link href={`/admin/traversees/${r.traverseeId}`} className="text-action hover:underline">
                          {libelleTraversee(r.traverseeId)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{titulaire ? `${titulaire.prenom} ${titulaire.nom}` : "—"}</td>
                      <td className="whitespace-nowrap">{resumeComposition(compositionDe(r.passagers))}</td>
                      <td className="whitespace-nowrap">
                        {nomFamille(r.familleCode)} <span className="text-gris">P{r.classeId.split("-").at(-1)}</span>
                      </td>
                      <td className="text-right whitespace-nowrap">{formatFCFA(r.total, true)}</td>
                      <td className="whitespace-nowrap">
                        {LIBELLES_CANAL[r.canal]}
                        {r.moyenPaiement && <span className="text-gris"> · {LIBELLES_MOYEN_COURTS[r.moyenPaiement]}</span>}
                      </td>
                      <td>
                        <BadgeStatut statut={statutAffiche(r, maintenant)} />
                      </td>
                    </tr>
                    {detail && (
                      <tr>
                        <td />
                        <td colSpan={9} className="bg-ecume">
                          <DetailReservation reservation={r} libelleOption={(code) => referentiel.options.find((o) => o.code === code)?.libelle ?? code} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </Tableau>
        )}
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between gap-3 text-[14px]">
            <Bouton variante="contour" taille="compact" disabled={pageCourante === 0} onClick={() => setPage(pageCourante - 1)}>
              Précédentes
            </Bouton>
            <span className="text-gris">
              Page {pageCourante + 1} sur {pages}
            </span>
            <Bouton variante="contour" taille="compact" disabled={pageCourante >= pages - 1} onClick={() => setPage(pageCourante + 1)}>
              Suivantes
            </Bouton>
          </div>
        )}
      </Section>
    </>
  )
}

function DetailReservation({ reservation: r, libelleOption }: { reservation: Reservation; libelleOption: (code: string) => string }) {
  return (
    <div className="sticky left-0 grid w-[calc(100vw-7rem)] max-w-4xl gap-4 py-2 md:grid-cols-3">
      <div className="md:col-span-2">
        <h3 className="mb-1 text-[13px] font-bold text-marine">Passagers</h3>
        <ul className="space-y-0.5">
          {r.passagers.map((p) => (
            <li key={p.id}>
              {p.prenom} {p.nom} · {libelleCategorie(p.categorie)}
              {p.dateNaissance && ` · né(e) le ${p.dateNaissance.split("-").reverse().join("/")}`}
              {p.typePiece && ` · ${LIBELLES_PIECES_COURTS[p.typePiece]} ${p.numeroPiece ?? ""}`}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-[13px] font-bold text-marine">Contact et prix</h3>
        <p>{r.telephone ?? "Pas de téléphone"}</p>
        <p>{r.email ?? "Pas d’e-mail"}</p>
        <p className="mt-1 text-gris">
          Prix figés : adulte {formatFCFA(r.prixUnitaires.adulte, true)} · enfant {formatFCFA(r.prixUnitaires.enfant, true)} ·
          bébé {formatFCFA(r.prixUnitaires.bebe, true)}
        </p>
        {r.options.length > 0 && (
          <p className="text-gris">Options : {r.options.map((o) => `${libelleOption(o.code)} × ${o.quantite}`).join(", ")}</p>
        )}
      </div>
    </div>
  )
}
