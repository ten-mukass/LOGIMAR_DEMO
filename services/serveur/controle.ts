/**
 * Contrôle de la base, pour la page réservée à la Preview : état des migrations, nombre de lignes,
 * et comparaison des ventes lues dans la base avec celles de la démo.
 */
import { seed } from "@/data/seed"
import { jourDeDepart } from "@/domain/programme"
import { DemoRepository } from "../repository/demo-repository"
import type { Inventaire } from "../repository/repository"
import { PostgresRepository } from "../repository/postgres-repository"
import { stockageMemoire } from "../stockage"
import { etatMigrations, type EtatMigration } from "./migrations"
import type { Sql } from "./sql"

/** La page de contrôle n'existe que sur les Previews Vercel (protégées par la connexion Vercel) et en développement. */
export function accesControleBase(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "preview"
  return process.env.NODE_ENV === "development"
}

const TABLES = [
  "traversees",
  "classes_reservation",
  "reservations",
  "passagers",
  "changements_paliers",
  "commandes",
  "paiements",
  "embarquements",
  "scans_embarquement",
] as const

export interface LigneComparaison {
  id: string
  jour: string
  placesBase: number
  placesDemo: number
  identique: boolean
}

export interface EtatBase {
  migrations: EtatMigration[]
  comptes: { table: string; lignes: number }[]
  ventesExemple: number
  vraiesReservations: number
  comparaison: LigneComparaison[]
}

function cle(i: Inventaire): string {
  return JSON.stringify({ classes: i.classes, occupation: i.occupation, placesRestantes: i.placesRestantes })
}

export async function etatBase(sql: Sql, maintenant: Date, jours = 14): Promise<EtatBase> {
  const migrations = await etatMigrations(sql)
  if (migrations.some((m) => m.appliqueeLe === null)) {
    return { migrations, comptes: [], ventesExemple: 0, vraiesReservations: 0, comparaison: [] }
  }
  const comptes = await Promise.all(
    TABLES.map(async (table) => {
      const [l] = await sql.requete<{ n: number }>(`select count(*)::integer as n from ${table}`)
      return { table, lignes: Number(l.n) }
    }),
  )
  const [origines] = await sql.requete<{ exemples: number; reelles: number }>(
    "select count(*) filter (where exemple)::integer as exemples, count(*) filter (where not exemple)::integer as reelles from reservations",
  )

  const base = new PostgresRepository(sql, seed)
  const demo = new DemoRepository(seed, stockageMemoire())
  const du = maintenant.toISOString().slice(0, 10)
  const au = new Date(maintenant.getTime() + jours * 86_400_000).toISOString().slice(0, 10)
  const ids = (await demo.listerTraversees({ du, au })).map((t) => t.id)
  const [b, d] = await Promise.all([base.listerInventaires(ids, maintenant), demo.listerInventaires(ids, maintenant)])
  const parId = new Map(b.map((i) => [i.traversee.id, i]))
  const comparaison = d.map((i): LigneComparaison => {
    const enBase = parId.get(i.traversee.id)
    return {
      id: i.traversee.id,
      jour: jourDeDepart(i.traversee),
      placesBase: enBase?.placesRestantes ?? -1,
      placesDemo: i.placesRestantes,
      identique: enBase !== undefined && cle(enBase) === cle(i),
    }
  })
  return { migrations, comptes, ventesExemple: Number(origines.exemples), vraiesReservations: Number(origines.reelles), comparaison }
}
