"use client"

import { UserRound } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Bouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { jourDeDepart } from "@/domain/programme"
import { formatMoisCourt, heureLocale } from "@/domain/temps"
import type { Reservation, Traversee } from "@/domain/types"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { auth, billets, repository, type Referentiel } from "@/services"

export interface BilletListe {
  reservation: Reservation
  traversee: Traversee
}

/** Billets consultables sur l'appareil, avec leur traversée, triés par date de départ. */
export async function chargerBilletsListe(reservations: Reservation[]): Promise<BilletListe[]> {
  const liste: BilletListe[] = []
  for (const reservation of reservations) {
    const traversee = await repository.getTraversee(reservation.traverseeId)
    if (traversee) liste.push({ reservation, traversee })
  }
  return liste.sort((a, b) => Date.parse(a.traversee.departAt) - Date.parse(b.traversee.departAt))
}

export function EcranMesBillets({ referentiel }: { referentiel: Referentiel }) {
  const router = useRouter()
  const maintenant = useMaintenant()
  const params = useSearchParams()
  const [reference, setReference] = useState(params.get("ref") ?? "")
  const [contact, setContact] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const charger = useCallback(async () => {
    if (!maintenant) return null
    const [liste, session, exemple] = await Promise.all([
      billets.consultables().then(chargerBilletsListe),
      auth.session(),
      repository.exempleBillet ? repository.exempleBillet(maintenant) : Promise.resolve(null),
    ])
    return { liste, connecte: session !== null && !session.verificationRequise, exemple }
  }, [maintenant])
  const { donnees } = useDonnees(maintenant ? charger : null)

  async function rechercher(e: React.FormEvent) {
    e.preventDefault()
    if (!reference.trim() || !contact.trim()) {
      setErreur("Renseignez la référence et le téléphone ou l’e-mail de la réservation.")
      return
    }
    setEnCours(true)
    const r = await billets.rechercher(reference, contact)
    setEnCours(false)
    if (!r.ok) return setErreur(r.message)
    setErreur(null)
    router.push(`/billet/${r.valeur}`)
  }

  const aVenir = donnees?.liste.filter((b) => maintenant && Date.parse(b.traversee.arriveeAt) > maintenant.getTime()) ?? []
  const passes = donnees?.liste.filter((b) => maintenant && Date.parse(b.traversee.arriveeAt) <= maintenant.getTime()) ?? []

  return (
    <main>
      <div className="bg-marine px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold md:text-[30px]">Mes billets</h1>
            <p className="mt-1 text-[15px] text-white/85">
              Sans compte : la référence et votre téléphone ou e-mail suffisent.
            </p>
          </div>
          <Link
            href="/compte"
            className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-champ bg-marine-2 px-3 text-sm font-semibold"
          >
            <UserRound aria-hidden className="size-5" />
            {donnees?.connecte ? "Mon compte" : "Se connecter"}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8">
        <form onSubmit={rechercher} aria-label="Retrouver un billet" className="space-y-3 rounded-carte border border-bordure bg-white p-4">
          <Champ id="reference" libelle="Référence du billet">
            <input
              {...ariaChamp("reference", erreur ?? undefined)}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Ex. LGM-7K4Q2"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={classesChamp}
            />
          </Champ>
          <Champ id="contact" libelle="Téléphone ou e-mail utilisé à la réservation">
            <input
              {...ariaChamp("contact", erreur ?? undefined)}
              autoComplete="email"
              placeholder="+241 … ou nom@exemple.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className={classesChamp}
            />
          </Champ>
          {erreur && (
            <p role="alert" className="text-[13px] font-semibold text-alerte">
              {erreur}
            </p>
          )}
          <Bouton type="submit" taille="grand" pleineLargeur disabled={enCours}>
            Afficher mon billet
          </Bouton>
          <p className="text-[13px] text-gris">
            E-mail non reçu ? Vérifiez le dossier spam, ou affichez le billet ici.
          </p>
          {donnees?.exemple && referentiel.paiementSimule && (
            <p className="rounded-champ bg-ecume px-3 py-2.5 text-[13px] text-gris">
              Démonstration : essayez la référence <strong className="text-encre">{donnees.exemple.reference}</strong> avec
              le <strong className="text-encre">{donnees.exemple.contact}</strong> (billet d’exemple vendu en agence).{" "}
              <button
                type="button"
                className="font-semibold text-action underline"
                onClick={() => {
                  setReference(donnees.exemple?.reference ?? "")
                  setContact(donnees.exemple?.contact ?? "")
                }}
              >
                Remplir
              </button>
            </p>
          )}
        </form>

        <section aria-labelledby="titre-appareil">
          <h2 id="titre-appareil" className="mb-3 text-[19px] font-bold text-marine">
            Sur ce téléphone
          </h2>
          {!donnees ? (
            <div className="h-20 animate-pulse rounded-carte bg-white" />
          ) : aVenir.length === 0 ? (
            <p className="rounded-carte border border-bordure bg-white p-4 text-gris">
              Aucun billet à venir sur cet appareil.{" "}
              <Link href="/" className="font-semibold text-action underline">
                Réserver une traversée
              </Link>
            </p>
          ) : (
            <ListeBillets billets={aVenir} referentiel={referentiel} />
          )}
          {passes.length > 0 && (
            <>
              <h3 className="mb-3 mt-5 font-sans text-[16px] font-bold text-gris">Voyages passés</h3>
              <ListeBillets billets={passes} referentiel={referentiel} passe />
            </>
          )}
          <p className="mt-3 px-1 text-[13px] text-gris">
            Les billets réservés ou retrouvés ici restent enregistrés dans ce navigateur.
          </p>
        </section>
      </div>
    </main>
  )
}

export function ListeBillets({
  billets: liste,
  referentiel,
  passe = false,
}: {
  billets: BilletListe[]
  referentiel: Referentiel
  passe?: boolean
}) {
  const { lignes, ports } = referentiel
  return (
    <ul className="space-y-3">
      {liste.map(({ reservation, traversee }) => {
        const ligne = lignes.find((l) => l.id === traversee.ligneId)
        const depart = ports.find((p) => p.id === ligne?.portDepartId)
        const arrivee = ports.find((p) => p.id === ligne?.portArriveeId)
        const jour = jourDeDepart(traversee)
        const n = reservation.passagers.length
        return (
          <li key={reservation.id}>
            <Link
              href={`/billet/${reservation.reference}`}
              className="flex items-center gap-3 rounded-carte border border-bordure bg-white p-3.5 hover:border-action"
            >
              <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-champ bg-bleu-pale text-marine">
                <span className="text-[11px] font-bold uppercase">{formatMoisCourt(jour)}</span>
                <span className="font-titre text-[20px] font-bold leading-none">{Number(jour.slice(8))}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-encre">
                  {depart?.nom} → {arrivee?.nom}
                </span>
                <span className="block text-sm text-gris">
                  {heureLocale(traversee.departAt)} · {n} passager{n > 1 ? "s" : ""} · {reservation.reference}
                </span>
              </span>
              <Badge ton={passe ? "info" : "succes"}>{passe ? "Passé" : "Confirmé"}</Badge>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
