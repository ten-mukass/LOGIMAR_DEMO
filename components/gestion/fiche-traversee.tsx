"use client"

import { ArrowLeft, ExternalLink, FileText, ScanLine, Ticket } from "lucide-react"
import Link from "next/link"
import { Fragment, useMemo, useState } from "react"
import { Bouton, classesBouton } from "@/components/ui/bouton"
import { classesChamp } from "@/components/ui/champ"
import { formatEcart, formatFCFA, formatMontant, formatPourcentage } from "@/domain/format"
import { courbeCumulee, courbeReference, grouperParTraversee } from "@/domain/indicateurs"
import { etatPaliers, fermeturePermise, MOTIF_MIN, type LignePalier } from "@/domain/paliers"
import { jourDeDepart } from "@/domain/programme"
import { versParametres } from "@/domain/recherche"
import { ORDRE_FAMILLES } from "@/domain/tarifs"
import { formatJourCourt, formatJourLong, heureLocale, jourLocal } from "@/domain/temps"
import type { CodePort } from "@/domain/types"
import { useEtatVentes } from "@/lib/use-etat-ventes"
import { cn } from "@/lib/utils"
import { serviceGestion } from "@/services"
import { syntheseTraversees } from "@/services/gestion/service-gestion"
import { BadgePalier, BadgesAlertes, Chargement, EnTetePage, Section, Tableau, Tuile } from "./elements"
import { CourbeReservation } from "./graphiques"
import { libelleStatutTraversee, nomLigne } from "./libelles"
import { useDroitGestion } from "./profil-gestion"

/** Point « aujourd'hui » de la courbe, si la traversée est à venir et dans la fenêtre de la courbe. */
function actuelSurLaCourbe(departAt: string, maintenant: Date, jours: number, places: number) {
  const joursAvant = (Date.parse(departAt) - maintenant.getTime()) / 86_400_000
  return joursAvant >= 0 && joursAvant <= jours ? { joursAvant, places } : null
}

export function FicheTraversee({ id }: { id: string }) {
  const { etat, recharger } = useEtatVentes()
  const [edition, setEdition] = useState<{ classeId: string; ouverte: boolean } | null>(null)
  const [motif, setMotif] = useState("")
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Direction : lecture seule (pas de bouton Fermer / Ouvrir).
  const reglerPaliers = useDroitGestion("paliers")

  const vue = useMemo(() => {
    if (!etat) return null
    const synthese = syntheseTraversees(etat).find((s) => s.traversee.id === id)
    if (!synthese) return null
    const { traversee, inventaire } = synthese
    const { maintenant, parametres } = etat
    const parTraversee = grouperParTraversee(etat.reservations)
    const reference = courbeReference(
      etat.traversees.filter((t) => t.ligneId === traversee.ligneId && t.id !== traversee.id),
      parTraversee,
      maintenant,
      parametres.joursCourbe,
      parametres.traverseesMinReference,
    )
    return {
      synthese,
      paliers: etatPaliers(inventaire.classes, traversee.capaciteVendable, inventaire.occupation),
      courbe: courbeCumulee(traversee, parTraversee.get(traversee.id) ?? [], maintenant, parametres.joursCourbe),
      reference,
      changements: [...etat.changements.filter((c) => c.traverseeId === id)].reverse(),
      actuel: actuelSurLaCourbe(traversee.departAt, maintenant, parametres.joursCourbe, synthese.indicateurs.places),
    }
  }, [etat, id])

  if (!etat) return <Chargement />
  if (!vue) {
    return (
      <EnTetePage
        titre="Traversée introuvable"
        sousTitre={
          <Link href="/admin/traversees" className="text-action hover:underline">
            Retour aux traversées
          </Link>
        }
      />
    )
  }

  const { referentiel, parametres } = etat
  const { synthese, paliers } = vue
  const { traversee: t, inventaire, indicateurs: i } = synthese
  const nomFamille = (code: string) => referentiel.familles.find((f) => f.code === code)?.nom ?? code
  const ligne = referentiel.lignes.find((l) => l.id === t.ligneId)
  const code = (portId: string | undefined) => referentiel.ports.find((p) => p.id === portId)?.code as CodePort
  const lienClient = `/resultats?${versParametres({
    depart: code(ligne?.portDepartId),
    arrivee: code(ligne?.portArriveeId),
    date: jourDeDepart(t),
    dateRetour: null,
    passagers: { adultes: 1, enfants: 0, bebes: 0 },
  })}`
  const navire = referentiel.navires.find((n) => n.id === t.navireId)
  const partie = synthese.statut === "partie"
  const libellePalier = (l: LignePalier) => `${nomFamille(l.classe.familleCode)} ${l.classe.rang}`

  async function confirmer() {
    if (!edition) return
    setEnCours(true)
    const resultat = await serviceGestion.changerPalier(id, edition.classeId, edition.ouverte, motif)
    setEnCours(false)
    if (!resultat.ok) {
      setErreur(resultat.message)
      return
    }
    const palier = paliers.find((p) => p.classe.id === edition.classeId)
    setConfirmation(
      `Palier ${palier ? libellePalier(palier) : ""} ${edition.ouverte ? "rouvert" : "fermé"}. Le prix affiché sur le site client est à jour.`,
    )
    setEdition(null)
    setMotif("")
    setErreur(null)
    recharger()
  }

  return (
    <>
      <Link href="/admin/traversees" className="inline-flex items-center gap-1 text-[14px] font-semibold text-action hover:underline print:hidden">
        <ArrowLeft aria-hidden className="size-4" />
        Traversées
      </Link>
      <EnTetePage
        titre={`${nomLigne(t.ligneId, referentiel.lignes, referentiel.ports)} · ${formatJourLong(jourDeDepart(t), true)}`}
        sousTitre={
          <>
            Départ {heureLocale(t.departAt)} · arrivée {heureLocale(t.arriveeAt)} · enregistrement dès{" "}
            {heureLocale(t.enregistrementOuvertureAt)} · {navire?.nom} · {t.capaciteVendable} places vendables ·{" "}
            <strong className="text-encre">{libelleStatutTraversee(synthese.statut, synthese.ouverteALaVente)}</strong>
          </>
        }
        actions={
          <>
            <Link href={lienClient} target="_blank" className={classesBouton({ variante: "contour", taille: "compact" })}>
              <ExternalLink aria-hidden className="size-4" />
              Voir côté client
            </Link>
            <Link href={`/admin/traversees/${t.id}/manifeste`} className={classesBouton({ variante: "contour", taille: "compact" })}>
              <FileText aria-hidden className="size-4" />
              Manifeste de bord
            </Link>
            <Link href={`/scan?t=${t.id}`} className={classesBouton({ variante: "contour", taille: "compact" })}>
              <ScanLine aria-hidden className="size-4" />
              Embarquement
            </Link>
            <Link href={`/admin/reservations?traversee=${t.id}`} className={classesBouton({ variante: "contour", taille: "compact" })}>
              <Ticket aria-hidden className="size-4" />
              Réservations
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tuile
          libelle="Remplissage"
          valeur={formatPourcentage(i.remplissage ?? 0)}
          detail={`${i.places} / ${t.capaciteVendable} places vendues`}
        />
        <Tuile
          libelle="Places restantes"
          valeur={String(inventaire.placesRestantes)}
          detail={synthese.placesBloquees > 0 ? `${synthese.placesBloquees} bloquées par un paiement en cours` : "aucun paiement en cours"}
        />
        <Tuile
          libelle="Recette billets"
          valeur={formatFCFA(i.recetteBillets)}
          detail={i.recetteOptions > 0 ? `+ ${formatFCFA(i.recetteOptions)} d’options` : `${i.passagers} passagers`}
        />
        <Tuile
          libelle="Recette par siège offert"
          valeur={i.recetteParSiege === null ? "—" : formatFCFA(i.recetteParSiege)}
          detail={i.recetteParPassager === null ? undefined : `${formatFCFA(i.recetteParPassager)} par passager`}
        />
        <Tuile
          libelle="Pick-up"
          valeur={`${synthese.pickUp[parametres.joursPickUpPrincipal] ?? 0} places`}
          detail={parametres.joursPickUp.map((j) => `${j} j : ${synthese.pickUp[j] ?? 0}`).join(" · ")}
        />
      </div>

      {synthese.alertes.length > 0 && (
        <div className="flex items-center gap-2 text-[14px]">
          <span className="font-semibold text-gris">Alertes :</span>
          <BadgesAlertes alertes={synthese.alertes} enLigne />
        </div>
      )}

      <Section titre="Paliers de prix et quotas">
        <p className="mb-3 text-[14px] text-encre">
          Prix affiché aujourd’hui sur le site pour un adulte :{" "}
          {ORDRE_FAMILLES.map((f, n) => {
            const c = synthese.enVente[f]
            return (
              <span key={f}>
                {n > 0 && " · "}
                <strong>{nomFamille(f)}</strong> {c ? `${formatFCFA(c.prix.adulte, true)} (palier ${c.rang})` : "plus en vente"}
              </span>
            )
          })}
        </p>
        {confirmation && (
          <p role="status" className="mb-3 rounded-champ bg-vert-pale px-3 py-2 text-[14px] font-semibold text-foret-texte">
            {confirmation}
          </p>
        )}
        <Tableau>
          <thead>
            <tr>
              <th>Famille</th>
              <th>Palier</th>
              <th className="text-right">Prix adulte · enfant · bébé</th>
              <th className="text-right">Quota</th>
              <th className="text-right">Occupées</th>
              <th className="text-right">Restantes</th>
              <th>État</th>
              <th className="print:hidden">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paliers.map((l, n) => {
              const premier = n === 0 || paliers[n - 1].classe.familleCode !== l.classe.familleCode
              const enEdition = edition?.classeId === l.classe.id
              return (
                <Fragment key={l.classe.id}>
                  <tr className={cn(premier && n > 0 && "[&>td]:border-t-2 [&>td]:border-t-bordure", l.etat === "en-vente" && "bg-vert-pale/40")}>
                    <td className="font-semibold">{premier ? nomFamille(l.classe.familleCode) : ""}</td>
                    <td>{l.classe.rang}</td>
                    <td className="text-right whitespace-nowrap">
                      <strong>{formatMontant(l.classe.prix.adulte)}</strong>
                      <span className="text-gris">
                        {" "}
                        · {formatMontant(l.classe.prix.enfant)} · {formatMontant(l.classe.prix.bebe)}
                      </span>
                    </td>
                    <td className="text-right">{l.classe.quota ?? "—"}</td>
                    <td className="text-right">{l.occupees}</td>
                    <td className="text-right">{l.restantes}</td>
                    <td>
                      <BadgePalier etat={l.etat} />
                    </td>
                    <td className="text-right print:hidden">
                      {!partie && l.classe.ouverte && !fermeturePermise(inventaire.classes, l.classe.id) ? (
                        <span className="text-[12px] text-gris" title="Le VIP reste vendable tant qu’il reste des places.">
                          Toujours ouvert
                        </span>
                      ) : !partie && reglerPaliers && (
                        <Bouton
                          variante="contour"
                          taille="libre"
                          className="h-8 px-3 text-[13px]"
                          aria-expanded={enEdition}
                          onClick={() => {
                            setEdition(enEdition ? null : { classeId: l.classe.id, ouverte: !l.classe.ouverte })
                            setMotif("")
                            setErreur(null)
                            setConfirmation(null)
                          }}
                        >
                          {l.classe.ouverte ? "Fermer" : "Ouvrir"}
                        </Bouton>
                      )}
                    </td>
                  </tr>
                  {enEdition && edition && (
                    <tr>
                      <td colSpan={8} className="bg-bleu-pale">
                        <form
                          className="flex flex-wrap items-end gap-3 py-1"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void confirmer()
                          }}
                        >
                          <div className="min-w-64 flex-1">
                            <label htmlFor="motif-palier" className="mb-1 block text-[13px] font-semibold text-encre">
                              Motif ({edition.ouverte ? "ouverture" : "fermeture"} du palier {libellePalier(l)}, obligatoire)
                            </label>
                            <input
                              id="motif-palier"
                              autoFocus
                              value={motif}
                              onChange={(e) => {
                                setMotif(e.target.value)
                                setErreur(null)
                              }}
                              placeholder={edition.ouverte ? "Ex. : relancer les ventes" : "Ex. : forte demande pour ce départ"}
                              aria-invalid={erreur ? true : undefined}
                              aria-describedby={erreur ? "motif-erreur" : undefined}
                              className={cn(classesChamp, "h-10 text-[14px]")}
                            />
                          </div>
                          <Bouton type="submit" taille="compact" disabled={enCours || motif.trim().length < MOTIF_MIN}>
                            {edition.ouverte ? "Ouvrir le palier" : "Fermer le palier"}
                          </Bouton>
                          <Bouton variante="lien" taille="compact" onClick={() => setEdition(null)}>
                            Annuler
                          </Bouton>
                          {erreur && (
                            <p id="motif-erreur" role="alert" className="w-full text-[13px] font-semibold text-alerte">
                              {erreur}
                            </p>
                          )}
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </Tableau>
        <p className="mt-2 text-[12px] text-gris">
          Occupées : places vendues et places bloquées par un paiement en cours. On vend toujours au palier ouvert le
          moins cher ; un palier épuisé laisse la place au suivant. Un prix déjà bloqué par un client ne change pas. Le
          VIP reste toujours vendable.
        </p>
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section titre={`Courbe de réservation — J-${parametres.joursCourbe} au départ`} className="lg:col-span-2">
          <CourbeReservation
            courbe={vue.courbe}
            reference={vue.reference?.points ?? null}
            capacite={t.capaciteVendable}
            actuel={vue.actuel}
            libelleReference={
              vue.reference
                ? `Référence : moyenne de ${vue.reference.nombre} traversées parties (${nomLigne(t.ligneId, referentiel.lignes, referentiel.ports, true)})`
                : "Référence : pas encore assez de traversées parties"
            }
          />
          <p className="mt-2 text-[13px] text-gris">
            {synthese.ecart !== null
              ? `Écart à la référence aujourd’hui : ${formatEcart(synthese.ecart)}.`
              : vue.reference
                ? "Pas d’écart calculé : la traversée est partie ou encore hors de la fenêtre de la courbe."
                : `La référence s’affiche à partir de ${parametres.traverseesMinReference} traversées parties dans ce sens.`}
          </p>
        </Section>
        <Section titre="Historique des paliers">
          {vue.changements.length === 0 ? (
            <p className="text-[14px] text-gris">Aucune ouverture ni fermeture manuelle.</p>
          ) : (
            <ol className="space-y-3 text-[13px]">
              {vue.changements.map((c) => {
                const palier = paliers.find((p) => p.classe.id === c.classeId)
                return (
                  <li key={c.id} className="border-l-2 border-bordure pl-3">
                    <p className="font-semibold text-encre">
                      {palier ? libellePalier(palier) : c.classeId} {c.ouverte ? "ouvert" : "fermé"}
                    </p>
                    <p className="text-gris">
                      {formatJourCourt(jourLocal(c.le))} à {heureLocale(c.le)} · {c.auteur}
                    </p>
                    <p className="text-encre">« {c.motif} »</p>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="mt-3 text-[12px] text-gris">Démo : historique conservé dans ce navigateur. Production : journal d’audit.</p>
        </Section>
      </div>
    </>
  )
}
