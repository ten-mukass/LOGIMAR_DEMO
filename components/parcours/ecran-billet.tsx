"use client"

import { CheckCircle2, Ticket } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Logo } from "@/components/site/logo"
import { classesBouton } from "@/components/ui/bouton"
import { formatFCFA } from "@/domain/format"
import { lignesOptions } from "@/domain/montants"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, heureLocale } from "@/domain/temps"
import { useDonnees } from "@/lib/use-donnees"
import { cleSignatureBillet, repository, type Referentiel } from "@/services"
import { contenuQrBillet } from "@/services/documents/signature-billet"
import { CodeQr } from "./code-qr"

const STATUTS_BILLET = ["emise", "embarquee", "absente"]

export function EcranBillet({ reference, referentiel }: { reference: string; referentiel: Referentiel }) {
  const { ports, lignes, navires, terminaux, familles, options, textes } = referentiel
  const nouveau = useSearchParams().get("nouveau") === "1"
  const charger = useCallback(async () => {
    const reservation = await repository.trouverReservationParReference(reference)
    if (!reservation || !STATUTS_BILLET.includes(reservation.statut)) return null
    const traversee = await repository.getTraversee(reservation.traverseeId)
    if (!traversee) return null
    const qr = await contenuQrBillet(reservation.reference, traversee.id, cleSignatureBillet)
    return { reservation, traversee, qr }
  }, [reference])
  const { donnees } = useDonnees(charger)

  if (donnees === undefined) {
    return (
      <main className="min-h-dvh bg-marine px-4 py-6">
        <div className="mx-auto h-[560px] max-w-md animate-pulse rounded-billet bg-marine-2" />
      </main>
    )
  }
  if (donnees === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
        <p role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">
          Billet introuvable. Vérifiez la référence.
        </p>
        <Link href="/" className={classesBouton({ pleineLargeur: true })}>
          Retour à l’accueil
        </Link>
      </main>
    )
  }

  const { reservation, traversee, qr } = donnees
  const ligne = lignes.find((l) => l.id === traversee.ligneId)
  const depart = ports.find((p) => p.id === ligne?.portDepartId)
  const arrivee = ports.find((p) => p.id === ligne?.portArriveeId)
  const navire = navires.find((n) => n.id === traversee.navireId)
  const terminal = terminaux.find((t) => t.id === traversee.terminalDepartId)
  const famille = familles.find((f) => f.code === reservation.familleCode)
  const optionsChoisies = lignesOptions(reservation.options, options)

  return (
    <main className="min-h-dvh bg-marine px-4 pb-10 pt-5 text-white">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          {nouveau ? (
            <CheckCircle2 aria-hidden className="size-11 shrink-0 rounded-full bg-foret-texte p-2" />
          ) : (
            <Ticket aria-hidden className="size-11 shrink-0 rounded-full bg-marine-2 p-2.5" />
          )}
          <div>
            <h1 className="text-[22px] font-bold">{nouveau ? "Paiement confirmé" : "Votre billet"}</h1>
            <p className="text-sm text-white/85">Notez votre référence : elle suffit pour retrouver ce billet.</p>
          </div>
        </div>

        <article
          aria-label={`Billet ${reservation.reference}`}
          className="mt-5 overflow-hidden rounded-billet bg-white text-encre"
        >
          <div className="flex items-center justify-between gap-3 bg-bleu-pale px-4 py-3">
            <span className="flex items-center gap-2.5">
              <Logo taille={40} />
              <span className="font-bold">{navire?.nom}</span>
            </span>
            <span className="text-right">
              <span className="block text-[11px] font-semibold uppercase text-gris">Référence</span>
              <span className="font-titre text-[20px] font-extrabold tracking-wide text-marine">
                {reservation.reference}
              </span>
            </span>
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-titre text-[30px] font-extrabold text-marine">{depart?.code}</p>
                <p className="text-sm text-gris">{depart?.nom}</p>
              </div>
              <span aria-hidden className="mb-5 h-0.5 flex-1 bg-ocean" />
              <div className="text-right">
                <p className="font-titre text-[30px] font-extrabold text-marine">{arrivee?.code}</p>
                <p className="text-sm text-gris">{arrivee?.nom}</p>
              </div>
            </div>
            <dl className="mt-3 flex justify-between gap-3">
              {[
                ["Date", formatJourCourt(jourDeDepart(traversee))],
                ["Départ", heureLocale(traversee.departAt)],
                ["Arrivée", heureLocale(traversee.arriveeAt)],
              ].map(([libelle, valeur]) => (
                <div key={libelle}>
                  <dt className="text-[11px] font-semibold uppercase text-gris">{libelle}</dt>
                  <dd className="whitespace-nowrap font-titre text-[17px] font-bold tabular-nums">{valeur}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-champ bg-soleil px-3.5 py-3 text-marine">
              <p className="font-titre text-[17px] font-bold">
                Enregistrement dès {heureLocale(traversee.enregistrementOuvertureAt)}
              </p>
              <p className="text-sm">{textes.regleEnregistrement}</p>
              {terminal && <p className="text-sm">Terminal : {terminal.nom}.</p>}
            </div>
          </div>

          <div aria-hidden className="relative h-6">
            <span className="absolute -left-3 top-0 size-6 rounded-full bg-marine" />
            <span className="absolute inset-x-5 top-3 border-t-2 border-dashed border-bordure" />
            <span className="absolute -right-3 top-0 size-6 rounded-full bg-marine" />
          </div>

          <div className="px-4 pb-5">
            <div className="flex justify-center">
              <CodeQr contenu={qr} libelle={`QR code du billet ${reservation.reference}`} taille={190} />
            </div>
            <p className="mt-2 text-center text-sm text-gris">
              À présenter avec une pièce d’identité pour chaque passager.
            </p>
            <ul className="mt-4 divide-y divide-bordure border-t border-bordure">
              {reservation.passagers.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2 text-[15px]">
                  <span className="font-semibold">
                    {p.nom} {p.prenom}
                  </span>
                  <span className="text-gris">
                    {libelleCategorie(p.categorie).replace(/^./, (c) => c.toUpperCase())}
                    {p.typePiece && ` · ${LIBELLES_PIECES_COURTS[p.typePiece]}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gris">
              Tarif {famille?.nom}
              {optionsChoisies.length > 0 && ` · ${optionsChoisies.map((o) => o.libelle.toLowerCase()).join(", ")}`} ·
              payé {formatFCFA(reservation.total)}
            </p>
          </div>
        </article>

        <Link href="/" className={classesBouton({ variante: "surMarine", pleineLargeur: true, className: "mt-5" })}>
          Réserver une autre traversée
        </Link>
      </div>
    </main>
  )
}
