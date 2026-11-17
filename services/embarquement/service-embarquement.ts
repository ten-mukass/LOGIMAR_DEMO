/**
 * Embarquement : contrôle des billets (scan du QR ou recherche manuelle), passage à bord, clôture.
 *
 * Démo : tout se passe dans le navigateur (DemoRepository), la signature du QR est vérifiée avec la clé
 * de démonstration. Production : l'application de scan télécharge la liste de la traversée avant le départ,
 * vérifie la signature hors ligne (clé publique) et synchronise les embarquements sans doublon.
 */
import { controlerBillet, creerEmbarquements, type Controle, type LectureBillet } from "@/domain/embarquement"
import { estVendue } from "@/domain/indicateurs"
import {
  compterEmbarquement,
  correspondTexte,
  manifesteDeBord,
  passagersPayes,
  type CompteurEmbarquement,
  type LignePassager,
} from "@/domain/manifeste"
import type {
  ClotureEmbarquement,
  Embarquement,
  ModeControle,
  Reservation,
  ScanEmbarquement,
  Traversee,
} from "@/domain/types"
import { verifierQrBillet } from "../documents/signature-billet"
import type { Referentiel, Repository } from "../repository/repository"

export interface EtatEmbarquement {
  maintenant: Date
  referentiel: Referentiel
  traversee: Traversee
  /** Réservations de la traversée (toutes origines, mêmes données que le site). */
  reservations: Reservation[]
  embarquements: Embarquement[]
  cloture: ClotureEmbarquement | null
  /** Billets vendus : passagers payés avec leur statut d'embarquement. */
  passagers: LignePassager[]
  /** Manifeste de bord : passagers embarqués, dans l'ordre de passage. */
  bord: LignePassager[]
  compteur: CompteurEmbarquement
  /** Derniers contrôles, du plus récent au plus ancien. */
  scans: ScanEmbarquement[]
}

export interface ResultatControleBillet {
  controle: Controle
  /** Passagers montés à bord grâce à ce contrôle. */
  embarques: Embarquement[]
  /** Pour « autre traversée » : la traversée inscrite sur le billet. */
  traverseeBillet: Traversee | null
}

export type ResultatEmbarquement = { ok: true } | { ok: false; message: string }

export class ServiceEmbarquement {
  constructor(
    private readonly d: {
      repository: Repository
      horloge: () => Date
      genererId: () => string
      /** Clé de vérification des QR (démo : clé publique de démonstration). */
      cleSignature: string
      /** Démo : libellé fixe ; production : l'agent connecté. */
      agent: string
    },
  ) {}

  async etat(traverseeId: string, maintenant = this.d.horloge()): Promise<EtatEmbarquement | null> {
    const { repository } = this.d
    const traversee = await repository.getTraversee(traverseeId)
    if (!traversee) return null
    const [referentiel, reservations, embarquements, cloture, scans] = await Promise.all([
      repository.getReferentiel(),
      repository.listerReservations(maintenant, { traverseeIds: [traverseeId] }),
      repository.listerEmbarquements(traverseeId),
      repository.getClotureEmbarquement(traverseeId),
      repository.listerScans(traverseeId),
    ])
    const passagers = passagersPayes(reservations, traverseeId, maintenant, embarquements, cloture)
    return {
      maintenant,
      referentiel,
      traversee,
      reservations,
      embarquements,
      cloture,
      passagers,
      bord: manifesteDeBord(reservations, traverseeId, embarquements),
      compteur: compterEmbarquement(passagers),
      scans: [...scans].reverse(),
    }
  }

  /** Contrôle le contenu d'un QR lu par la caméra ; s'il est valide, les passagers montent à bord aussitôt. */
  async scanner(contenu: string, traverseeId: string): Promise<ResultatControleBillet> {
    const verification = await verifierQrBillet(contenu.trim(), this.d.cleSignature)
    const lecture: LectureBillet = verification.valide
      ? { mode: "scan", valide: true, reference: verification.reference, traverseeId: verification.traverseeId }
      : { mode: "scan", valide: false, motif: verification.motif }
    // Pour le journal : la référence lue sur un QR dont la signature est fausse (non vérifiée).
    const morceaux = contenu.trim().split("|")
    const referenceLue = verification.valide ? verification.reference : morceaux.length === 4 ? morceaux[1] : null
    return this.controler(lecture, traverseeId, "scan", referenceLue)
  }

  /** Contrôle d'un billet retrouvé par la recherche (QR illisible, téléphone éteint…). */
  async controlerManuellement(reference: string, traverseeId: string): Promise<ResultatControleBillet> {
    return this.controler({ mode: "manuel", reference }, traverseeId, "manuel", reference)
  }

  private async controler(
    lecture: LectureBillet,
    traverseeId: string,
    mode: ModeControle,
    reference: string | null,
  ): Promise<ResultatControleBillet> {
    const { repository, horloge, genererId, agent } = this.d
    const maintenant = horloge()
    const [reservations, embarquements, cloture] = await Promise.all([
      repository.listerReservations(maintenant, { traverseeIds: [traverseeId] }),
      repository.listerEmbarquements(traverseeId),
      repository.getClotureEmbarquement(traverseeId),
    ])
    const controle = controlerBillet({ lecture, traverseeId, reservations, embarquements, cloture, maintenant })
    let embarques: Embarquement[] = []
    if (controle.resultat === "valide") {
      embarques = creerEmbarquements(controle.reservation, controle.aEmbarquer, traverseeId, { mode, agent, maintenant, genererId })
      await repository.enregistrerEmbarquements(embarques)
    }
    await repository.enregistrerScan({
      id: genererId(),
      traverseeId,
      reference,
      resultat: controle.resultat,
      mode,
      agent,
      le: maintenant.toISOString(),
    })
    const traverseeBillet =
      controle.resultat === "autre-traversee" ? await repository.getTraversee(controle.traverseeIdBillet) : null
    return { controle, embarques, traverseeBillet }
  }

  /** Billets payés de la traversée qui correspondent à une référence, un nom, un téléphone ou un e-mail. */
  async rechercher(texte: string, traverseeId: string, limite = 8): Promise<Reservation[]> {
    if (texte.trim().length < 2) return []
    const maintenant = this.d.horloge()
    const reservations = await this.d.repository.listerReservations(maintenant, { traverseeIds: [traverseeId] })
    return reservations.filter((r) => estVendue(r, maintenant) && correspondTexte(r, texte)).slice(0, limite)
  }

  /** Correction : retire un passager du bord (le billet redevient valable pour lui). */
  async retirer(embarquementId: string): Promise<void> {
    await this.d.repository.supprimerEmbarquement(embarquementId)
  }

  async cloturer(traverseeId: string): Promise<ResultatEmbarquement> {
    const { repository, horloge, agent } = this.d
    if (!(await repository.getTraversee(traverseeId))) return { ok: false, message: "Traversée introuvable." }
    if (await repository.getClotureEmbarquement(traverseeId)) return { ok: false, message: "L’embarquement est déjà clos." }
    await repository.definirClotureEmbarquement(traverseeId, { traverseeId, agent, le: horloge().toISOString() })
    return { ok: true }
  }

  async rouvrir(traverseeId: string): Promise<void> {
    await this.d.repository.definirClotureEmbarquement(traverseeId, null)
  }
}
