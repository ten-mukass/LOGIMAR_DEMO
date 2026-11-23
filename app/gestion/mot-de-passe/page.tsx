import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { FormulaireMotDePasse } from "@/components/gestion/formulaires-compte"
import { gestionParComptes } from "@/services/mode-gestion"
import { profilConnecte } from "@/services/serveur/session-gestion"

export const metadata: Metadata = { title: "Mot de passe" }
export const dynamic = "force-dynamic"

/** Choix du mot de passe définitif, obligatoire après un mot de passe provisoire (étape 7C). */
export default async function PageMotDePasse({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  if (!gestionParComptes) notFound()
  const { suite } = await searchParams
  const profil = await profilConnecte()
  if (!profil) redirect(`/gestion/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`)
  return <FormulaireMotDePasse suite={suite ?? null} nom={profil.nom} />
}
