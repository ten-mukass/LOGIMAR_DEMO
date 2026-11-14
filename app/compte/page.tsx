import type { Metadata } from "next"
import { EcranCompte } from "@/components/compte/ecran-compte"
import { repository } from "@/services"

export const metadata: Metadata = { title: "Mon compte" }

export default async function Compte() {
  const referentiel = await repository.getReferentiel()
  return <EcranCompte referentiel={referentiel} />
}
