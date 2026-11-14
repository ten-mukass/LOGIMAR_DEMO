import { Phone } from "lucide-react"
import type { Agence } from "@/domain/types"

export function ContactAgences({ agences }: { agences: Agence[] }) {
  return (
    <section aria-labelledby="titre-contact">
      <h2 id="titre-contact" className="mb-3 text-[19px] font-bold text-marine md:text-[22px]">
        Une question ? Appelez-nous
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {agences.map((agence) => (
          <li key={agence.id} className="rounded-carte border border-bordure bg-white p-4">
            <p className="font-bold text-encre">Agence de {agence.ville}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {agence.telephones.map((tel) => (
                <li key={tel}>
                  <a
                    href={`tel:${tel.replace(/\s/g, "")}`}
                    className="inline-flex min-h-12 items-center gap-2 rounded-champ border-2 border-action px-3.5 font-semibold tabular-nums text-action hover:bg-bleu-pale"
                  >
                    <Phone aria-hidden className="size-4" />
                    {tel}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
