import type { Metadata } from "next"
import { Suspense } from "react"
import { RecapRecherche } from "@/components/reservation/recap-recherche"
import { EnPreparation } from "@/components/site/en-preparation"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Résultats" }

export default async function Resultats() {
  const { ports, config } = await repository.getReferentiel()
  return (
    <EnPreparation titre="Résultats" etape={2}>
      <Suspense fallback={<p className="text-gris">Chargement…</p>}>
        <RecapRecherche ports={ports} passagersMax={config.passagersMax} />
      </Suspense>
    </EnPreparation>
  )
}
