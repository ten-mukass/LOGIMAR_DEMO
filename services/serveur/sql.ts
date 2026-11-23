/**
 * Accès SQL minimal, commun à la base Supabase (bibliothèque `postgres`, côté serveur)
 * et à PGlite (PostgreSQL dans les tests). Le reste du code ne dépend que de cette interface.
 */

export type Ligne = Record<string, unknown>

export interface Sql {
  /** Requête paramétrée ($1, $2…) ; renvoie les lignes. */
  requete<T extends Ligne = Ligne>(texte: string, valeurs?: unknown[]): Promise<T[]>
  /** Script de plusieurs instructions, sans paramètres (migrations). */
  executer(script: string): Promise<void>
  /** Exécute `travail` dans une transaction : tout est validé, ou rien. */
  transaction<R>(travail: (sql: Sql) => Promise<R>): Promise<R>
}

/** Instant renvoyé par la base (Date ou texte) → ISO 8601, comme `Date.prototype.toISOString`. */
export function iso(valeur: unknown): string {
  if (valeur instanceof Date) return valeur.toISOString()
  if (typeof valeur === "string") return new Date(valeur).toISOString()
  throw new Error(`Instant attendu, reçu : ${String(valeur)}`)
}

export function isoOuNull(valeur: unknown): string | null {
  return valeur === null || valeur === undefined ? null : iso(valeur)
}

/** Date seule (colonne `date`) → AAAA-MM-JJ, sans décalage horaire. */
export function jourOuNull(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null
  if (valeur instanceof Date) {
    const a = valeur.getFullYear()
    const m = String(valeur.getMonth() + 1).padStart(2, "0")
    const j = String(valeur.getDate()).padStart(2, "0")
    return `${a}-${m}-${j}`
  }
  return String(valeur).slice(0, 10)
}

/** Colonne jsonb : déjà décodée par le pilote, ou texte JSON. */
export function json<T>(valeur: unknown): T {
  return (typeof valeur === "string" ? JSON.parse(valeur) : valeur) as T
}
