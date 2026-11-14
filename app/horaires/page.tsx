import type { Metadata } from "next"
import { CalendrierHoraires } from "@/components/horaires/calendrier-horaires"
import { ProgrammeType } from "@/components/horaires/programme-type"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Horaires" }

export default async function Horaires() {
  const { lignes, ports, regles, config, textes } = await repository.getReferentiel()
  return (
    <main>
      <CalendrierHoraires lignes={lignes} ports={ports} regles={regles} config={config} />
      <ProgrammeType
        regles={regles}
        lignes={lignes}
        ports={ports}
        regleEnregistrement={textes.regleEnregistrement}
      />
    </main>
  )
}
