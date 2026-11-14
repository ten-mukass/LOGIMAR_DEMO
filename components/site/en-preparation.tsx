import Link from "next/link"
import { classesBouton } from "@/components/ui/bouton"

/** Écran prévu à une étape ultérieure de la démo. */
export function EnPreparation({ titre, etape, children }: { titre: string; etape: number; children?: React.ReactNode }) {
  return (
    <main>
      <div className="bg-marine px-5 py-6 text-white md:px-8">
        <h1 className="mx-auto max-w-3xl text-[22px] font-bold md:text-[30px]">{titre}</h1>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 px-5 py-6 md:px-8">
        {children}
        <p className="rounded-carte border border-bordure bg-white p-4 text-gris">
          Cet écran arrive à l’étape {etape} de la démonstration.
        </p>
        <Link href="/" className={classesBouton({ variante: "contour", pleineLargeur: true })}>
          Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}
