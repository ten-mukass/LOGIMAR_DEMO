import { Phone } from "lucide-react"
import type { Metadata } from "next"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Aide" }

export default async function Aide() {
  const { rubriquesAide, agences, navires } = await repository.getReferentiel()
  const navire = navires[0]
  return (
    <main>
      <div className="bg-marine px-5 py-6 text-white md:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[22px] font-bold md:text-[30px]">Aide</h1>
          <p className="mt-1 text-[15px] text-white/85">Informations pratiques avant de partir.</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8">
        <nav aria-label="Rubriques de l’aide" className="rounded-carte border border-bordure bg-white p-4">
          <ul className="grid gap-1 sm:grid-cols-2">
            {rubriquesAide.map((r) => (
              <li key={r.ancre}>
                <a href={`#${r.ancre}`} className="flex min-h-11 items-center font-semibold text-action underline-offset-2 hover:underline">
                  {r.titre}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {rubriquesAide.map((r) => (
          <section key={r.ancre} id={r.ancre} aria-labelledby={`titre-${r.ancre}`} className="scroll-mt-4 rounded-carte border border-bordure bg-white p-4">
            <h2 id={`titre-${r.ancre}`} className="font-sans text-[17px] font-bold text-marine">
              {r.titre}
            </h2>
            <div className="mt-2 space-y-2 text-[15px] leading-relaxed">
              {r.ancre === "bagages" && navire && (
                <p>
                  Franchise à bord du {navire.nom} : soute {navire.bagageSouteKg} kg, cabine {navire.bagageCabineKg} kg
                  par passager.
                </p>
              )}
              {r.paragraphes.map((p) => (
                <p key={p} className={p.startsWith("[") ? "font-semibold text-gris" : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <section id="contact" aria-labelledby="titre-agences" className="scroll-mt-4 rounded-carte border border-bordure bg-white p-4">
          <h2 id="titre-agences" className="font-sans text-[17px] font-bold text-marine">
            Contacter une agence
          </h2>
          <ul className="mt-3 space-y-3">
            {agences.map((a) => (
              <li key={a.id}>
                <p className="font-semibold">Agence de {a.ville}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {a.telephones.map((t) => (
                    <li key={t}>
                      <a
                        href={`tel:${t.replace(/\s/g, "")}`}
                        className="inline-flex min-h-12 items-center gap-2 rounded-champ border-2 border-action px-3.5 font-semibold tabular-nums text-action hover:bg-bleu-pale"
                      >
                        <Phone aria-hidden className="size-4" /> {t}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
