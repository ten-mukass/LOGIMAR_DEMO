"use client"

import { CheckCircle2, Download, MapPin, Mail, Share2, Ticket } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Logo } from "@/components/site/logo"
import { Segmente } from "@/components/ui/segmente"
import { classesBouton } from "@/components/ui/bouton"
import { formatFCFA } from "@/domain/format"
import { telecharger } from "@/lib/telecharger"
import { useDonnees } from "@/lib/use-donnees"
import { cn } from "@/lib/utils"
import { auth, billets, cleSignatureBillet, repository } from "@/services"
import { documentsDepuisReference } from "@/services/documents/documents"
import type { DonneesBilletPdf } from "@/services/documents/pdf"
import { CarteCompte } from "./carte-compte"
import { CodeQr } from "./code-qr"

export function EcranBillet({ reference }: { reference: string }) {
  const nouveau = useSearchParams().get("nouveau") === "1"
  const charger = useCallback(async () => {
    if (!(await billets.autorise(reference))) return { autorise: false as const }
    const documents = await documentsDepuisReference(repository, reference, cleSignatureBillet)
    if (!documents || documents.billets.length === 0) return null
    const envois = documents.commande ? await repository.listerEnvois({ commandeId: documents.commande.id }) : []
    const session = await auth.session()
    return { autorise: true as const, documents, envoi: envois.at(-1) ?? null, connecte: session !== null }
  }, [reference])
  const { donnees } = useDonnees(charger)
  const [indexChoisi, setIndexChoisi] = useState<number | null>(null)

  if (donnees === undefined) {
    return (
      <main className="min-h-dvh bg-marine px-4 py-6">
        <div className="mx-auto h-[560px] max-w-md animate-pulse rounded-billet bg-marine-2" />
      </main>
    )
  }
  if (donnees === null || !donnees.autorise) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
        <p role="alert" className="rounded-carte border border-bordure bg-white p-4 text-encre">
          {donnees === null
            ? "Billet introuvable. Vérifiez la référence."
            : "Pour afficher ce billet sur cet appareil, saisissez sa référence et le téléphone ou l’e-mail de la réservation."}
        </p>
        <Link href={`/mes-billets?ref=${encodeURIComponent(reference)}`} className={classesBouton({ pleineLargeur: true })}>
          Retrouver mon billet
        </Link>
      </main>
    )
  }

  const { documents, envoi, connecte } = donnees
  const { commande, reservations } = documents
  const indexReference = Math.max(0, documents.billets.findIndex((b) => b.reference === reference))
  const index = indexChoisi ?? indexReference
  const billet = documents.billets[index]
  const total = commande?.total ?? reservations.reduce((s, r) => s + r.total, 0)
  const identifiantCompte = commande?.email ?? commande?.telephone ?? null

  async function telechargerBillets() {
    const { billetPdf } = await import("@/services/documents/pdf")
    telecharger(await billetPdf(documents.billets), `billet-${documents.billets[0].reference}.pdf`)
  }

  async function telechargerFacture() {
    if (!documents.facture) return
    const { facturePdf } = await import("@/services/documents/pdf")
    telecharger(await facturePdf(documents.facture), `facture-${documents.facture.numero}.pdf`)
  }

  const texteWhatsApp = documents.billets
    .map((b) => `${b.sens ? `${b.sens} : ` : ""}${b.reference}, ${b.depart.nom} → ${b.arrivee.nom}, ${b.date.toLowerCase()}, départ ${b.heureDepart} (enregistrement dès ${b.enregistrement})`)
    .join("\n")

  return (
    <main className="min-h-dvh bg-marine px-4 pb-10 pt-5 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-3">
          {nouveau ? (
            <CheckCircle2 aria-hidden className="size-11 shrink-0 rounded-full bg-foret-texte p-2" />
          ) : (
            <Ticket aria-hidden className="size-11 shrink-0 rounded-full bg-marine-2 p-2.5" />
          )}
          <div>
            <h1 className="text-[22px] font-bold">
              {nouveau ? "Paiement confirmé" : documents.billets.length > 1 ? "Vos billets" : "Votre billet"}
            </h1>
            <p className="text-sm text-white/85">Notez votre référence : elle suffit pour retrouver ce billet.</p>
          </div>
        </div>

        {documents.billets.length > 1 && (
          <Segmente
            sombre
            libelle="Trajet"
            valeur={String(index)}
            onChange={(v) => setIndexChoisi(Number(v))}
            options={documents.billets.map((b, i) => ({ valeur: String(i), libelle: `${b.sens} · ${b.reference}` }))}
          />
        )}

        <CarteBillet billet={billet} />

        <p className="text-center text-sm text-white/85">
          Payé {formatFCFA(total)}
          {commande?.numeroFacture && ` · facture ${commande.numeroFacture}`}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={telechargerBillets} className={classesBouton({ variante: "contour", className: "border-white" })}>
            <Download aria-hidden className="size-5" /> Billet PDF
          </button>
          <button
            type="button"
            onClick={telechargerFacture}
            disabled={!documents.facture}
            title={documents.facture ? undefined : "Pas de facture en ligne pour un billet vendu en agence"}
            className={classesBouton({ variante: "contour", className: "border-white" })}
          >
            <Download aria-hidden className="size-5" /> Facture PDF
          </button>
        </div>

        {envoi && (
          <p className="flex gap-2.5 rounded-carte bg-marine-2 px-4 py-3 text-sm">
            <Mail aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Billet et facture envoyés à <strong>{envoi.destinataire}</strong>.{" "}
              <Link href={`/apercu-email/${envoi.id}`} className="font-semibold underline">
                Voir l’aperçu de l’e-mail
              </Link>
            </span>
          </p>
        )}

        {nouveau && commande && !commande.clientId && !connecte && identifiantCompte && (
          <CarteCompte commandeId={commande.id} identifiant={identifiantCompte} />
        )}

        <div className="grid gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Billet LOGIMAR 241\n${texteWhatsApp}`)}`}
            target="_blank"
            rel="noreferrer"
            className={classesBouton({ variante: "surMarine", pleineLargeur: true })}
          >
            <Share2 aria-hidden className="size-5" /> Partager par WhatsApp
          </a>
          {billet.lienItineraire && (
            <a
              href={billet.lienItineraire}
              target="_blank"
              rel="noreferrer"
              className={classesBouton({ variante: "surMarine", pleineLargeur: true })}
            >
              <MapPin aria-hidden className="size-5" /> Itinéraire vers le terminal
            </a>
          )}
          <Link href="/mes-billets" className={classesBouton({ variante: "surMarine", pleineLargeur: true })}>
            Mes billets
          </Link>
          <Link href="/" className="py-2 text-center font-semibold text-white underline">
            Réserver une autre traversée
          </Link>
        </div>
      </div>
    </main>
  )
}

function CarteBillet({ billet }: { billet: DonneesBilletPdf }) {
  return (
    <article aria-label={`Billet ${billet.reference}`} className="overflow-hidden rounded-billet bg-white text-encre">
      <div className="flex items-center justify-between gap-3 bg-bleu-pale px-4 py-3">
        <span className="flex items-center gap-2.5">
          <Logo taille={40} />
          <span className="font-bold">{billet.navire}</span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] font-semibold uppercase text-gris">
            {billet.sens ? `${billet.sens} · ` : ""}Référence
          </span>
          <span className="font-titre text-[20px] font-extrabold tracking-wide text-marine">{billet.reference}</span>
        </span>
      </div>

      <div className="px-4 pb-4 pt-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-titre text-[30px] font-extrabold text-marine">{billet.depart.code}</p>
            <p className="text-sm text-gris">{billet.depart.nom}</p>
          </div>
          <span aria-hidden className="mb-5 h-0.5 flex-1 bg-ocean" />
          <div className="text-right">
            <p className="font-titre text-[30px] font-extrabold text-marine">{billet.arrivee.code}</p>
            <p className="text-sm text-gris">{billet.arrivee.nom}</p>
          </div>
        </div>
        <dl className="mt-3 flex justify-between gap-3">
          {[
            ["Date", billet.dateCourte],
            ["Départ", billet.heureDepart],
            ["Arrivée", billet.heureArrivee],
          ].map(([libelle, valeur]) => (
            <div key={libelle}>
              <dt className="text-[11px] font-semibold uppercase text-gris">{libelle}</dt>
              <dd className="whitespace-nowrap font-titre text-[17px] font-bold tabular-nums">{valeur}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-champ bg-soleil px-3.5 py-3 text-marine">
          <p className="font-titre text-[17px] font-bold">Enregistrement dès {billet.enregistrement}</p>
          <p className="text-sm">{billet.regleEnregistrement}</p>
          {billet.terminal && <p className="text-sm">Terminal : {billet.terminal}.</p>}
        </div>
      </div>

      <div aria-hidden className="relative h-6">
        <span className="absolute -left-3 top-0 size-6 rounded-full bg-marine" />
        <span className="absolute inset-x-5 top-3 border-t-2 border-dashed border-bordure" />
        <span className="absolute -right-3 top-0 size-6 rounded-full bg-marine" />
      </div>

      <div className="px-4 pb-5">
        <div className="flex justify-center">
          <CodeQr contenu={billet.qr} libelle={`QR code du billet ${billet.reference}`} taille={190} />
        </div>
        <p className="mt-2 text-center text-sm text-gris">À présenter avec une pièce d’identité pour chaque passager.</p>
        <ul className="mt-4 divide-y divide-bordure border-t border-bordure">
          {billet.passagers.map((p) => (
            <li key={p.nom + p.detail} className="flex justify-between gap-3 py-2 text-[15px]">
              <span className="font-semibold">{p.nom}</span>
              <span className={cn("text-gris")}>{p.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gris">Tarif {billet.tarif}</p>
      </div>
    </article>
  )
}
