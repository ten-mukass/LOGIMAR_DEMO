"use client"

import { AlertTriangle, CheckCircle2, Lock, XCircle } from "lucide-react"
import { premierEmbarquement } from "@/domain/embarquement"
import { LIBELLES_MODE } from "@/domain/manifeste"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { jourDeDepart } from "@/domain/programme"
import { formatJourCourt, heureLocale, jourLocal } from "@/domain/temps"
import type { Embarquement, Ligne, Port, Reservation } from "@/domain/types"
import { cn } from "@/lib/utils"
import type { ResultatControleBillet } from "@/services"
import { nomLigne } from "@/components/gestion/libelles"

const MOTIFS_INVALIDE = {
  signature: "La signature ne correspond pas : billet falsifié ou modifié.",
  illisible: "Ce QR code n’est pas un billet LOGIMAR 241.",
  inconnu: "Aucun billet payé ne porte cette référence sur cette traversée.",
}

function motifNonValable(r: Reservation): string {
  if (r.statut === "annulee") return "Réservation abandonnée avant paiement."
  if (r.statut === "remboursee") return "Billet remboursé."
  if (r.statut === "expiree" || r.statut === "bloquee") return "Billet non payé."
  return "Ce billet n’est pas valable."
}

function quand(iso: string): string {
  return `le ${formatJourCourt(jourLocal(iso)).toLowerCase()} à ${heureLocale(iso)}`
}

/** Résultat du dernier contrôle, en grand, lisible à la passerelle. */
export function CarteResultat({
  resultat,
  lignes,
  ports,
  onRetirer,
}: {
  resultat: ResultatControleBillet
  lignes: Ligne[]
  ports: Port[]
  onRetirer: (embarquement: Embarquement) => void
}) {
  const { controle, embarques, traverseeBillet } = resultat
  const ok = controle.resultat === "valide"
  const attention = controle.resultat === "deja-scanne" || controle.resultat === "autre-traversee"
  const Icone = ok ? CheckCircle2 : controle.resultat === "embarquement-clos" ? Lock : attention ? AlertTriangle : XCircle

  let titre = ""
  let detail = ""
  switch (controle.resultat) {
    case "valide":
      titre = `Billet valide — ${embarques.length} passager${embarques.length > 1 ? "s" : ""} à bord`
      detail = "Contrôlez la pièce d’identité de chaque adulte."
      break
    case "deja-scanne": {
      const premier = premierEmbarquement(controle.embarquements)
      titre = "Billet déjà utilisé"
      detail = premier ? `Passé à bord ${quand(premier.embarqueLe)} (${LIBELLES_MODE[premier.mode].toLowerCase()}).` : ""
      break
    }
    case "autre-traversee":
      titre = "Billet d’une autre traversée"
      detail = traverseeBillet
        ? `Ce billet est pour ${nomLigne(traverseeBillet.ligneId, lignes, ports)}, ${formatJourCourt(jourDeDepart(traverseeBillet)).toLowerCase()} à ${heureLocale(traverseeBillet.departAt)}.`
        : "Ce billet ne correspond pas à la traversée en cours."
      break
    case "non-valable":
      titre = "Billet non valable"
      detail = motifNonValable(controle.reservation)
      break
    case "invalide":
      titre = "QR code refusé"
      detail = MOTIFS_INVALIDE[controle.motif]
      break
    case "embarquement-clos":
      titre = "Embarquement clos"
      detail = `Clos ${quand(controle.cloture.le)}.`
      break
  }

  const reservation = "reservation" in controle ? controle.reservation : null
  const passagersEmbarques = reservation
    ? embarques.map((e) => ({ embarquement: e, passager: reservation.passagers.find((p) => p.id === e.passagerId) }))
    : []

  return (
    <section
      aria-live="assertive"
      className={cn(
        "rounded-carte border-2 p-4",
        ok ? "border-foret-texte bg-vert-pale" : attention ? "border-soleil-bordure bg-soleil-pale" : "border-alerte bg-alerte-pale",
      )}
    >
      <div className="flex items-start gap-3">
        <Icone aria-hidden className={cn("size-9 shrink-0", ok ? "text-foret-texte" : attention ? "text-marine" : "text-alerte")} />
        <div className="min-w-0">
          <h2 className={cn("text-[20px] font-extrabold leading-tight", ok ? "text-foret-texte" : attention ? "text-marine" : "text-alerte")}>
            {titre}
          </h2>
          <p className="mt-1 text-[15px] text-encre">{detail}</p>
          {reservation && <p className="mt-1 text-[13px] text-gris">Billet {reservation.reference}</p>}
        </div>
      </div>
      {passagersEmbarques.length > 0 && (
        <ul className="mt-3 divide-y divide-foret-texte/20 rounded-champ bg-white">
          {passagersEmbarques.map(({ embarquement, passager }) => (
            <li key={embarquement.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="font-semibold text-encre">
                  {passager ? `${passager.prenom} ${passager.nom}` : embarquement.passagerId}
                </p>
                <p className="text-[13px] text-gris">
                  {passager && libelleCategorie(passager.categorie)}
                  {passager?.typePiece && ` · ${LIBELLES_PIECES_COURTS[passager.typePiece]} ${passager.numeroPiece ?? ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRetirer(embarquement)}
                className="shrink-0 rounded-champ px-2 py-1.5 text-[13px] font-semibold text-action underline underline-offset-2 hover:text-marine"
              >
                Retirer du bord
              </button>
            </li>
          ))}
        </ul>
      )}
      {controle.resultat === "valide" && controle.dejaABord.length > 0 && (
        <p className="mt-2 text-[13px] text-gris">
          {controle.dejaABord.length} autre{controle.dejaABord.length > 1 ? "s" : ""} passager
          {controle.dejaABord.length > 1 ? "s" : ""} de ce billet déjà à bord.
        </p>
      )}
    </section>
  )
}
