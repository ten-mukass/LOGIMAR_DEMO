import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { classesBouton } from "@/components/ui/bouton"
import { baseConfiguree, baseSupabase } from "@/services/serveur/connexion"
import { accesControleBase, etatBase, type EtatBase } from "@/services/serveur/controle"
import { appliquerLesMigrations, chargerLesExemples } from "./actions"

export const metadata: Metadata = { title: { absolute: "Contrôle de la base — LOGIMAR 241" }, robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

/**
 * Page interne, sur les Previews seulement (protégées par la connexion Vercel) : état de la base Supabase,
 * application des migrations, chargement des données d'exemple, comparaison avec la démo.
 */
export default async function PageControleBase({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  if (!accesControleBase()) notFound()
  const { message } = await searchParams

  let etat: EtatBase | null = null
  let erreur: string | null = null
  if (baseConfiguree()) {
    try {
      etat = await etatBase(baseSupabase(), new Date())
    } catch (e) {
      erreur = e instanceof Error ? e.message : String(e)
    }
  }
  const aAppliquer = etat?.migrations.filter((m) => m.appliqueeLe === null) ?? []
  const ecarts = etat?.comparaison.filter((c) => !c.identique).length ?? 0

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-encre">
      <header className="space-y-1">
        <h1 className="text-[24px] font-extrabold text-marine">Contrôle de la base</h1>
        <p className="text-[14px] text-gris">
          Page interne, visible sur les Previews seulement. Étape A de docs/PLAN_BASE_DE_DONNEES.md : le site n’utilise pas encore la
          base.
        </p>
      </header>

      {message && <p className="rounded-champ border border-foret/30 bg-vert-pale px-4 py-3 text-[14px] font-semibold text-foret-texte">{message}</p>}

      {!baseConfiguree() && <p className="rounded-champ bg-alerte-pale px-4 py-3 text-[14px]">Base non configurée sur ce serveur (POSTGRES_URL absente).</p>}
      {erreur && <p className="rounded-champ bg-alerte-pale px-4 py-3 text-[14px] text-alerte">Erreur de connexion : {erreur}</p>}

      {etat && (
        <>
          <section className="space-y-3 rounded-carte border border-bordure bg-white p-5">
            <h2 className="text-[17px] font-bold text-marine">Migrations</h2>
            <ul className="space-y-1 text-[14px]">
              {etat.migrations.map((m) => (
                <li key={m.version}>
                  {m.version} — {m.description} :{" "}
                  {m.appliqueeLe ? <span className="text-foret-texte">appliquée le {new Date(m.appliqueeLe).toLocaleString("fr-FR", { timeZone: "Africa/Libreville" })}</span> : <strong>à appliquer</strong>}
                </li>
              ))}
            </ul>
            {aAppliquer.length > 0 && (
              <form action={appliquerLesMigrations}>
                <button type="submit" className={classesBouton({ taille: "compact" })}>
                  Appliquer les migrations
                </button>
              </form>
            )}
          </section>

          {aAppliquer.length === 0 && (
            <>
              <section className="space-y-3 rounded-carte border border-bordure bg-white p-5">
                <h2 className="text-[17px] font-bold text-marine">Contenu</h2>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[14px] sm:grid-cols-3">
                  {etat.comptes.map((c) => (
                    <li key={c.table}>
                      <span className="text-gris">{c.table}</span> : <strong>{c.lignes}</strong>
                    </li>
                  ))}
                </ul>
                <p className="text-[14px]">
                  Ventes d’exemple : <strong>{etat.ventesExemple}</strong> · vraies réservations : <strong>{etat.vraiesReservations}</strong>
                </p>
                <form action={chargerLesExemples}>
                  <button type="submit" className={classesBouton({ taille: "compact", variante: "contour" })}>
                    {etat.ventesExemple > 0 ? "Recharger les données d’exemple" : "Charger les données d’exemple"}
                  </button>
                </form>
                <p className="text-[13px] text-gris">
                  Recrée le référentiel, les traversées et les ventes d’exemple depuis data/seed. Les vraies réservations et les changements de
                  paliers sont conservés.
                </p>
              </section>

              {etat.comparaison.length > 0 && (
                <section className="space-y-3 rounded-carte border border-bordure bg-white p-5">
                  <h2 className="text-[17px] font-bold text-marine">Base et démo, 14 prochains jours</h2>
                  <p className="text-[14px]">
                    {ecarts === 0 ? (
                      <span className="font-semibold text-foret-texte">Identiques sur les {etat.comparaison.length} traversées.</span>
                    ) : (
                      <span className="font-semibold text-alerte">
                        {ecarts} traversée(s) différente(s). Normal s’il y a de vraies réservations ou des changements de paliers dans la base.
                      </span>
                    )}
                  </p>
                  <table className="w-full text-left text-[14px]">
                    <thead className="text-[12px] text-gris">
                      <tr>
                        <th className="py-1">Traversée</th>
                        <th className="py-1 text-right">Places (base)</th>
                        <th className="py-1 text-right">Places (démo)</th>
                        <th className="py-1 text-right">Paliers et ventes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {etat.comparaison.map((c) => (
                        <tr key={c.id} className="border-t border-bordure">
                          <td className="py-1">{c.id}</td>
                          <td className="py-1 text-right">{c.placesBase}</td>
                          <td className="py-1 text-right">{c.placesDemo}</td>
                          <td className={`py-1 text-right font-semibold ${c.identique ? "text-foret-texte" : "text-alerte"}`}>
                            {c.identique ? "identiques" : "différents"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
