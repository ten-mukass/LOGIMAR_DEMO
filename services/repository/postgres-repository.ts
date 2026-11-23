/**
 * Repository sur PostgreSQL (base Supabase en production, PGlite dans les tests). Côté serveur uniquement.
 *
 * Mêmes règles que DemoRepository, pour que les écrans voient la même chose :
 * - les vraies réservations passent d'abord, puis les ventes d'exemple (exemple = true) qui tiennent encore ;
 * - une vente d'exemple tombée dans un palier fermé à la main au moment de l'achat n'a pas lieu ;
 * - l'état d'un palier est celui de son dernier changement manuel.
 *
 * Les textes du site (aide, société, opérateurs, réglages du paiement simulé) restent dans data/seed.
 * Les comptes clients arrivent dans une étape ultérieure (docs/PLAN_BASE_DE_DONNEES.md).
 */
import type { ConfigCommerciale, ParametresGestion } from "@/domain/config"
import type { Seed } from "@/data/seed"
import { estVendue } from "@/domain/indicateurs"
import { compositionDe, occupationAvecPriorite } from "@/domain/occupation"
import { appliquerChangements, palierOuvertA } from "@/domain/paliers"
import { jourDeDepart } from "@/domain/programme"
import { placesNecessaires, placesRestantesTraversee, type Occupation } from "@/domain/tarifs"
import type {
  Agence,
  ChangementPalier,
  ClasseReservation,
  Client,
  ClotureEmbarquement,
  CodeFamille,
  CodeVerification,
  Commande,
  Embarquement,
  Envoi,
  FamilleTarifaire,
  InfoTrafic,
  Ligne as LigneMaritime,
  LigneOption,
  Navire,
  OptionCatalogue,
  Paiement,
  Passager,
  Port,
  RegleProgramme,
  Reservation,
  ScanEmbarquement,
  Terminal,
  Traversee,
} from "@/domain/types"
import { iso, isoOuNull, json, jourOuNull, type Ligne, type Sql } from "../serveur/sql"
import type { FiltreTraversees, Inventaire, Referentiel, Repository, Verrous } from "./repository"

const MS_JOUR = 86_400_000

/** Liste d'identifiants passée en un seul paramètre JSON (même écriture pour tous les pilotes). */
const DANS = (n: number) => `(select jsonb_array_elements_text($${n}::text::jsonb))`

// Lignes de la base → objets du domaine -------------------------------------

function traversee(l: Ligne): Traversee {
  return {
    id: String(l.id),
    ligneId: String(l.ligne_id),
    navireId: String(l.navire_id),
    terminalDepartId: String(l.terminal_depart_id),
    terminalArriveeId: String(l.terminal_arrivee_id),
    departAt: iso(l.depart_at),
    arriveeAt: iso(l.arrivee_at),
    enregistrementOuvertureAt: iso(l.enregistrement_ouverture_at),
    enregistrementFermetureAt: isoOuNull(l.enregistrement_fermeture_at),
    statut: l.statut as Traversee["statut"],
    capaciteVendable: Number(l.capacite_vendable),
  }
}

function classe(l: Ligne): ClasseReservation {
  return {
    id: String(l.id),
    traverseeId: String(l.traversee_id),
    familleCode: l.famille_code as CodeFamille,
    rang: Number(l.rang),
    prix: { adulte: Number(l.prix_adulte), enfant: Number(l.prix_enfant), bebe: Number(l.prix_bebe) },
    quota: l.quota === null ? null : Number(l.quota),
    ouverte: Boolean(l.ouverte),
  }
}

function changement(l: Ligne): ChangementPalier {
  return {
    id: String(l.id),
    traverseeId: String(l.traversee_id),
    classeId: String(l.classe_id),
    ouverte: Boolean(l.ouverte),
    motif: String(l.motif),
    auteur: String(l.auteur),
    le: iso(l.le),
  }
}

function passager(l: Ligne): Passager {
  return {
    id: String(l.id),
    categorie: l.categorie as Passager["categorie"],
    nom: String(l.nom),
    prenom: String(l.prenom),
    dateNaissance: jourOuNull(l.date_naissance),
    typePiece: (l.type_piece ?? null) as Passager["typePiece"],
    numeroPiece: (l.numero_piece ?? null) as string | null,
  }
}

function commande(l: Ligne, reservationIds: string[]): Commande {
  return {
    id: String(l.id),
    reservationIds,
    telephone: (l.telephone ?? null) as string | null,
    email: (l.email ?? null) as string | null,
    statut: l.statut as Commande["statut"],
    total: Number(l.total),
    numeroFacture: (l.numero_facture ?? null) as string | null,
    factureEmiseLe: isoOuNull(l.facture_emise_le),
    clientId: (l.client_id ?? null) as string | null,
    creeLe: iso(l.cree_le),
  }
}

function paiement(l: Ligne): Paiement {
  return {
    id: String(l.id),
    commandeId: String(l.commande_id),
    moyen: l.moyen as Paiement["moyen"],
    numero: String(l.numero),
    montant: Number(l.montant),
    statut: l.statut as Paiement["statut"],
    refTransaction: String(l.ref_transaction),
    refOperateur: (l.ref_operateur ?? null) as string | null,
    creeLe: iso(l.cree_le),
    majLe: iso(l.maj_le),
  }
}

function envoi(l: Ligne): Envoi {
  return {
    id: String(l.id),
    commandeId: (l.commande_id ?? null) as string | null,
    clientId: (l.client_id ?? null) as string | null,
    canal: l.canal as Envoi["canal"],
    destinataire: String(l.destinataire),
    objet: String(l.objet),
    texte: String(l.texte),
    pieces: json<Envoi["pieces"]>(l.pieces),
    statut: l.statut as Envoi["statut"],
    tentatives: Number(l.tentatives),
    erreur: (l.erreur ?? null) as string | null,
    creeLe: iso(l.cree_le),
  }
}

function embarquement(l: Ligne): Embarquement {
  return {
    id: String(l.id),
    traverseeId: String(l.traversee_id),
    reservationId: String(l.reservation_id),
    passagerId: String(l.passager_id),
    reference: String(l.reference),
    mode: l.mode as Embarquement["mode"],
    agent: String(l.agent),
    embarqueLe: iso(l.embarque_le),
  }
}

function scan(l: Ligne): ScanEmbarquement {
  return {
    id: String(l.id),
    traverseeId: String(l.traversee_id),
    reference: (l.reference ?? null) as string | null,
    resultat: l.resultat as ScanEmbarquement["resultat"],
    mode: l.mode as ScanEmbarquement["mode"],
    agent: String(l.agent),
    le: iso(l.le),
  }
}

/** Réservation lue en base, avec son origine (vraie réservation ou vente d'exemple). */
interface ReservationLue {
  reservation: Reservation
  exemple: boolean
}

function grouper<T>(elements: T[], cle: (e: T) => string): Map<string, T[]> {
  const groupes = new Map<string, T[]>()
  for (const e of elements) {
    const k = cle(e)
    const g = groupes.get(k)
    if (g) g.push(e)
    else groupes.set(k, [e])
  }
  return groupes
}

const COLONNES_TRAVERSEE =
  "id, ligne_id, navire_id, terminal_depart_id, terminal_arrivee_id, depart_at, arrivee_at, enregistrement_ouverture_at, enregistrement_fermeture_at, statut, capacite_vendable"

/** Référentiel gardé en mémoire par le serveur (il change rarement ; 9 requêtes à chaque lecture sinon). */
export interface MemoireReferentiel {
  dureeMs: number
  entree?: { valeur: Promise<Referentiel>; jusqua: number }
}

export class PostgresRepository implements Repository {
  constructor(
    private readonly sql: Sql,
    /** Contenus restés dans le code (textes, société, opérateurs…) et valeurs par défaut. */
    private readonly seed: Seed,
    /** Absente : le référentiel est relu à chaque fois (tests). */
    private readonly memoireReferentiel: MemoireReferentiel | null = null,
  ) {}

  /**
   * Transaction en base. Les traversées puis les paiements sont verrouillés dans l'ordre des identifiants
   * (deux transactions ne s'attendent jamais l'une l'autre en sens inverse). Le Repository passé à `travail`
   * écrit dans la transaction ; une erreur annule tout.
   */
  async transaction<R>(verrous: Verrous, travail: (repository: Repository) => Promise<R>): Promise<R> {
    return this.sql.transaction(async (sql) => {
      const traversees = [...new Set(verrous.traversees ?? [])].sort()
      const paiements = [...new Set(verrous.paiements ?? [])].sort()
      if (traversees.length > 0) {
        await sql.requete(`select id from traversees where id in ${DANS(1)} order by id for update`, [JSON.stringify(traversees)])
      }
      if (paiements.length > 0) {
        await sql.requete(`select id from paiements where id in ${DANS(1)} order by id for update`, [JSON.stringify(paiements)])
      }
      return travail(new PostgresRepository(sql, this.seed, this.memoireReferentiel))
    })
  }

  // Lectures internes ------------------------------------------------------

  /** Réservations (avec passagers et options) qui vérifient la condition donnée sur `r`. */
  private async reservations(condition: string, valeurs: unknown[]): Promise<ReservationLue[]> {
    const lignes = await this.sql.requete(`select r.* from reservations r where ${condition} order by r.cree_le, r.id`, valeurs)
    if (lignes.length === 0) return []
    const ids = JSON.stringify(lignes.map((l) => String(l.id)))
    const [passagers, options] = await Promise.all([
      this.sql.requete(
        `select reservation_id, id, categorie, nom, prenom, date_naissance::text as date_naissance, type_piece, numero_piece
         from passagers where reservation_id in ${DANS(1)} order by reservation_id, rang`,
        [ids],
      ),
      this.sql.requete(`select reservation_id, code, quantite, prix_unitaire from reservation_options where reservation_id in ${DANS(1)}`, [ids]),
    ])
    const parReservation = grouper(passagers, (p) => String(p.reservation_id))
    const optionsParReservation = grouper(options, (o) => String(o.reservation_id))
    return lignes.map((l) => ({
      exemple: Boolean(l.exemple),
      reservation: {
        id: String(l.id),
        commandeId: (l.commande_id ?? null) as string | null,
        reference: String(l.reference),
        traverseeId: String(l.traversee_id),
        familleCode: l.famille_code as CodeFamille,
        classeId: String(l.classe_id),
        statut: l.statut as Reservation["statut"],
        telephone: (l.telephone ?? null) as string | null,
        email: (l.email ?? null) as string | null,
        passagers: (parReservation.get(String(l.id)) ?? []).map(passager),
        prixUnitaires: { adulte: Number(l.prix_adulte), enfant: Number(l.prix_enfant), bebe: Number(l.prix_bebe) },
        options: (optionsParReservation.get(String(l.id)) ?? []).map(
          (o): LigneOption => ({ code: o.code as LigneOption["code"], quantite: Number(o.quantite), prixUnitaire: Number(o.prix_unitaire) }),
        ),
        total: Number(l.total),
        devise: "XAF",
        bloqueeJusquA: isoOuNull(l.bloquee_jusqu_a),
        canal: l.canal as Reservation["canal"],
        moyenPaiement: (l.moyen_paiement ?? null) as Reservation["moyenPaiement"],
        creeLe: iso(l.cree_le),
      },
    }))
  }

  /** Tout ce qu'il faut pour calculer l'état des ventes des traversées demandées (toutes si `ids` est absent). */
  private async etatVentes(ids?: string[]) {
    const filtre = ids ? ` where id in ${DANS(1)}` : ""
    const filtreTraversee = ids ? ` where traversee_id in ${DANS(1)}` : ""
    const valeurs = ids ? [JSON.stringify(ids)] : []
    const [traversees, classes, changements, reservations] = await Promise.all([
      this.sql.requete(`select ${COLONNES_TRAVERSEE} from traversees${filtre} order by depart_at`, valeurs),
      this.sql.requete(`select * from classes_reservation${filtreTraversee} order by traversee_id, famille_code, rang`, valeurs),
      this.sql.requete(`select * from changements_paliers${filtreTraversee} order by le`, valeurs),
      this.reservations(ids ? `r.traversee_id in ${DANS(1)}` : "true", valeurs),
    ])
    return {
      traversees: traversees.map(traversee),
      classes: grouper(classes.map(classe), (c) => c.traverseeId),
      changements: grouper(changements.map(changement), (c) => c.traverseeId),
      reservations: grouper(reservations, (r) => r.reservation.traverseeId),
    }
  }

  /** Occupation d'une traversée et ventes d'exemple retenues (même règle que DemoRepository). */
  private occupation(
    t: Traversee,
    classes: ClasseReservation[],
    changements: ChangementPalier[],
    lues: ReservationLue[],
    maintenant: Date,
  ): { occupation: Occupation; exemples: Reservation[]; reelles: Reservation[] } {
    const reelles = lues.filter((r) => !r.exemple).map((r) => r.reservation)
    const exemples = lues
      .filter((r) => r.exemple && palierOuvertA(changements, r.reservation.classeId, r.reservation.creeLe))
      .map((r) => r.reservation)
    const quotas = new Map(classes.map((c) => [c.id, c.quota]))
    const { occupation, secondairesRetenues } = occupationAvecPriorite(reelles, exemples, t.capaciteVendable, quotas, maintenant)
    return { occupation, exemples: secondairesRetenues, reelles }
  }

  private async reservationsRetenues(maintenant: Date, traverseeIds?: string[]): Promise<Reservation[]> {
    const etat = await this.etatVentes(traverseeIds)
    const resultat: Reservation[] = []
    const reelles: Reservation[] = []
    for (const t of etat.traversees) {
      const o = this.occupation(t, etat.classes.get(t.id) ?? [], etat.changements.get(t.id) ?? [], etat.reservations.get(t.id) ?? [], maintenant)
      resultat.push(...o.exemples)
      reelles.push(...o.reelles)
    }
    return [...resultat, ...reelles]
  }

  // Référentiel ------------------------------------------------------------

  async getReferentiel(): Promise<Referentiel> {
    const m = this.memoireReferentiel
    if (!m) return this.lireReferentiel()
    if (m.entree && m.entree.jusqua > Date.now()) return m.entree.valeur
    const entree = { valeur: this.lireReferentiel(), jusqua: Date.now() + m.dureeMs }
    m.entree = entree
    // Une lecture en échec n'est pas gardée.
    entree.valeur.catch(() => {
      entree.jusqua = 0
    })
    return entree.valeur
  }

  private async lireReferentiel(): Promise<Referentiel> {
    const s = this.seed
    const [ports, terminaux, lignes, navires, regles, familles, options, agences, config] = await Promise.all([
      this.sql.requete("select * from ports order by rang, id"),
      this.sql.requete("select * from terminaux order by rang, id"),
      this.sql.requete("select * from lignes order by rang, id"),
      this.sql.requete("select * from navires order by rang, id"),
      this.sql.requete("select * from regles_programme order by rang"),
      this.sql.requete("select * from familles_tarifaires order by rang"),
      this.sql.requete("select * from options_catalogue order by rang"),
      this.sql.requete("select * from agences order by rang"),
      this.sql.requete("select valeur from parametres where cle = 'config'"),
    ])
    const configuration = config[0] ? json<ConfigCommerciale>(config[0].valeur) : s.config
    return {
      config: configuration,
      ports: ports.map((l): Port => ({ id: String(l.id), code: l.code as Port["code"], nom: String(l.nom), ville: String(l.ville) })),
      terminaux: terminaux.map(
        (l): Terminal => ({
          id: String(l.id),
          portId: String(l.port_id),
          nom: String(l.nom),
          adresse: (l.adresse ?? null) as string | null,
          lienItineraire: (l.lien_itineraire ?? null) as string | null,
          actif: Boolean(l.actif),
        }),
      ),
      lignes: lignes.map((l): LigneMaritime => ({ id: String(l.id), portDepartId: String(l.port_depart_id), portArriveeId: String(l.port_arrivee_id) })),
      navires: navires.map(
        (l): Navire => ({
          id: String(l.id),
          nom: String(l.nom),
          type: String(l.type),
          capaciteTotale: Number(l.capacite_totale),
          capaciteVendable: Number(l.capacite_vendable),
          atouts: json<string[]>(l.atouts),
          photo: String(l.photo),
          bagageSouteKg: Number(l.bagage_soute_kg),
          bagageCabineKg: Number(l.bagage_cabine_kg),
        }),
      ),
      regles: regles.map(
        (l): RegleProgramme => ({
          ligneId: String(l.ligne_id),
          navireId: String(l.navire_id),
          terminalDepartId: String(l.terminal_depart_id),
          terminalArriveeId: String(l.terminal_arrivee_id),
          joursSemaine: json<number[]>(l.jours_semaine),
          enregistrement: String(l.enregistrement),
          depart: String(l.depart),
          arrivee: String(l.arrivee),
          fermetureEnregistrement: (l.fermeture_enregistrement ?? null) as string | null,
        }),
      ),
      familles: familles.map(
        (l): FamilleTarifaire => ({
          id: String(l.id),
          code: l.code as CodeFamille,
          nom: String(l.nom),
          modifiable: Boolean(l.modifiable),
          remboursable: Boolean(l.remboursable),
          fraisModif: l.frais_modif === null ? null : Number(l.frais_modif),
          delaiModifH: l.delai_modif_h === null ? null : Number(l.delai_modif_h),
          avantages: json<string[]>(l.avantages),
        }),
      ),
      options: options.map(
        (l): OptionCatalogue => ({
          code: l.code as OptionCatalogue["code"],
          libelle: String(l.libelle),
          detail: String(l.detail),
          prix: Number(l.prix),
          familles: json<CodeFamille[]>(l.familles),
          quantiteMax: Number(l.quantite_max),
        }),
      ),
      agences: agences.map((l): Agence => ({ id: String(l.id), ville: String(l.ville), telephones: json<string[]>(l.telephones) })),
      operateurs: s.operateurs.filter((o) => configuration.moyensPaiementActifs[o.code]),
      textes: s.textes,
      paiementSimule: s.paiementSimule,
      societe: s.societe,
      rubriquesAide: s.rubriquesAide,
    }
  }

  async getInfosTrafic(maintenant: Date): Promise<InfoTrafic[]> {
    const lignes = await this.sql.requete(
      "select * from infos_trafic where actif and debut_at <= $1::timestamptz and fin_at >= $1::timestamptz order by debut_at",
      [maintenant.toISOString()],
    )
    return lignes.map((l) => ({
      id: String(l.id),
      message: String(l.message),
      lien: (l.lien ?? null) as string | null,
      libelleLien: (l.libelle_lien ?? null) as string | null,
      niveau: l.niveau as InfoTrafic["niveau"],
      debutAt: iso(l.debut_at),
      finAt: iso(l.fin_at),
      actif: Boolean(l.actif),
    }))
  }

  // Traversées et ventes ---------------------------------------------------

  async listerTraversees(filtre: FiltreTraversees = {}): Promise<Traversee[]> {
    const conditions: string[] = []
    const valeurs: unknown[] = []
    if (filtre.ligneId) {
      valeurs.push(filtre.ligneId)
      conditions.push(`ligne_id = $${valeurs.length}`)
    }
    // Tri grossier en SQL (un jour de marge), puis filtre exact sur le jour de départ local, comme la démo.
    if (filtre.du) {
      valeurs.push(new Date(Date.parse(`${filtre.du}T00:00:00Z`) - MS_JOUR).toISOString())
      conditions.push(`depart_at >= $${valeurs.length}::timestamptz`)
    }
    if (filtre.au) {
      valeurs.push(new Date(Date.parse(`${filtre.au}T00:00:00Z`) + 2 * MS_JOUR).toISOString())
      conditions.push(`depart_at < $${valeurs.length}::timestamptz`)
    }
    const where = conditions.length ? ` where ${conditions.join(" and ")}` : ""
    const lignes = await this.sql.requete(`select ${COLONNES_TRAVERSEE} from traversees${where} order by depart_at`, valeurs)
    return lignes.map(traversee).filter((t) => {
      const jour = jourDeDepart(t)
      return (!filtre.du || jour >= filtre.du) && (!filtre.au || jour <= filtre.au)
    })
  }

  async getTraversee(id: string): Promise<Traversee | null> {
    const [l] = await this.sql.requete(`select ${COLONNES_TRAVERSEE} from traversees where id = $1`, [id])
    return l ? traversee(l) : null
  }

  async listerInventaires(traverseeIds: string[], maintenant: Date): Promise<Inventaire[]> {
    if (traverseeIds.length === 0) return []
    const etat = await this.etatVentes(traverseeIds)
    return etat.traversees.map((t) => {
      const classes = etat.classes.get(t.id) ?? []
      const changements = etat.changements.get(t.id) ?? []
      const { occupation } = this.occupation(t, classes, changements, etat.reservations.get(t.id) ?? [], maintenant)
      return {
        traversee: t,
        classes: appliquerChangements(classes, changements),
        occupation,
        placesRestantes: placesRestantesTraversee(t.capaciteVendable, occupation),
      }
    })
  }

  async repartitionParFamille(maintenant: Date): Promise<Record<CodeFamille, number>> {
    const repartition: Record<CodeFamille, number> = { ECO: 0, VIP: 0 }
    for (const r of await this.reservationsRetenues(maintenant)) {
      if (estVendue(r, maintenant)) repartition[r.familleCode] += placesNecessaires(compositionDe(r.passagers))
    }
    return repartition
  }

  async listerReservations(maintenant: Date, filtre: { traverseeIds?: string[] } = {}): Promise<Reservation[]> {
    return this.reservationsRetenues(maintenant, filtre.traverseeIds)
  }

  async listerChangementsPaliers(traverseeId?: string): Promise<ChangementPalier[]> {
    const lignes = traverseeId
      ? await this.sql.requete("select * from changements_paliers where traversee_id = $1 order by le", [traverseeId])
      : await this.sql.requete("select * from changements_paliers order by le")
    return lignes.map(changement)
  }

  async enregistrerChangementPalier(c: ChangementPalier): Promise<void> {
    await this.sql.requete(
      `insert into changements_paliers (id, traversee_id, classe_id, ouverte, motif, auteur, le)
       values ($1, $2, $3, $4, $5, $6, $7::timestamptz)
       on conflict (id) do update set ouverte = excluded.ouverte, motif = excluded.motif, auteur = excluded.auteur, le = excluded.le`,
      [c.id, c.traverseeId, c.classeId, c.ouverte, c.motif, c.auteur, c.le],
    )
  }

  async getParametresGestion(): Promise<ParametresGestion> {
    const [l] = await this.sql.requete("select valeur from parametres where cle = 'gestion'")
    return l ? json<ParametresGestion>(l.valeur) : this.seed.gestion.parametres
  }

  // Embarquement -----------------------------------------------------------

  async listerEmbarquements(traverseeId: string): Promise<Embarquement[]> {
    const lignes = await this.sql.requete("select * from embarquements where traversee_id = $1 order by embarque_le, id", [traverseeId])
    return lignes.map(embarquement)
  }

  async enregistrerEmbarquements(embarquements: Embarquement[]): Promise<void> {
    if (embarquements.length === 0) return
    // Un passager déjà à bord (même traversée) est ignoré : c'est la contrainte unique qui tranche.
    await this.sql.requete(
      `insert into embarquements (id, traversee_id, reservation_id, passager_id, reference, mode, agent, embarque_le)
       select id, traversee_id, reservation_id, passager_id, reference, mode, agent, embarque_le
       from jsonb_to_recordset($1::text::jsonb) as x(id text, traversee_id text, reservation_id text, passager_id text,
         reference text, mode text, agent text, embarque_le timestamptz)
       on conflict do nothing`,
      [
        JSON.stringify(
          embarquements.map((e) => ({
            id: e.id,
            traversee_id: e.traverseeId,
            reservation_id: e.reservationId,
            passager_id: e.passagerId,
            reference: e.reference,
            mode: e.mode,
            agent: e.agent,
            embarque_le: e.embarqueLe,
          })),
        ),
      ],
    )
  }

  async supprimerEmbarquement(id: string): Promise<void> {
    await this.sql.requete("delete from embarquements where id = $1", [id])
  }

  async listerScans(traverseeId: string): Promise<ScanEmbarquement[]> {
    const lignes = await this.sql.requete("select * from scans_embarquement where traversee_id = $1 order by le, id", [traverseeId])
    return lignes.map(scan)
  }

  async enregistrerScan(s: ScanEmbarquement): Promise<void> {
    await this.sql.requete(
      `insert into scans_embarquement (id, traversee_id, reference, resultat, mode, agent, le)
       values ($1, $2, $3, $4, $5, $6, $7::timestamptz) on conflict (id) do nothing`,
      [s.id, s.traverseeId, s.reference, s.resultat, s.mode, s.agent, s.le],
    )
  }

  async getClotureEmbarquement(traverseeId: string): Promise<ClotureEmbarquement | null> {
    const [l] = await this.sql.requete("select * from clotures_embarquement where traversee_id = $1", [traverseeId])
    return l ? { traverseeId: String(l.traversee_id), agent: String(l.agent), le: iso(l.le) } : null
  }

  async definirClotureEmbarquement(traverseeId: string, cloture: ClotureEmbarquement | null): Promise<void> {
    await this.sql.transaction(async (sql) => {
      await sql.requete("delete from clotures_embarquement where traversee_id = $1", [traverseeId])
      if (cloture) {
        await sql.requete("insert into clotures_embarquement (traversee_id, agent, le) values ($1, $2, $3::timestamptz)", [
          traverseeId,
          cloture.agent,
          cloture.le,
        ])
      }
    })
  }

  // Réservations, commandes, paiements --------------------------------------

  async getReservation(id: string): Promise<Reservation | null> {
    return (await this.reservations("r.id = $1", [id]))[0]?.reservation ?? null
  }

  async trouverReservationParReference(reference: string): Promise<Reservation | null> {
    if (!reference) return null
    return (await this.reservations("r.reference = $1", [reference]))[0]?.reservation ?? null
  }

  async referenceExiste(reference: string): Promise<boolean> {
    if (!reference) return false
    return (await this.sql.requete("select 1 from reservations where reference = $1", [reference])).length > 0
  }

  /** Crée ou remplace une réservation (une vente d'exemple garde son marquage). */
  async enregistrerReservation(r: Reservation): Promise<void> {
    await this.sql.transaction(async (sql) => {
      await sql.requete(
        `insert into reservations (id, commande_id, reference, traversee_id, famille_code, classe_id, statut, telephone, email,
           prix_adulte, prix_enfant, prix_bebe, total, bloquee_jusqu_a, canal, moyen_paiement, cree_le)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::timestamptz, $15, $16, $17::timestamptz)
         on conflict (id) do update set commande_id = excluded.commande_id, reference = excluded.reference,
           traversee_id = excluded.traversee_id, famille_code = excluded.famille_code, classe_id = excluded.classe_id,
           statut = excluded.statut, telephone = excluded.telephone, email = excluded.email,
           prix_adulte = excluded.prix_adulte, prix_enfant = excluded.prix_enfant, prix_bebe = excluded.prix_bebe,
           total = excluded.total, bloquee_jusqu_a = excluded.bloquee_jusqu_a, canal = excluded.canal,
           moyen_paiement = excluded.moyen_paiement, cree_le = excluded.cree_le`,
        [
          r.id,
          r.commandeId,
          r.reference,
          r.traverseeId,
          r.familleCode,
          r.classeId,
          r.statut,
          r.telephone,
          r.email,
          r.prixUnitaires.adulte,
          r.prixUnitaires.enfant,
          r.prixUnitaires.bebe,
          r.total,
          r.bloqueeJusquA,
          r.canal,
          r.moyenPaiement,
          r.creeLe,
        ],
      )
      // Passagers : mis à jour sur place (un passager déjà embarqué garde son embarquement).
      const ids = JSON.stringify(r.passagers.map((p) => p.id))
      await sql.requete(`delete from passagers where reservation_id = $1 and id not in ${DANS(2)}`, [r.id, ids])
      if (r.passagers.length > 0) {
        await sql.requete(
          `insert into passagers (reservation_id, id, rang, categorie, nom, prenom, date_naissance, type_piece, numero_piece)
           select $1, id, rang, categorie, nom, prenom, date_naissance, type_piece, numero_piece
           from jsonb_to_recordset($2::text::jsonb) as x(id text, rang integer, categorie text, nom text, prenom text,
             date_naissance date, type_piece text, numero_piece text)
           on conflict (reservation_id, id) do update set rang = excluded.rang, categorie = excluded.categorie,
             nom = excluded.nom, prenom = excluded.prenom, date_naissance = excluded.date_naissance,
             type_piece = excluded.type_piece, numero_piece = excluded.numero_piece`,
          [
            r.id,
            JSON.stringify(
              r.passagers.map((p, rang) => ({
                id: p.id,
                rang,
                categorie: p.categorie,
                nom: p.nom,
                prenom: p.prenom,
                date_naissance: p.dateNaissance,
                type_piece: p.typePiece,
                numero_piece: p.numeroPiece,
              })),
            ),
          ],
        )
      }
      await sql.requete("delete from reservation_options where reservation_id = $1", [r.id])
      if (r.options.length > 0) {
        await sql.requete(
          `insert into reservation_options (reservation_id, code, quantite, prix_unitaire)
           select $1, code, quantite, prix_unitaire from jsonb_to_recordset($2::text::jsonb) as x(code text, quantite integer, prix_unitaire integer)`,
          [r.id, JSON.stringify(r.options.map((o) => ({ code: o.code, quantite: o.quantite, prix_unitaire: o.prixUnitaire })))],
        )
      }
    })
  }

  /** Côté serveur : les vraies réservations faites sur le site (par opposition aux ventes d'exemple). */
  async listerReservationsLocales(): Promise<Reservation[]> {
    return (await this.reservations("not r.exemple", [])).map((r) => r.reservation)
  }

  async getCommande(id: string): Promise<Commande | null> {
    const [l] = await this.sql.requete("select * from commandes where id = $1", [id])
    if (!l) return null
    const ids = await this.sql.requete("select id from reservations where commande_id = $1 order by rang_commande, cree_le", [id])
    return commande(
      l,
      ids.map((x) => String(x.id)),
    )
  }

  async enregistrerCommande(c: Commande): Promise<void> {
    await this.sql.transaction(async (sql) => {
      await sql.requete(
        `insert into commandes (id, telephone, email, statut, total, numero_facture, facture_emise_le, client_id, cree_le)
         values ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8, $9::timestamptz)
         on conflict (id) do update set telephone = excluded.telephone, email = excluded.email, statut = excluded.statut,
           total = excluded.total, numero_facture = excluded.numero_facture, facture_emise_le = excluded.facture_emise_le,
           client_id = excluded.client_id`,
        [c.id, c.telephone, c.email, c.statut, c.total, c.numeroFacture, c.factureEmiseLe, c.clientId, c.creeLe],
      )
      // Ordre aller / retour, pour les réservations déjà enregistrées.
      for (const [rang, reservationId] of c.reservationIds.entries()) {
        await sql.requete("update reservations set commande_id = $1, rang_commande = $2 where id = $3", [c.id, rang, reservationId])
      }
    })
  }

  /** Numéro suivant, sans trou : la ligne de l'année est verrouillée jusqu'à la fin de la transaction. */
  async prochainNumeroFacture(annee: number): Promise<string> {
    const [l] = await this.sql.requete<{ dernier: number }>(
      `insert into compteurs_factures (annee, dernier) values ($1, 1)
       on conflict (annee) do update set dernier = compteurs_factures.dernier + 1
       returning dernier`,
      [annee],
    )
    return `${this.seed.societe.prefixeFacture}-${annee}-${String(l.dernier).padStart(6, "0")}`
  }

  async getPaiement(id: string): Promise<Paiement | null> {
    const [l] = await this.sql.requete("select * from paiements where id = $1", [id])
    return l ? paiement(l) : null
  }

  async trouverPaiementParTransaction(refTransaction: string): Promise<Paiement | null> {
    const [l] = await this.sql.requete("select * from paiements where ref_transaction = $1", [refTransaction])
    return l ? paiement(l) : null
  }

  async listerPaiements(commandeId: string): Promise<Paiement[]> {
    const lignes = await this.sql.requete("select * from paiements where commande_id = $1 order by cree_le, id", [commandeId])
    return lignes.map(paiement)
  }

  async enregistrerPaiement(p: Paiement): Promise<void> {
    await this.sql.requete(
      `insert into paiements (id, commande_id, moyen, numero, montant, statut, ref_transaction, ref_operateur, cree_le, maj_le)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz)
       on conflict (id) do update set statut = excluded.statut, ref_operateur = excluded.ref_operateur, maj_le = excluded.maj_le,
         numero = excluded.numero, montant = excluded.montant`,
      [p.id, p.commandeId, p.moyen, p.numero, p.montant, p.statut, p.refTransaction, p.refOperateur, p.creeLe, p.majLe],
    )
  }

  async getEnvoi(id: string): Promise<Envoi | null> {
    const [l] = await this.sql.requete("select * from envois where id = $1", [id])
    return l ? envoi(l) : null
  }

  async listerEnvois(filtre: { commandeId?: string; clientId?: string }): Promise<Envoi[]> {
    const lignes = await this.sql.requete(
      `select * from envois where ($1::text is null or commande_id = $1) and ($2::text is null or client_id = $2) order by cree_le, id`,
      [filtre.commandeId ?? null, filtre.clientId ?? null],
    )
    return lignes.map(envoi)
  }

  async enregistrerEnvoi(e: Envoi): Promise<void> {
    await this.sql.requete(
      `insert into envois (id, commande_id, client_id, canal, destinataire, objet, texte, pieces, statut, tentatives, erreur, cree_le)
       values ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb, $9, $10, $11, $12::timestamptz)
       on conflict (id) do update set statut = excluded.statut, tentatives = excluded.tentatives, erreur = excluded.erreur`,
      [e.id, e.commandeId, e.clientId, e.canal, e.destinataire, e.objet, e.texte, JSON.stringify(e.pieces), e.statut, e.tentatives, e.erreur, e.creeLe],
    )
  }

  // Comptes clients : étape ultérieure du plan (ils restent sur l'appareil). -----

  private pasEncore(): never {
    throw new Error("Comptes clients : pas encore dans la base (docs/PLAN_BASE_DE_DONNEES.md).")
  }

  async getClient(): Promise<Client | null> {
    return null
  }

  async trouverClient(): Promise<Client | null> {
    return null
  }

  async enregistrerClient(): Promise<void> {
    this.pasEncore()
  }

  async supprimerClient(): Promise<void> {
    this.pasEncore()
  }

  async enregistrerCode(): Promise<void> {
    this.pasEncore()
  }

  async dernierCode(): Promise<CodeVerification | null> {
    return null
  }

  async supprimerCodes(): Promise<void> {}

  /** Billet d'exemple pour la démo de « Mes billets » (même choix que DemoRepository). */
  async exempleBillet(maintenant: Date): Promise<{ reference: string; contact: string } | null> {
    const [l] = await this.sql.requete(
      `select r.reference, r.telephone from reservations r join traversees t on t.id = r.traversee_id
       where r.exemple and r.telephone is not null and r.cree_le <= $1::timestamptz and t.depart_at > $2::timestamptz
       order by t.depart_at, r.cree_le, r.id limit 1`,
      [maintenant.toISOString(), new Date(maintenant.getTime() + MS_JOUR).toISOString()],
    )
    return l ? { reference: String(l.reference), contact: String(l.telephone) } : null
  }
}
