/**
 * Adaptateur PGlite (PostgreSQL dans le processus) : tests seulement, jamais importé par l'application.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite"
import type { Ligne, Sql } from "./sql"

function adapter(db: PGlite | Transaction, racine: PGlite | null): Sql {
  return {
    async requete<T extends Ligne = Ligne>(texte: string, valeurs: unknown[] = []) {
      return (await db.query<T>(texte, valeurs)).rows
    },
    async executer(script: string) {
      await db.exec(script)
    },
    async transaction<R>(travail: (sql: Sql) => Promise<R>): Promise<R> {
      // Transaction imbriquée (déjà dans une transaction) : on reste dans la même.
      if (!racine) return travail(adapter(db, null))
      return racine.transaction((tx) => travail(adapter(tx, null)))
    },
  }
}

export async function basePglite(): Promise<{ sql: Sql; fermer: () => Promise<void> }> {
  const db = await PGlite.create()
  return { sql: adapter(db, db), fermer: () => db.close() }
}
