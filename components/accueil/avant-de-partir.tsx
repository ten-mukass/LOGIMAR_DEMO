import { Accessibility, Baby, IdCard, Luggage } from "lucide-react"
import Link from "next/link"

const rubriques = [
  { ancre: "pieces", titre: "Pièces d’identité", detail: "Exigées pour chaque passager", icone: IdCard },
  { ancre: "bagages", titre: "Bagages", detail: "Franchise et excédents", icone: Luggage },
  { ancre: "enfants", titre: "Enfants et mineurs", detail: "Non accompagnés, bébés", icone: Baby },
  { ancre: "accessibilite", titre: "Accessibilité", detail: "Assistance à l’embarquement", icone: Accessibility },
]

export function AvantDePartir() {
  return (
    <section aria-labelledby="titre-avant">
      <h2 id="titre-avant" className="mb-3 text-[19px] font-bold text-marine md:text-[22px]">
        Avant de partir
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {rubriques.map(({ ancre, titre, detail, icone: Icone }) => (
          <li key={ancre}>
            <Link
              href={`/aide#${ancre}`}
              className="block h-full rounded-carte border border-bordure bg-white p-3.5 hover:border-action"
            >
              <Icone aria-hidden className="mb-2 size-6 text-ocean" />
              <span className="block font-bold text-encre">{titre}</span>
              <span className="mt-0.5 block text-sm text-gris">{detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
