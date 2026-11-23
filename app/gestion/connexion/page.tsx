import type { Metadata } from "next"
import Link from "next/link"
import { FormulaireConnexion } from "@/components/gestion/formulaires-compte"
import { classesBouton } from "@/components/ui/bouton"
import { gestionParComptes } from "@/services/mode-gestion"

export const metadata: Metadata = { title: "Connexion" }

/** Connexion de l'équipe (étape 7C). Sans comptes configurés (poste local), le code de démonstration reste sur /admin. */
export default async function PageConnexion({ searchParams }: { searchParams: Promise<{ suite?: string; refus?: string }> }) {
  const { suite, refus } = await searchParams
  if (!gestionParComptes) {
    return (
      <main className="mx-auto max-w-sm space-y-4 px-4 py-16 text-center">
        <p className="text-[15px] text-encre">Les comptes de l’équipe ne sont pas configurés ici : la gestion utilise le code de démonstration.</p>
        <Link href="/admin" className={classesBouton({ pleineLargeur: true })}>
          Aller à la gestion
        </Link>
      </main>
    )
  }
  return <FormulaireConnexion suite={suite ?? null} refus={refus === "1"} />
}
