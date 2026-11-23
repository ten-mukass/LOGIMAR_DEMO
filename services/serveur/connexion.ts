/**
 * Connexion à la base Supabase, côté serveur uniquement.
 * L'adresse vient de la variable POSTGRES_URL, synchronisée par l'intégration Supabase de Vercel
 * (pooler de Supabase, mode transaction : pas de requêtes préparées).
 *
 * Les requêtes partent une par une : le pooler en mode transaction supporte mal plusieurs requêtes
 * envoyées d'affilée sur la même connexion (constaté le 23/11/2026 : la page restait bloquée).
 * Chaque requête a un délai maximum ; au-delà, la connexion est fermée et recréée.
 */
import postgres from "postgres"
import type { Ligne, Sql } from "./sql"

const DELAI_MS = 20_000
/** Une transaction (chargement des exemples : environ 5 000 lignes) a droit à plus de temps. */
const DELAI_TRANSACTION_MS = 60_000

let client: postgres.Sql | null = null
/** File d'attente : la requête suivante attend la fin de la précédente (ou de la transaction en cours). */
let file: Promise<unknown> = Promise.resolve()

function enFile<R>(travail: () => Promise<R>): Promise<R> {
  const resultat = file.then(travail, travail)
  file = resultat.catch(() => undefined)
  return resultat
}

/** Abandonne une requête trop longue : la connexion est fermée, la suivante en ouvrira une neuve. */
async function avecDelai<R>(travail: Promise<R>, quoi: string, ms = DELAI_MS): Promise<R> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  const delai = new Promise<never>((_, refuser) => {
    minuterie = setTimeout(() => {
      const ancien = client
      client = null
      void ancien?.end({ timeout: 0 })
      refuser(new Error(`Base : délai de ${ms / 1000} s dépassé (${quoi}).`))
    }, ms)
  })
  try {
    return await Promise.race([travail, delai])
  } finally {
    clearTimeout(minuterie)
  }
}

function resume(texte: string): string {
  return texte.replace(/\s+/g, " ").trim().slice(0, 60)
}

/** Requêtes d'une transaction : une par une aussi, sur la connexion réservée à la transaction. */
function adapterTransaction(tx: postgres.TransactionSql): Sql {
  let fileTx: Promise<unknown> = Promise.resolve()
  const suivant = <R>(travail: () => Promise<R>): Promise<R> => {
    const resultat = fileTx.then(travail, travail)
    fileTx = resultat.catch(() => undefined)
    return resultat
  }
  const sql: Sql = {
    requete: <T extends Ligne = Ligne>(texte: string, valeurs: unknown[] = []) =>
      suivant(async () => (await tx.unsafe(texte, valeurs as postgres.ParameterOrJSON<never>[])) as unknown as T[]),
    executer: (script: string) =>
      suivant(async () => {
        await tx.unsafe(script)
      }),
    // Déjà dans une transaction : on reste dedans.
    transaction: (travail) => travail(sql),
  }
  return sql
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
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  }
}

function connexion(): postgres.Sql {
  const adresse = process.env.POSTGRES_URL
  if (!adresse) throw new Error("POSTGRES_URL absente : base non configurée.")
  client ??= postgres(options(adresse))
  return client
}

/** La base est-elle configurée sur ce serveur ? */
export function baseConfiguree(): boolean {
  return typeof window === "undefined" && Boolean(process.env.POSTGRES_URL)
}

const base: Sql = {
  requete: <T extends Ligne = Ligne>(texte: string, valeurs: unknown[] = []) =>
    enFile(() =>
      avecDelai(connexion().unsafe(texte, valeurs as postgres.ParameterOrJSON<never>[]) as unknown as Promise<T[]>, resume(texte)),
    ),
  executer: (script: string) =>
    enFile(async () => {
      await avecDelai(connexion().unsafe(script) as unknown as Promise<unknown>, resume(script))
    }),
  transaction: <R>(travail: (sql: Sql) => Promise<R>) =>
    enFile(() => avecDelai(connexion().begin((tx) => travail(adapterTransaction(tx))) as Promise<R>, "transaction", DELAI_TRANSACTION_MS)),
}

/** Accès SQL à la base Supabase ; erreur si la base n'est pas configurée. */
export function baseSupabase(): Sql {
  if (typeof window !== "undefined") throw new Error("La base ne s'utilise que côté serveur.")
  connexion()
  return base
}
