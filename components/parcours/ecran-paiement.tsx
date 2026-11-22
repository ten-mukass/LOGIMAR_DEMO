"use client"

import { Loader2, Lock, Minus, Plus, Timer } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { estTelephoneValide } from "@/domain/contact"
import { formatFCFA } from "@/domain/format"
import { lignesOptions, lignesPassagers, optionsProposees, totalLignes } from "@/domain/montants"
import { compositionDe } from "@/domain/occupation"
import { jourDeDepart } from "@/domain/programme"
import { versParametres } from "@/domain/recherche"
import { formatJourCourt } from "@/domain/temps"
import type { CodePort, LigneOption, Traversee } from "@/domain/types"
import { useDonnees } from "@/lib/use-donnees"
import { useSecondesRestantes } from "@/lib/use-secondes-restantes"
import { cn } from "@/lib/utils"
import { repository, serviceReservation, type CommandeDetaillee, type Referentiel } from "@/services"
import { BarreBasse } from "./barre-basse"
import { EnTeteParcours } from "./en-tete-parcours"

type Etat = { etape: "saisie" } | { etape: "attente"; paiementId: string } | { etape: "refuse"; message: string }

function formatCompteur(secondes: number): string {
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, "0")}`
}

export function EcranPaiement({ id, referentiel }: { id: string; referentiel: Referentiel }) {
  const router = useRouter()
  const charger = useCallback(async () => {
    const detail = await serviceReservation.lireCommande(id)
    if (!detail) return null
    const traversees: Traversee[] = []
    for (const r of detail.reservations) {
      const t = await repository.getTraversee(r.traverseeId)
      if (t) traversees.push(t)
    }
    return traversees.length === detail.reservations.length ? { detail, traversees } : null
  }, [id])
  const { donnees } = useDonnees(charger)
  const payee = donnees?.detail.commande.statut === "payee" ? donnees.detail.reservations[0]?.reference : null

  useEffect(() => {
    if (payee) router.replace(`/billet/${payee}`)
  }, [payee, router])

  if (donnees === undefined) return <div className="mx-auto mt-6 h-96 max-w-3xl animate-pulse rounded-carte bg-white" />
  if (donnees === null) return <Interruption message="Réservation introuvable sur cet appareil." href="/" />
  return <Paiement detail={donnees.detail} traversees={donnees.traversees} referentiel={referentiel} />
}

function Interruption({ message, href, libelle = "Nouvelle recherche" }: { message: string; href: string; libelle?: string }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-8">
      <p role="alert" className="rounded-carte bg-alerte-pale p-4 text-alerte">
        {message}
      </p>
      <Link href={href} className={classesBouton({ pleineLargeur: true })}>
        {libelle}
      </Link>
    </main>
  )
}

function Paiement({
  detail,
  traversees,
  referentiel,
}: {
  detail: CommandeDetaillee
  traversees: Traversee[]
  referentiel: Referentiel
}) {
  const { commande, reservations } = detail
  const reservation = reservations[0]
  const traversee = traversees[0]
  const { options: catalogue, operateurs, familles, lignes, ports, paiementSimule } = referentiel
  const router = useRouter()
  const params = useSearchParams()
  const secondes = useSecondesRestantes(reservation.bloqueeJusquA)
  const [bagages, setBagages] = useState(0)
  const [garantie, setGarantie] = useState(false)
  const [operateur, setOperateur] = useState(operateurs[0]?.code ?? "airtel")
  const [numero, setNumero] = useState(reservation.telephone ?? "")
  const [cgt, setCgt] = useState(false)
  const [tentative, setTentative] = useState(false)
  const [etat, setEtat] = useState<Etat>({ etape: "saisie" })

  // Suivi du paiement : le billet n'est émis qu'après la confirmation de l'opérateur.
  useEffect(() => {
    if (etat.etape !== "attente") return
    const minuterie = window.setInterval(async () => {
      const paiement = await serviceReservation.verifierPaiement(etat.paiementId)
      if (paiement?.statut === "reussi") {
        window.clearInterval(minuterie)
        const emise = await repository.getReservation(reservation.id)
        if (emise?.reference) router.replace(`/billet/${emise.reference}?nouveau=1`)
      } else if (paiement?.statut === "refuse") {
        window.clearInterval(minuterie)
        setEtat({
          etape: "refuse",
          message: "Paiement refusé par l’opérateur. Vérifiez le numéro et le solde, ou choisissez l’autre moyen de paiement.",
        })
      }
    }, 1000)
    return () => window.clearInterval(minuterie)
  }, [etat, reservation.id, router])

  const ligne = lignes.find((l) => l.id === traversee.ligneId)
  const code = (portId: string | undefined) => ports.find((p) => p.id === portId)?.code as CodePort
  const composition = compositionDe(reservation.passagers)
  const retour = reservations[1]
  const traverseeRetour = traversees[1]
  const criteres = {
    depart: code(ligne?.portDepartId),
    arrivee: code(ligne?.portArriveeId),
    date: jourDeDepart(traversee),
    dateRetour: traverseeRetour ? jourDeDepart(traverseeRetour) : null,
    passagers: composition,
  }
  const retourPassagers =
    `/passagers?${versParametres(criteres)}&t=${encodeURIComponent(traversee.id)}&f=${reservation.familleCode}` +
    (retour && traverseeRetour ? `&tr=${encodeURIComponent(traverseeRetour.id)}&fr=${retour.familleCode}` : "")
  const nomFamille = (code: string) => familles.find((f) => f.code === code)?.nom ?? code
  const libelleTarifs = reservations.map((r) => nomFamille(r.familleCode)).join(" + ")

  if (commande.statut !== "en-cours" || secondes === 0) {
    const message =
      commande.statut === "abandonnee"
        ? "Cette réservation a été abandonnée : les places ont été libérées."
        : "Le délai de paiement est dépassé : les places et le tarif ont été libérés. Relancez la recherche pour voir les prix actuels."
    return <Interruption message={message} href={`/resultats?${versParametres(criteres)}`} libelle="Relancer la recherche" />
  }

  // Une option n'est proposée que si elle l'est pour chaque trajet (ex. pas de garantie si l'un est en VIP).
  const proposees = optionsProposees(catalogue, reservation.familleCode).filter((o) =>
    reservations.every((r) => o.familles.includes(r.familleCode)),
  )
  const optionBagage = proposees.find((o) => o.code === "BAGAGE")
  const optionGarantie = proposees.find((o) => o.code === "GARANTIE")
  const choix: LigneOption[] = [
    ...(optionBagage && bagages > 0 ? [{ code: "BAGAGE" as const, quantite: bagages, prixUnitaire: optionBagage.prix }] : []),
    ...(optionGarantie && garantie ? [{ code: "GARANTIE" as const, quantite: 1, prixUnitaire: optionGarantie.prix }] : []),
  ]
  const multi = reservations.length > 1
  const lignesRecap = reservations.flatMap((r, i) => {
    const prefixe = multi ? (i === 0 ? "Aller · " : "Retour · ") : ""
    return [...lignesPassagers(r.prixUnitaires, composition), ...lignesOptions(choix, catalogue)].map((l) => ({
      ...l,
      libelle: prefixe + l.libelle,
    }))
  })
  const total = totalLignes(lignesRecap)
  const numeroValide = estTelephoneValide(numero)
  const nomOperateur = operateurs.find((o) => o.code === operateur)?.nom ?? operateur

  async function abandonner() {
    await serviceReservation.liberer(commande.id)
    router.push(retourPassagers)
  }

  async function payer() {
    setTentative(true)
    if (!cgt || !numeroValide) return
    const resultat = await serviceReservation.payer(commande.id, {
      operateur,
      numero,
      options: { BAGAGE: bagages, GARANTIE: garantie ? 1 : 0 },
    })
    if (!resultat.ok) setEtat({ etape: "refuse", message: resultat.message })
    else setEtat({ etape: "attente", paiementId: resultat.valeur.id })
  }

  const enAttente = etat.etape === "attente"

  return (
    <main>
      <EnTeteParcours
        titre="Options et paiement"
        sousTitre={`${reservation.passagers.length} passager${reservation.passagers.length > 1 ? "s" : ""} · ${criteres.depart} ${multi ? "⇄" : "→"} ${criteres.arrivee} · ${formatJourCourt(criteres.date)}${criteres.dateRetour ? ` → ${formatJourCourt(criteres.dateRetour)}` : ""}`}
        retour={{ onClick: abandonner }}
        etape={2}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:px-8">
        <p
          role="timer"
          aria-live="off"
          className="flex items-center gap-3 rounded-carte border border-soleil-bordure bg-soleil-pale px-4 py-3 text-marine"
        >
          <Timer aria-hidden className="size-6 shrink-0" />
          <span>
            Places et tarif{multi ? "s" : ""} {libelleTarifs} bloqués pendant{" "}
            <strong className="font-titre tabular-nums">{secondes === null ? "…" : formatCompteur(secondes)}</strong>
          </span>
        </p>
        {params.get("prix") === "modifie" && (
          <p className="rounded-carte border border-bordure bg-white px-4 py-3 text-sm text-marine">
            Le prix a été mis à jour depuis l’affichage des résultats (places vendues entre-temps). Il est maintenant
            figé pour vous.
          </p>
        )}

        {(optionBagage || optionGarantie) && (
          <section aria-labelledby="titre-options" className="rounded-carte border border-bordure bg-white p-4">
            <h2 id="titre-options" className="font-sans text-[17px] font-bold text-marine">
              Options
            </h2>
            {optionBagage && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{optionBagage.libelle}</p>
                  <p className="text-sm text-gris">
                    {optionBagage.detail} · {formatFCFA(optionBagage.prix)} l’unité{multi ? " et par trajet" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Retirer un bagage"
                    disabled={bagages === 0 || enAttente}
                    onClick={() => setBagages((n) => n - 1)}
                    className="flex size-12 items-center justify-center rounded-champ border border-bordure-champ text-action disabled:text-bordure-champ"
                  >
                    <Minus aria-hidden className="size-5" />
                  </button>
                  <output aria-live="polite" className="w-6 text-center font-titre text-lg font-bold tabular-nums">
                    {bagages}
                  </output>
                  <button
                    type="button"
                    aria-label="Ajouter un bagage"
                    disabled={bagages >= optionBagage.quantiteMax || enAttente}
                    onClick={() => setBagages((n) => n + 1)}
                    className="flex size-12 items-center justify-center rounded-champ border border-bordure-champ text-action disabled:text-bordure-champ"
                  >
                    <Plus aria-hidden className="size-5" />
                  </button>
                </div>
              </div>
            )}
            {optionGarantie && (
              <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{optionGarantie.libelle}</span>
                  <span className="block text-sm text-gris">
                    {optionGarantie.detail} · {formatFCFA(optionGarantie.prix)}
                    {multi ? " par trajet" : ""}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={garantie}
                  disabled={enAttente}
                  onChange={(e) => setGarantie(e.target.checked)}
                  className="size-6 shrink-0 accent-action"
                />
              </label>
            )}
          </section>
        )}

        <fieldset className="rounded-carte border border-bordure bg-white p-4">
          <legend className="float-left mb-3 w-full font-sans text-[17px] font-bold text-marine">Moyen de paiement</legend>
          <div className="clear-both space-y-3">
            {operateurs.map((o) => {
              const actif = o.code === operateur
              return (
                <div key={o.code} className={cn("rounded-carte border", actif ? "border-2 border-action bg-bleu-pale" : "border-bordure")}>
                  <label className="flex cursor-pointer items-center gap-3 p-3.5">
                    <input
                      type="radio"
                      name="operateur"
                      value={o.code}
                      checked={actif}
                      disabled={enAttente}
                      onChange={() => setOperateur(o.code)}
                      className="size-5 shrink-0 accent-action"
                    />
                    <Image src={o.logo} alt="" width={40} height={40} className="size-10 rounded-lg object-contain" />
                    <span className="font-bold">{o.nom}</span>
                  </label>
                  {actif && (
                    <div className="px-3.5 pb-3.5">
                      <Champ
                        id="numero-mobile"
                        libelle={`Numéro ${o.nom}`}
                        erreur={tentative && !numeroValide ? "Numéro invalide." : undefined}
                        aide="Il peut être différent du numéro de contact."
                      >
                        <input
                          {...ariaChamp(
                            "numero-mobile",
                            tentative && !numeroValide ? "Numéro invalide." : undefined,
                            "Il peut être différent du numéro de contact.",
                          )}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+241 07 12 34 56"
                          value={numero}
                          disabled={enAttente}
                          onChange={(e) => setNumero(e.target.value)}
                          className={classesChamp}
                        />
                      </Champ>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-sm text-gris">
            Après « Payer », validez la demande reçue sur votre téléphone avec votre code secret Mobile Money. Ne le
            communiquez à personne.
          </p>
        </fieldset>

        <section aria-labelledby="titre-recap" className="rounded-carte border border-bordure bg-white p-4">
          <h2 id="titre-recap" className="font-sans text-[17px] font-bold text-marine">
            Récapitulatif
          </h2>
          <dl className="mt-3 space-y-2 text-[15px]">
            {lignesRecap.map((l) => (
              <div key={l.libelle} className="flex justify-between gap-3">
                <dt className="text-gris">{l.libelle}</dt>
                <dd className="tabular-nums">{formatFCFA(l.montant)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 border-t border-bordure pt-3">
              <dt className="font-bold">Total à payer</dt>
              <dd className="font-titre text-[22px] font-bold tabular-nums text-marine">{formatFCFA(total)}</dd>
            </div>
          </dl>
        </section>

        <label className="flex cursor-pointer gap-3 px-1">
          <input
            type="checkbox"
            checked={cgt}
            disabled={enAttente}
            onChange={(e) => setCgt(e.target.checked)}
            aria-invalid={tentative && !cgt ? true : undefined}
            aria-describedby={tentative && !cgt ? "cgt-erreur" : undefined}
            className="mt-0.5 size-6 shrink-0 accent-action"
          />
          <span className="text-[15px]">
            J’accepte les{" "}
            <Link href="/aide#cgt" className="text-action underline">
              conditions générales de transport
            </Link>{" "}
            et la{" "}
            <Link href="/aide#confidentialite" className="text-action underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {tentative && !cgt && (
          <p id="cgt-erreur" className="px-1 text-[13px] font-semibold text-alerte">
            Acceptez les conditions pour payer.
          </p>
        )}
        {etat.etape === "refuse" && (
          <p role="alert" className="rounded-carte bg-alerte-pale p-4 font-semibold text-alerte">
            {etat.message}
          </p>
        )}
      </div>

      {enAttente && (
        <div className="fixed inset-0 z-50 flex items-end bg-encre/50 md:items-center md:justify-center">
          <div role="status" aria-live="polite" className="w-full rounded-t-billet bg-white p-6 text-center md:max-w-md md:rounded-billet">
            <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-action" />
            <p className="mt-4 font-titre text-[19px] font-bold text-marine">Validez le paiement sur votre téléphone</p>
            <p className="mt-2 text-[15px] text-gris">
              Une demande de <strong className="text-encre">{formatFCFA(total)}</strong> a été envoyée au{" "}
              <strong className="text-encre">{numero}</strong> ({nomOperateur}). Saisissez votre code secret pour
              confirmer.
            </p>
            {paiementSimule && (
              <p className="mt-4 rounded-champ bg-ecume px-3 py-2 text-[13px] text-gris">
                Démonstration : la validation est simulée en {Math.round(paiementSimule.delaiMs / 1000)} secondes. Un
                numéro qui se termine par {paiementSimule.suffixeRefus} simule un refus.
              </p>
            )}
          </div>
        </div>
      )}

      <BarreBasse>
        <Bouton taille="grand" pleineLargeur onClick={payer} disabled={enAttente}>
          <Lock aria-hidden className="size-5" /> Payer {formatFCFA(total)}
        </Bouton>
      </BarreBasse>
    </main>
  )
}
