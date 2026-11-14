import type { Ligne, Port, RegleProgramme } from "@/domain/types"

export function ProgrammeType({
  regles,
  lignes,
  ports,
  regleEnregistrement,
}: {
  regles: RegleProgramme[]
  lignes: Ligne[]
  ports: Port[]
  regleEnregistrement: string
}) {
  const port = (id: string | undefined) => ports.find((p) => p.id === id)
  return (
    <section aria-labelledby="titre-programme" className="mx-auto max-w-3xl px-5 pb-8 md:px-8">
      <h2 id="titre-programme" className="mb-3 text-[19px] font-bold text-marine">
        Programme type
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {regles.map((r) => {
          const ligne = lignes.find((l) => l.id === r.ligneId)
          const depart = port(ligne?.portDepartId)
          const arrivee = port(ligne?.portArriveeId)
          return (
            <li key={r.ligneId} className="rounded-carte border border-bordure bg-white p-4">
              <h3 className="font-sans text-[16px] font-bold text-foret-texte">Départ de {depart?.nom}</h3>
              <dl className="mt-2 flex justify-between gap-3">
                {[
                  ["Enregistrement", r.enregistrement],
                  ["Départ", r.depart],
                  [`Arrivée ${arrivee?.code ?? ""}`, r.arrivee],
                ].map(([libelle, heure]) => (
                  <div key={libelle}>
                    <dt className="text-[11px] font-semibold uppercase text-gris">{libelle}</dt>
                    <dd className="font-titre text-[19px] font-bold tabular-nums text-encre">{heure}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-sm text-gris">{regleEnregistrement}</p>
    </section>
  )
}
