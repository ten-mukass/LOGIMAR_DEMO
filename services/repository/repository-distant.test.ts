import { beforeEach, describe, expect, it, vi } from "vitest"
import { seed } from "@/data/seed"
import type { Reservation } from "@/domain/types"
import { stockageMemoire } from "../stockage"
import { DemoRepository } from "./demo-repository"
import { RepositoryDistant } from "./repository-distant"

/** Étape 7B : ce que le navigateur peut lire de la base, et ce qu'il garde pour relire ses billets. */

const { billet, lireReservations, rechercherBillet, rattacherCommandeAuCompte } = vi.hoisted(() => {
  const billet = {
    id: "8d9c2b6e-0000-4000-8000-000000000001",
    reference: "LGM-7K4Q2",
    statut: "emise",
  } as Reservation
  return {
    billet,
    lireReservations: vi.fn(async (ids: string[]) => (ids.includes(billet.id) ? [billet] : [])),
    rechercherBillet: vi.fn(async (reference: string, contact: string) =>
      reference === billet.reference && contact === "+241 07 12 34 56"
        ? { ok: true as const, valeur: billet }
        : { ok: false as const, raison: "introuvable" as const, message: "Aucun billet." },
    ),
    rattacherCommandeAuCompte: vi.fn(async () => {}),
  }
})

vi.mock("../serveur/actions-site", () => ({ lireReservations, rechercherBillet, rattacherCommandeAuCompte }))

let distant: RepositoryDistant

beforeEach(() => {
  vi.clearAllMocks()
  distant = new RepositoryDistant(new DemoRepository(seed, stockageMemoire()), stockageMemoire())
})

describe("RepositoryDistant", () => {
  it("ne relit un billet par sa référence que s'il est connu de l'appareil", async () => {
    expect(await distant.trouverReservationParReference(billet.reference)).toBeNull()
    expect(lireReservations).not.toHaveBeenCalled()

    expect(await distant.rechercherBillet(billet.reference, "+241 06 00 00 00")).toBeNull()
    expect(await distant.rechercherBillet(billet.reference, "+241 07 12 34 56")).toEqual(billet)
    expect(await distant.trouverReservationParReference(billet.reference)).toEqual(billet)
    expect(await distant.listerReservationsLocales()).toEqual([billet])
  })

  it("retient les réservations lues par identifiant (après le paiement)", async () => {
    await distant.getReservation(billet.id)
    expect(await distant.trouverReservationParReference(billet.reference)).toEqual(billet)
  })

  it("refuse les écritures directes dans la base depuis le navigateur", async () => {
    await expect(distant.enregistrerReservation()).rejects.toThrow(/serveur/)
    await expect(distant.enregistrerPaiement()).rejects.toThrow(/serveur/)
    await expect(distant.prochainNumeroFacture()).rejects.toThrow(/serveur/)
    await expect(distant.transaction()).rejects.toThrow(/serveur/)
  })

  it("garde les comptes clients sur l'appareil et ne rattache que la commande au compte", async () => {
    expect(await distant.trouverClient("client@example.com")).toBeNull()
    await distant.enregistrerCommande({ id: "c1", clientId: "k1" } as never)
    expect(rattacherCommandeAuCompte).toHaveBeenCalledWith("c1", "k1")
  })
})
