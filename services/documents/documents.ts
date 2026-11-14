/**
 * Rassemble les données d'un billet et de sa facture à partir du Repository, pour les PDF et l'e-mail.
 */
import { formatJourCourt, formatJourLong, heureLocale, jourLocal } from "@/domain/temps"
import { LIBELLES_PIECES_COURTS, libelleCategorie } from "@/domain/passagers"
import { lignesOptions, lignesPassagers } from "@/domain/montants"
import { compositionDe } from "@/domain/occupation"
import type { Commande, Reservation } from "@/domain/types"
import type { Repository } from "../repository/repository"
import type { DonneesBilletPdf, DonneesFacturePdf } from "./pdf"
import { contenuQrBillet } from "./signature-billet"

export interface Documents {
  commande: Commande | null
  reservations: Reservation[]
  billets: DonneesBilletPdf[]
  facture: DonneesFacturePdf | null
}

const STATUTS_BILLET = ["emise", "embarquee", "absente"]

function majuscule(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Documents d'une commande, à partir de la référence de l'un de ses billets. */
export async function documentsDepuisReference(
  repository: Repository,
  reference: string,
  cleSignature: string,
): Promise<Documents | null> {
  const premiere = await repository.trouverReservationParReference(reference)
  if (!premiere || !STATUTS_BILLET.includes(premiere.statut)) return null
  const commande = premiere.commandeId ? await repository.getCommande(premiere.commandeId) : null
  const reservations: Reservation[] = []
  for (const id of commande?.reservationIds ?? [premiere.id]) {
    const r = await repository.getReservation(id)
    if (r && STATUTS_BILLET.includes(r.statut)) reservations.push(r)
  }
  const { ports, lignes, navires, terminaux, familles, options, textes, societe, operateurs } =
    await repository.getReferentiel()

  const billets: DonneesBilletPdf[] = []
  for (const [i, r] of reservations.entries()) {
    const t = await repository.getTraversee(r.traverseeId)
    if (!t) continue
    const ligne = lignes.find((l) => l.id === t.ligneId)
    const depart = ports.find((p) => p.id === ligne?.portDepartId)
    const arrivee = ports.find((p) => p.id === ligne?.portArriveeId)
    billets.push({
      sens: reservations.length > 1 ? (i === 0 ? "Aller" : "Retour") : null,
      reference: r.reference,
      navire: navires.find((n) => n.id === t.navireId)?.nom ?? "",
      depart: { code: depart?.code ?? "", nom: depart?.nom ?? "" },
      arrivee: { code: arrivee?.code ?? "", nom: arrivee?.nom ?? "" },
      date: formatJourLong(jourLocal(t.departAt), true),
      dateCourte: formatJourCourt(jourLocal(t.departAt)),
      heureDepart: heureLocale(t.departAt),
      heureArrivee: heureLocale(t.arriveeAt),
      enregistrement: heureLocale(t.enregistrementOuvertureAt),
      regleEnregistrement: textes.regleEnregistrement,
      terminal: terminaux.find((x) => x.id === t.terminalDepartId)?.nom ?? null,
      lienItineraire: terminaux.find((x) => x.id === t.terminalDepartId)?.lienItineraire ?? null,
      tarif: familles.find((f) => f.code === r.familleCode)?.nom ?? r.familleCode,
      passagers: r.passagers.map((p) => ({
        nom: `${p.nom} ${p.prenom}`,
        detail: `${majuscule(libelleCategorie(p.categorie))}${p.typePiece ? ` · ${LIBELLES_PIECES_COURTS[p.typePiece]}` : ""}`,
      })),
      qr: await contenuQrBillet(r.reference, t.id, cleSignature),
    })
  }

  let facture: DonneesFacturePdf | null = null
  if (commande?.numeroFacture && commande.factureEmiseLe) {
    const paiement = (await repository.listerPaiements(commande.id)).find((p) => p.statut === "reussi")
    const operateur = operateurs.find((o) => o.code === paiement?.moyen)?.nom ?? paiement?.moyen ?? ""
    const titulaire = reservations[0]?.passagers[0]
    facture = {
      numero: commande.numeroFacture,
      dateEmission: formatJourLong(jourLocal(commande.factureEmiseLe), true),
      emetteur: societe,
      client: {
        nom: titulaire ? `${titulaire.nom} ${titulaire.prenom}` : "",
        telephone: commande.telephone,
        email: commande.email,
      },
      references: reservations.map((r) => r.reference),
      lignes: reservations.flatMap((r, i) => {
        const prefixe = reservations.length > 1 ? (i === 0 ? "Aller — " : "Retour — ") : ""
        const tarif = familles.find((f) => f.code === r.familleCode)?.nom ?? r.familleCode
        return [
          ...lignesPassagers(r.prixUnitaires, compositionDe(r.passagers)).map((l) => ({
            ...l,
            libelle: `${prefixe}Traversée ${tarif}, ${l.libelle.replace(/^\d+ /, "")}`,
          })),
          ...lignesOptions(r.options, options).map((l) => ({ ...l, libelle: `${prefixe}${l.libelle.replace(/^\d+ × /, "")}` })),
        ]
      }),
      total: commande.total,
      paiement: paiement
        ? `par ${operateur} (${paiement.numero}), référence opérateur ${paiement.refOperateur ?? "—"}`
        : "—",
    }
  }
  return { commande, reservations, billets, facture }
}
