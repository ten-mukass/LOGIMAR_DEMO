/**
 * Connexion à la base Supabase, côté serveur uniquement.
 * L'adresse vient de la variable POSTGRES_URL, synchronisée par l'intégration Supabase de Vercel
 * (pooler de Supabase, mode transaction : pas de requêtes préparées).
 */
import postgres from "postgres"
import type { Ligne, Sql } from "./sql"

type Client = postgres.Sql | postgres.TransactionSql

function adapter(client: Client, racine: postgres.Sql | null): Sql {
  return {
    async requete<T extends Ligne = Ligne>(texte: string, valeurs: unknown[] = []) {
      return (await client.unsafe(texte, valeurs as postgres.ParameterOrJSON<never>[])) as unknown as T[]
    },
    async executer(script: string) {
      await client.unsafe(script)
    },
    async transaction<R>(travail: (sql: Sql) => Promise<R>): Promise<R> {
      if (!racine) return travail(adapter(client, null))
      return (await racine.begin((tx) => travail(adapter(tx, null)))) as R
    },
  }
}

/** Ne garde de l'adresse que l'hôte, le port, la base et les identifiants (les paramètres propres à Supabase sont ignorés). */
function options(adresse: string): postgres.Options<Record<string, never>> {
  const url = new URL(adresse)
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1) || "postgres"),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: "require",
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  }
}

let client: postgres.Sql | null = null

/** La base est-elle configurée sur ce serveur ? */
export function baseConfiguree(): boolean {
  return typeof window === "undefined" && Boolean(process.env.POSTGRES_URL)
}

/** Accès SQL à la base Supabase ; erreur si la base n'est pas configurée. */
export function baseSupabase(): Sql {
  if (typeof window !== "undefined") throw new Error("La base ne s'utilise que côté serveur.")
  const adresse = process.env.POSTGRES_URL
  if (!adresse) throw new Error("POSTGRES_URL absente : base non configurée.")
  client ??= postgres(options(adresse))
  return adapter(client, client)
}
