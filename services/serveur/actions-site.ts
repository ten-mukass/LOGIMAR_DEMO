"use server"

/**
 * Actions serveur du parcours client (étape 7B, docs/PLAN_BASE_DE_DONNEES.md).
 * Ce sont les seules portes du navigateur vers la base : chacune vérifie ce qu'elle reçoit.
 *
 * - Prix, places, blocage, références et numéro de facture : calculés ici (ServiceReservation dans une
 *   transaction), jamais repris du navigateur. L'heure est celle du serveur.
 * - Lecture d'une réservation, d'une commande, d'un paiement ou d'un e-mail : seulement avec son identifiant
 *   (aléatoire, connu de l'appareil qui a réservé ou retrouvé le billet). Par référence : seulement avec le
 *   téléphone ou l'e-mail de la réservation.
 * - Refusées quand les données ne sont pas en base (production tant que les étapes C et D ne sont pas faites).
 */
import type { CodeFamille, Commande, Envoi, InfoTrafic, LigneOption, Paiement, Reservation, Traversee } from "@/domain/types"
import type { SaisiePassager } from "@/domain/passagers"
import { MESSAGE_BILLET_INTROUVABLE, trouverBillet } from "../billets/service-billets"
import { donneesEnBase } from "../mode-donnees"
import type { Operateur } from "../paiement/payment-provider"
import type { FiltreTraversees, Inventaire, Referentiel } from "../repository/repository"
import type { CommandeDetaillee, DemandeBlocage, Resultat } from "../reservation/service-reservation"
import { servicesServeur } from "./services"

const MAX_IDS = 200

/**
 * Répartition par tarif (« Le plus choisi ») : elle lit toutes les ventes, on la garde une minute.
 * Le référentiel est gardé par le Repository du serveur ; places et prix sont toujours relus.
 */
const DUREE_REPARTITION_MS = 60_000
let repartition: { valeur: Promise<Record<CodeFamille, number>>; jusqua: number } | null = null

function memoire<T>(entree: { valeur: Promise<T>; jusqua: number } | null, duree: number, lire: () => Promise<T>) {
  if (entree && entree.jusqua > Date.now()) return entree
  const valeur = lire()
  const nouvelle = { valeur, jusqua: Date.now() + duree }
  // Une lecture en échec n'est pas gardée.
  valeur.catch(() => {
    nouvelle.jusqua = 0
  })
  return nouvelle
}

function services() {
  if (!donneesEnBase) throw new Error("Les données du site ne sont pas en base ici.")
  return servicesServeur()
}

const estTexte = (v: unknown, max = 200): v is string => typeof v === "string" && v.length <= max
const estTexteOuVide = (v: unknown, max = 200) => v === undefined || v === null || estTexte(v, max)

function ids(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > MAX_IDS || !v.every((x) => estTexte(x, 100))) throw new Error("Identifiants invalides.")
  return v as string[]
}

function id(v: unknown): string {
  if (!estTexte(v, 100) || v.length === 0) throw new Error("Identifiant invalide.")
  return v
}

function estPassager(p: unknown): p is SaisiePassager {
  if (typeof p !== "object" || p === null) return false
  const x = p as Record<string, unknown>
  return (
    ["adulte", "enfant", "bebe"].includes(x.categorie as string) &&
    estTexte(x.nom, 100) &&
    estTexte(x.prenom, 100) &&
    estTexte(x.dateNaissance, 10) &&
    estTexte(x.typePiece, 20) &&
    estTexte(x.numeroPiece, 50)
  )
}

function estDemandeBlocage(d: unknown): d is DemandeBlocage {
  if (typeof d !== "object" || d === null) return false
  const x = d as Record<string, unknown>
  return (
    Array.isArray(x.segments) &&
    x.segments.length >= 1 &&
    x.segments.length <= 2 &&
    x.segments.every(
      (s: Record<string, unknown>) =>
        typeof s === "object" &&
        s !== null &&
        estTexte(s.traverseeId, 100) &&
        ["ECO", "VIP"].includes(s.familleCode as CodeFamille) &&
        typeof s.totalAffiche === "number",
    ) &&
    Array.isArray(x.passagers) &&
    x.passagers.length >= 1 &&
    x.passagers.length <= 20 &&
    x.passagers.every(estPassager) &&
    estTexte(x.telephone, 40) &&
    estTexte(x.email, 200) &&
    estTexteOuVide(x.clientId, 100)
  )
}

// Référentiel et ventes ------------------------------------------------------

export async function lireReferentiel(): Promise<Referentiel> {
  return services().repository.getReferentiel()
}

export async function lireInfosTrafic(): Promise<InfoTrafic[]> {
  const s = services()
  return s.repository.getInfosTrafic(s.horloge())
}

export async function lireTraversees(filtre: FiltreTraversees = {}): Promise<Traversee[]> {
  if (!estTexteOuVide(filtre.ligneId) || !estTexteOuVide(filtre.du, 10) || !estTexteOuVide(filtre.au, 10)) {
    throw new Error("Filtre invalide.")
  }
  return services().repository.listerTraversees({ ligneId: filtre.ligneId, du: filtre.du, au: filtre.au })
}

export async function lireTraversee(traverseeId: string): Promise<Traversee | null> {
  return services().repository.getTraversee(id(traverseeId))
}

export async function lireInventaires(traverseeIds: string[]): Promise<Inventaire[]> {
  const s = services()
  return s.repository.listerInventaires(ids(traverseeIds), s.horloge())
}

export async function lireRepartitionParFamille(): Promise<Record<CodeFamille, number>> {
  const s = services()
  repartition = memoire(repartition, DUREE_REPARTITION_MS, () => s.repository.repartitionParFamille(s.horloge()))
  return repartition.valeur
}

/** Billet d'exemple (vente d'exemple, noms neutres) pour essayer « Mes billets ». */
export async function lireExempleBillet(): Promise<{ reference: string; contact: string } | null> {
  const s = services()
  return s.repository.exempleBillet(s.horloge())
}

// Réservation et paiement -----------------------------------------------------

export async function bloquerPlaces(demande: DemandeBlocage): Promise<Resultat<CommandeDetaillee & { prixModifie: boolean }>> {
  if (!estDemandeBlocage(demande)) {
    return { ok: false, raison: "donnees-invalides", message: "Certaines informations sont incomplètes ou invalides." }
  }
  return services().serviceReservation.bloquer(demande)
}

export async function lireCommandeDetaillee(commandeId: string): Promise<CommandeDetaillee | null> {
  return services().serviceReservation.lireCommande(id(commandeId))
}

export async function libererPlaces(commandeId: string): Promise<void> {
  await services().serviceReservation.liberer(id(commandeId))
}

export async function demanderPaiement(
  commandeId: string,
  saisie: { operateur: Operateur; numero: string; options: Partial<Record<LigneOption["code"], number>> },
): Promise<Resultat<Paiement>> {
  const options = typeof saisie?.options === "object" && saisie.options !== null ? saisie.options : {}
  const optionsValides = Object.entries(options).every(
    ([code, n]) => ["BAGAGE", "GARANTIE"].includes(code) && Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 20,
  )
  if (!["airtel", "moov"].includes(saisie?.operateur) || !estTexte(saisie?.numero, 40) || !optionsValides) {
    return { ok: false, raison: "donnees-invalides", message: "Certaines informations sont incomplètes ou invalides." }
  }
  return services().serviceReservation.payer(id(commandeId), {
    operateur: saisie.operateur,
    numero: saisie.numero,
    options: options as Partial<Record<LigneOption["code"], number>>,
  })
}

/** L'écran de paiement redemande l'état : c'est à ce moment que la confirmation simulée est appliquée. */
export async function suivrePaiement(paiementId: string): Promise<Paiement | null> {
  return services().serviceReservation.verifierPaiement(id(paiementId))
}

// Billets, factures, e-mails (accès par identifiant) ------------------------------

export async function lireReservations(reservationIds: string[]): Promise<Reservation[]> {
  const { repository } = services()
  const trouvees: Reservation[] = []
  for (const rid of ids(reservationIds)) {
    const r = await repository.getReservation(rid)
    if (r) trouvees.push(r)
  }
  return trouvees
}

export async function lireCommande(commandeId: string): Promise<Commande | null> {
  return services().repository.getCommande(id(commandeId))
}

export async function lirePaiements(commandeId: string): Promise<Paiement[]> {
  return services().repository.listerPaiements(id(commandeId))
}

export async function lireEnvoi(envoiId: string): Promise<Envoi | null> {
  return services().repository.getEnvoi(id(envoiId))
}

export async function lireEnvoisCommande(commandeId: string): Promise<Envoi[]> {
  return services().repository.listerEnvois({ commandeId: id(commandeId) })
}

/** « Mes billets » : référence + téléphone ou e-mail de la réservation. */
export async function rechercherBillet(reference: string, contact: string): Promise<Resultat<Reservation>> {
  if (!estTexte(reference, 40) || !estTexte(contact, 200)) {
    return { ok: false, raison: "introuvable", message: MESSAGE_BILLET_INTROUVABLE }
  }
  const reservation = await trouverBillet(services().repository, reference, contact)
  return reservation ? { ok: true, valeur: reservation } : { ok: false, raison: "introuvable", message: MESSAGE_BILLET_INTROUVABLE }
}

/** Compte client (resté sur l'appareil) : rattache la commande au compte qui vient d'être créé. */
export async function rattacherCommandeAuCompte(commandeId: string, clientId: string): Promise<void> {
  const { repository } = services()
  const commande = await repository.getCommande(id(commandeId))
  if (!commande || (commande.clientId !== null && commande.clientId !== clientId)) return
  await repository.enregistrerCommande({ ...commande, clientId: id(clientId) })
}
