/**
 * « Mes billets » : retrouver un billet avec sa référence et le téléphone ou l'e-mail de la réservation,
 * et lister les billets consultables sur cet appareil.
 * Un billet ne s'affiche que s'il a été réservé ou retrouvé sur l'appareil, ou s'il est rattaché au compte connecté.
 */
import { chiffresTelephone } from "@/domain/contact"
import { normaliserReference } from "@/domain/reference"
import type { Reservation } from "@/domain/types"
import type { AuthService, ResultatAuth } from "../auth/auth-service"
import type { Repository } from "../repository/repository"
import { lireJson, type Stockage } from "../stockage"

const CLE = "logimar-demo:v2:billets-appareil"
const STATUTS_BILLET = ["emise", "embarquee", "absente"]

function contactCorrespond(reservation: Reservation, contact: string): boolean {
  const saisie = contact.trim()
  if (saisie.includes("@")) return reservation.email !== null && reservation.email === saisie.toLowerCase()
  const chiffres = chiffresTelephone(saisie)
  return chiffres !== null && reservation.telephone !== null && chiffresTelephone(reservation.telephone) === chiffres
}

export class ServiceBillets {
  constructor(private readonly d: { repository: Repository; auth: AuthService; stockage: Stockage }) {}

  private references(): string[] {
    return lireJson<string[]>(this.d.stockage, CLE, [])
  }

  private memoriser(reference: string): void {
    const refs = this.references()
    if (!refs.includes(reference)) this.d.stockage.ecrire(CLE, JSON.stringify([...refs, reference]))
  }

  async rechercher(reference: string, contact: string): Promise<ResultatAuth<string>> {
    const ref = normaliserReference(reference)
    const reservation = await this.d.repository.trouverReservationParReference(ref)
    if (!reservation || !STATUTS_BILLET.includes(reservation.statut) || !contactCorrespond(reservation, contact)) {
      // Même message dans tous les cas : on ne révèle pas si la référence existe.
      return { ok: false, message: "Aucun billet ne correspond à cette référence et à ce contact." }
    }
    this.memoriser(ref)
    return { ok: true, valeur: ref }
  }

  /** Billets consultables ici, du plus proche au plus lointain. */
  async consultables(): Promise<Reservation[]> {
    const { repository, auth } = this.d
    const parId = new Map<string, Reservation>()
    for (const r of await repository.listerReservationsLocales()) {
      if (STATUTS_BILLET.includes(r.statut)) parId.set(r.id, r)
    }
    for (const ref of this.references()) {
      const r = await repository.trouverReservationParReference(ref)
      if (r && STATUTS_BILLET.includes(r.statut)) parId.set(r.id, r)
    }
    const session = await auth.session()
    for (const id of session?.client.reservationIds ?? []) {
      const r = await repository.getReservation(id)
      if (r && STATUTS_BILLET.includes(r.statut)) parId.set(r.id, r)
    }
    return [...parId.values()]
  }

  async autorise(reference: string): Promise<boolean> {
    return (await this.consultables()).some((r) => r.reference === reference)
  }
}
