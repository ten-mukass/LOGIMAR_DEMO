import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { classesBouton } from "@/components/ui/bouton"
import { baseConfiguree, baseSupabase } from "@/services/serveur/connexion"
import { accesControleBase, etatBase, type EtatBase } from "@/services/serveur/controle"
import { ariaChamp, Champ, classesChamp } from "@/components/ui/champ"
import { LONGUEUR_MIN_MOT_DE_PASSE } from "@/domain/roles"
import { gestionParComptes } from "@/services/mode-gestion"
import { serviceComptes } from "@/services/serveur/session-gestion"
import { appliquerLesMigrations, chargerLesExemples, creerPremierAdministrateur } from "./actions"

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
  // Comptes de l'équipe (étape 7C) : proposer le premier administrateur tant qu'il n'y en a aucun.
  let sansAdministrateur = false
  if (etat && aAppliquer.length === 0 && gestionParComptes) {
    try {
      sansAdministrateur = !(await serviceComptes().administrateurExiste())
    } catch (e) {
      erreur = e instanceof Error ? e.message : String(e)
    }
  }
  const ecarts = etat?.comparaison.filter((c) => !c.identique).length ?? 0

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-encre">
      <header className="space-y-1">
        <h1 className="text-[24px] font-extrabold text-marine">Contrôle de la base</h1>
        <p className="text-[14px] text-gris">
          Page interne, visible sur les Previews seulement : migrations, données d’exemple, premier administrateur (docs/PLAN_BASE_DE_DONNEES.md).
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

          {sansAdministrateur && (
            <section className="space-y-3 rounded-carte border border-bordure bg-white p-5">
              <h2 className="text-[17px] font-bold text-marine">Premier administrateur</h2>
              <p className="text-[14px]">
                Aucun compte d’administrateur. Créez le vôtre : vous ajouterez ensuite les autres comptes (dont celui du fondateur)
                dans Gestion &gt; Utilisateurs. Ce formulaire disparaît dès qu’un administrateur existe.
              </p>
              <form action={creerPremierAdministrateur} className="grid max-w-md gap-3">
                <Champ id="admin-email" libelle="Adresse e-mail">
                  <input {...ariaChamp("admin-email")} name="email" type="email" autoComplete="username" required className={classesChamp} />
                </Champ>
                <Champ id="admin-nom" libelle="Nom">
                  <input {...ariaChamp("admin-nom")} name="nom" type="text" autoComplete="name" required className={classesChamp} />
                </Champ>
                <Champ id="admin-mdp" libelle="Mot de passe" aide={`Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères, avec des lettres et des chiffres.`}>
                  <input
                    {...ariaChamp("admin-mdp", undefined, "aide")}
                    name="motDePasse"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={LONGUEUR_MIN_MOT_DE_PASSE}
                    className={classesChamp}
                  />
                </Champ>
                <Champ id="admin-confirmation" libelle="Confirmez le mot de passe">
                  <input {...ariaChamp("admin-confirmation")} name="confirmation" type="password" autoComplete="new-password" required className={classesChamp} />
                </Champ>
                <button type="submit" className={classesBouton({ taille: "compact" })}>
                  Créer l’administrateur
                </button>
              </form>
            </section>
          )}

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
