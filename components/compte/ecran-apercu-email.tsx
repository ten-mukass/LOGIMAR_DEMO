"use client"

import { ChevronLeft, Download, Info, Paperclip } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { formatJourLong, heureLocale, jourLocal } from "@/domain/temps"
import { telecharger } from "@/lib/telecharger"
import { useDonnees } from "@/lib/use-donnees"
import { cleSignatureBillet, repository } from "@/services"
import { documentsDepuisReference } from "@/services/documents/documents"

/** Démo : ce qui aurait été envoyé par e-mail (NotificationService). */
export function EcranApercuEmail({ id }: { id: string }) {
  const router = useRouter()
  const charger = useCallback(async () => {
    const envoi = await repository.getEnvoi(id)
    if (!envoi) return null
    const commande = envoi.commandeId ? await repository.getCommande(envoi.commandeId) : null
    const premiere = commande ? await repository.getReservation(commande.reservationIds[0]) : null
    const documents = premiere?.reference
      ? await documentsDepuisReference(repository, premiere.reference, cleSignatureBillet)
      : null
    return { envoi, documents }
  }, [id])
  const { donnees } = useDonnees(charger)

  async function piece(type: "billet" | "facture", nom: string) {
    if (!donnees?.documents) return
    const pdf = await import("@/services/documents/pdf")
    if (type === "billet") telecharger(await pdf.billetPdf(donnees.documents.billets), nom)
    else if (donnees.documents.facture) telecharger(await pdf.facturePdf(donnees.documents.facture), nom)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 md:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-3 inline-flex min-h-12 items-center gap-1 font-semibold text-action"
      >
        <ChevronLeft aria-hidden className="size-5" /> Retour
      </button>
      <h1 className="text-[22px] font-bold text-marine">Aperçu de l’e-mail</h1>
      <p className="mt-2 flex gap-2 rounded-carte border border-soleil-bordure bg-soleil-pale p-3.5 text-sm text-marine">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        Démonstration : aucun e-mail n’a été envoyé. Voici le message que le client recevrait.
      </p>
      {donnees === undefined ? (
        <div className="mt-4 h-80 animate-pulse rounded-carte bg-white" />
      ) : donnees === null ? (
        <p className="mt-4 rounded-carte bg-white p-4 text-gris">Message introuvable sur cet appareil.</p>
      ) : (
        <article className="mt-4 overflow-hidden rounded-carte border border-bordure bg-white">
          <dl className="space-y-1 border-b border-bordure p-4 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gris">De</dt>
              <dd>LOGIMAR 241</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gris">À</dt>
              <dd className="font-semibold">{donnees.envoi.destinataire}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gris">Date</dt>
              <dd>
                {formatJourLong(jourLocal(donnees.envoi.creeLe), true)}, {heureLocale(donnees.envoi.creeLe)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-gris">Objet</dt>
              <dd className="font-bold text-marine">{donnees.envoi.objet}</dd>
            </div>
          </dl>
          <pre className="whitespace-pre-wrap p-4 font-sans text-[15px] leading-relaxed">{donnees.envoi.texte}</pre>
          {donnees.envoi.pieces.length > 0 && (
            <ul className="space-y-2 border-t border-bordure p-4">
              {donnees.envoi.pieces.map((p) => (
                <li key={p.nom}>
                  <button
                    type="button"
                    onClick={() => piece(p.type, p.nom)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-champ border border-bordure-champ px-3.5 font-semibold text-action hover:bg-bleu-pale"
                  >
                    <Paperclip aria-hidden className="size-4" /> {p.nom} <Download aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </main>
  )
}
