/**
 * Migrations du schéma, appliquées dans l'ordre et une seule fois chacune.
 * Le suivi est dans la table schema_migrations. Ajouter une migration = ajouter une entrée à la fin.
 */
import { schemaInitial } from "./migrations/0001-schema-initial"
import type { Sql } from "./sql"

export interface Migration {
  version: string
  description: string
  script: string
}

export const MIGRATIONS: Migration[] = [{ version: "0001", description: "Schéma initial", script: schemaInitial }]

export interface EtatMigration {
  version: string
  description: string
  appliqueeLe: string | null
}

const SUIVI = /* sql */ `
create table if not exists schema_migrations (
  version text primary key,
  description text not null,
  appliquee_le timestamptz not null default now()
);
alter table schema_migrations enable row level security;
`

export async function etatMigrations(sql: Sql): Promise<EtatMigration[]> {
  await sql.executer(SUIVI)
  const faites = await sql.requete<{ version: string; appliquee_le: Date | string }>(
    "select version, appliquee_le from schema_migrations",
  )
  const dates = new Map(faites.map((f) => [f.version, new Date(f.appliquee_le).toISOString()]))
  return MIGRATIONS.map((m) => ({ version: m.version, description: m.description, appliqueeLe: dates.get(m.version) ?? null }))
}

/** Applique les migrations manquantes, chacune dans sa transaction ; renvoie les versions appliquées. */
export async function appliquerMigrations(sql: Sql): Promise<string[]> {
  const etat = await etatMigrations(sql)
  const appliquees: string[] = []
  for (const migration of MIGRATIONS) {
    if (etat.find((e) => e.version === migration.version)?.appliqueeLe) continue
    await sql.transaction(async (tx) => {
      // Verrou : deux appels simultanés n'appliquent pas deux fois la même migration.
      await tx.requete("lock table schema_migrations in exclusive mode")
      const deja = await tx.requete("select 1 from schema_migrations where version = $1", [migration.version])
      if (deja.length > 0) return
      await tx.executer(migration.script)
      await tx.requete("insert into schema_migrations (version, description) values ($1, $2)", [
        migration.version,
        migration.description,
      ])
      appliquees.push(migration.version)
    })
  }
  return appliquees
}
