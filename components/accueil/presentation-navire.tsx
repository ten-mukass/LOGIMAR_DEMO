import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { formatDuree } from "@/domain/temps"
import type { Navire } from "@/domain/types"

export function PresentationNavire({ navire, dureeTypeMinutes }: { navire: Navire; dureeTypeMinutes: number }) {
  return (
    <section aria-labelledby="titre-navire">
      <h2 id="titre-navire" className="mb-3 text-[19px] font-bold text-marine md:text-[22px]">
        Le {navire.nom}
      </h2>
      <div className="overflow-hidden rounded-carte border border-bordure bg-white md:grid md:grid-cols-2">
        <Image
          src={navire.photo}
          alt={`Le ${navire.nom} en mer`}
          width={800}
          height={533}
          sizes="(min-width: 768px) 480px, 100vw"
          className="h-auto w-full object-cover md:h-full"
        />
        <div className="p-4 md:p-6">
          <p className="text-[15px] leading-relaxed text-gris">
            {navire.type}, environ {formatDuree(dureeTypeMinutes)} de traversée.
            {navire.atouts.length > 0 && ` ${navire.atouts.join(", ")}.`}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Badge>{navire.capaciteTotale} places</Badge>
            </li>
            <li>
              <Badge>Bagage soute {navire.bagageSouteKg} kg</Badge>
            </li>
            <li>
              <Badge>Cabine {navire.bagageCabineKg} kg</Badge>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
