/**
 * Chargement des données d'exemple dans la base, depuis data/seed (mêmes données que la démo).
 * - Référentiel et traversées : créés ou mis à jour.
 * - Ventes d'exemple (exemple = true) : supprimées puis recréées.
 * - Vraies réservations, changements de paliers, embarquements des vraies réservations : intacts.
 */
import type { Seed } from "@/data/seed"
import { construireDonneesDemo } from "../repository/demo-repository"
import type { Sql } from "./sql"

type Colonne = readonly [nom: string, type: string]

/** Insertion de nombreuses lignes en une requête par paquet (jsonb_to_recordset). */
async function inserer(
  sql: Sql,
  table: string,
  colonnes: readonly Colonne[],
  lignes: Record<string, unknown>[],
  conflit?: { cle: string[]; mettreAJour: boolean },
): Promise<void> {
  const noms = colonnes.map(([nom]) => nom)
  const definition = colonnes.map(([nom, type]) => `${nom} ${type}`).join(", ")
  let suite = ""
  if (conflit) {
    const maj = noms.filter((n) => !conflit.cle.includes(n))
    suite =
      conflit.mettreAJour && maj.length > 0
        ? ` on conflict (${conflit.cle.join(", ")}) do update set ${maj.map((n) => `${n} = excluded.${n}`).join(", ")}`
        : ` on conflict (${conflit.cle.join(", ")}) do nothing`
  }
  for (let i = 0; i < lignes.length; i += 1000) {
    const paquet = lignes.slice(i, i + 1000)
    await sql.requete(
      `insert into ${table} (${noms.join(", ")}) select ${noms.join(", ")} from jsonb_to_recordset($1::text::jsonb) as x(${definition})${suite}`,
      [JSON.stringify(paquet)],
    )
  }
}

export interface BilanChargement {
  traversees: number
  paliers: number
  ventesExemple: number
  passagersExemple: number
}

export async function chargerExemples(base: Sql, seed: Seed): Promise<BilanChargement> {
  const donnees = construireDonneesDemo(seed)
  const classes = [...donnees.classesParTraversee.values()].flat()

  await base.transaction(async (sql) => {
    // Référentiel
    await inserer(sql, "ports", [["id", "text"], ["rang", "integer"], ["code", "text"], ["nom", "text"], ["ville", "text"]], seed.ports.map((p, rang) => ({ ...p, rang })), {
      cle: ["id"],
      mettreAJour: true,
    })
    await inserer(
      sql,
      "terminaux",
      [["id", "text"], ["rang", "integer"], ["port_id", "text"], ["nom", "text"], ["adresse", "text"], ["lien_itineraire", "text"], ["actif", "boolean"]],
      seed.terminaux.map((t, rang) => ({ id: t.id, rang, port_id: t.portId, nom: t.nom, adresse: t.adresse, lien_itineraire: t.lienItineraire, actif: t.actif })),
      { cle: ["id"], mettreAJour: true },
    )
    await inserer(
      sql,
      "navires",
      [
        ["id", "text"],
        ["rang", "integer"],
        ["nom", "text"],
        ["type", "text"],
        ["capacite_totale", "integer"],
        ["capacite_vendable", "integer"],
        ["atouts", "jsonb"],
        ["photo", "text"],
        ["bagage_soute_kg", "integer"],
        ["bagage_cabine_kg", "integer"],
      ],
      seed.navires.map((n, rang) => ({
        id: n.id,
        rang,
        nom: n.nom,
        type: n.type,
        capacite_totale: n.capaciteTotale,
        capacite_vendable: n.capaciteVendable,
        atouts: n.atouts,
        photo: n.photo,
        bagage_soute_kg: n.bagageSouteKg,
        bagage_cabine_kg: n.bagageCabineKg,
      })),
      { cle: ["id"], mettreAJour: true },
    )
    await inserer(
      sql,
      "lignes",
      [["id", "text"], ["rang", "integer"], ["port_depart_id", "text"], ["port_arrivee_id", "text"]],
      seed.lignes.map((l, rang) => ({ id: l.id, rang, port_depart_id: l.portDepartId, port_arrivee_id: l.portArriveeId })),
      { cle: ["id"], mettreAJour: true },
    )
    await sql.requete("delete from regles_programme")
    await inserer(
      sql,
      "regles_programme",
      [
        ["rang", "integer"],
        ["ligne_id", "text"],
        ["navire_id", "text"],
        ["terminal_depart_id", "text"],
        ["terminal_arrivee_id", "text"],
        ["jours_semaine", "jsonb"],
        ["enregistrement", "text"],
        ["depart", "text"],
        ["arrivee", "text"],
        ["fermeture_enregistrement", "text"],
      ],
      seed.regles.map((r, rang) => ({
        rang,
        ligne_id: r.ligneId,
        navire_id: r.navireId,
        terminal_depart_id: r.terminalDepartId,
        terminal_arrivee_id: r.terminalArriveeId,
        jours_semaine: r.joursSemaine,
        enregistrement: r.enregistrement,
        depart: r.depart,
        arrivee: r.arrivee,
        fermeture_enregistrement: r.fermetureEnregistrement,
      })),
    )
    await inserer(
      sql,
      "familles_tarifaires",
      [
        ["code", "text"],
        ["id", "text"],
        ["rang", "integer"],
        ["nom", "text"],
        ["modifiable", "boolean"],
        ["remboursable", "boolean"],
        ["frais_modif", "integer"],
        ["delai_modif_h", "integer"],
        ["avantages", "jsonb"],
      ],
      seed.familles.map((f, rang) => ({
        code: f.code,
        id: f.id,
        rang,
        nom: f.nom,
        modifiable: f.modifiable,
        remboursable: f.remboursable,
        frais_modif: f.fraisModif,
        delai_modif_h: f.delaiModifH,
        avantages: f.avantages,
      })),
      { cle: ["code"], mettreAJour: true },
    )
    await sql.requete("delete from grille_paliers")
    await inserer(
      sql,
      "grille_paliers",
      [["famille_code", "text"], ["rang", "integer"], ["prix_adulte", "integer"], ["prix_enfant", "integer"], ["prix_bebe", "integer"], ["quota", "integer"]],
      seed.grille.map((p) => ({
        famille_code: p.familleCode,
        rang: p.rang,
        prix_adulte: p.prix.adulte,
        prix_enfant: p.prix.enfant,
        prix_bebe: p.prix.bebe,
        quota: p.quota,
      })),
    )
    await inserer(
      sql,
      "options_catalogue",
      [["code", "text"], ["rang", "integer"], ["libelle", "text"], ["detail", "text"], ["prix", "integer"], ["familles", "jsonb"], ["quantite_max", "integer"]],
      seed.options.map((o, rang) => ({ code: o.code, rang, libelle: o.libelle, detail: o.detail, prix: o.prix, familles: o.familles, quantite_max: o.quantiteMax })),
      { cle: ["code"], mettreAJour: true },
    )
    await sql.requete("delete from agences")
    await inserer(
      sql,
      "agences",
      [["id", "text"], ["rang", "integer"], ["ville", "text"], ["telephones", "jsonb"]],
      seed.agences.map((a, rang) => ({ id: a.id, rang, ville: a.ville, telephones: a.telephones })),
    )
    await sql.requete("delete from infos_trafic")
    await inserer(
      sql,
      "infos_trafic",
      [
        ["id", "text"],
        ["message", "text"],
        ["lien", "text"],
        ["libelle_lien", "text"],
        ["niveau", "text"],
        ["debut_at", "timestamptz"],
        ["fin_at", "timestamptz"],
        ["actif", "boolean"],
      ],
      seed.infosTrafic.map((i) => ({
        id: i.id,
        message: i.message,
        lien: i.lien,
        libelle_lien: i.libelleLien,
        niveau: i.niveau,
        debut_at: i.debutAt,
        fin_at: i.finAt,
        actif: i.actif,
      })),
    )
    await inserer(
      sql,
      "parametres",
      [["cle", "text"], ["valeur", "jsonb"]],
      [
        { cle: "config", valeur: seed.config },
        { cle: "gestion", valeur: seed.gestion.parametres },
      ],
      { cle: ["cle"], mettreAJour: true },
    )

    // Traversées et paliers
    await inserer(
      sql,
      "traversees",
      [
        ["id", "text"],
        ["ligne_id", "text"],
        ["navire_id", "text"],
        ["terminal_depart_id", "text"],
        ["terminal_arrivee_id", "text"],
        ["depart_at", "timestamptz"],
        ["arrivee_at", "timestamptz"],
        ["enregistrement_ouverture_at", "timestamptz"],
        ["enregistrement_fermeture_at", "timestamptz"],
        ["statut", "text"],
        ["capacite_vendable", "integer"],
      ],
      donnees.traversees.map((t) => ({
        id: t.id,
        ligne_id: t.ligneId,
        navire_id: t.navireId,
        terminal_depart_id: t.terminalDepartId,
        terminal_arrivee_id: t.terminalArriveeId,
        depart_at: t.departAt,
        arrivee_at: t.arriveeAt,
        enregistrement_ouverture_at: t.enregistrementOuvertureAt,
        enregistrement_fermeture_at: t.enregistrementFermetureAt,
        statut: t.statut,
        capacite_vendable: t.capaciteVendable,
      })),
      { cle: ["id"], mettreAJour: true },
    )
    await inserer(
      sql,
      "classes_reservation",
      [
        ["id", "text"],
        ["traversee_id", "text"],
        ["famille_code", "text"],
        ["rang", "integer"],
        ["prix_adulte", "integer"],
        ["prix_enfant", "integer"],
        ["prix_bebe", "integer"],
        ["quota", "integer"],
      ],
      classes.map((c) => ({
        id: c.id,
        traversee_id: c.traverseeId,
        famille_code: c.familleCode,
        rang: c.rang,
        prix_adulte: c.prix.adulte,
        prix_enfant: c.prix.enfant,
        prix_bebe: c.prix.bebe,
        quota: c.quota,
      })),
      { cle: ["id"], mettreAJour: true },
    )

    // Ventes d'exemple : remplacées en entier (leurs passagers et options suivent par cascade).
    await sql.requete("delete from reservations where exemple")
    await inserer(
      sql,
      "reservations",
      [
        ["id", "text"],
        ["reference", "text"],
        ["traversee_id", "text"],
        ["famille_code", "text"],
        ["classe_id", "text"],
        ["statut", "text"],
        ["telephone", "text"],
        ["email", "text"],
        ["prix_adulte", "integer"],
        ["prix_enfant", "integer"],
        ["prix_bebe", "integer"],
        ["total", "integer"],
        ["bloquee_jusqu_a", "timestamptz"],
        ["canal", "text"],
        ["moyen_paiement", "text"],
        ["cree_le", "timestamptz"],
        ["exemple", "boolean"],
      ],
      donnees.ventes.map((r) => ({
        id: r.id,
        reference: r.reference,
        traversee_id: r.traverseeId,
        famille_code: r.familleCode,
        classe_id: r.classeId,
        statut: r.statut,
        telephone: r.telephone,
        email: r.email,
        prix_adulte: r.prixUnitaires.adulte,
        prix_enfant: r.prixUnitaires.enfant,
        prix_bebe: r.prixUnitaires.bebe,
        total: r.total,
        bloquee_jusqu_a: r.bloqueeJusquA,
        canal: r.canal,
        moyen_paiement: r.moyenPaiement,
        cree_le: r.creeLe,
        exemple: true,
      })),
    )
    await inserer(
      sql,
      "passagers",
      [
        ["reservation_id", "text"],
        ["id", "text"],
        ["rang", "integer"],
        ["categorie", "text"],
        ["nom", "text"],
        ["prenom", "text"],
        ["date_naissance", "date"],
        ["type_piece", "text"],
        ["numero_piece", "text"],
      ],
      donnees.ventes.flatMap((r) =>
        r.passagers.map((p, rang) => ({
          reservation_id: r.id,
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
    )
    await inserer(
      sql,
      "reservation_options",
      [["reservation_id", "text"], ["code", "text"], ["quantite", "integer"], ["prix_unitaire", "integer"]],
      donnees.ventes.flatMap((r) => r.options.map((o) => ({ reservation_id: r.id, code: o.code, quantite: o.quantite, prix_unitaire: o.prixUnitaire }))),
    )
  })

  return {
    traversees: donnees.traversees.length,
    paliers: classes.length,
    ventesExemple: donnees.ventes.length,
    passagersExemple: donnees.ventes.reduce((s, r) => s + r.passagers.length, 0),
  }
}
