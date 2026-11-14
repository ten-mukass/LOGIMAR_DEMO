"use client"

import { X } from "lucide-react"
import { useEffect, useId, useRef } from "react"

/**
 * Fenêtre modale : feuille du bas sur mobile, boîte centrée sur grand écran.
 * Repose sur <dialog> (piège du focus, touche Échap et fond gérés par le navigateur).
 */
export function Feuille({
  ouverte,
  onFermer,
  titre,
  children,
}: {
  ouverte: boolean
  onFermer: () => void
  titre: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitre = useId()

  useEffect(() => {
    const dialogue = ref.current
    if (!dialogue) return
    if (ouverte && !dialogue.open) dialogue.showModal()
    if (!ouverte && dialogue.open) dialogue.close()
  }, [ouverte])

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitre}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === ref.current) onFermer()
      }}
      className="mx-auto mb-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-billet bg-white p-0 text-encre md:m-auto md:max-w-md md:rounded-billet"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-bordure bg-white px-5 py-3">
        <h2 id={idTitre} className="text-[19px] font-bold text-marine">
          {titre}
        </h2>
        <button
          type="button"
          onClick={onFermer}
          className="-mr-2 flex size-12 items-center justify-center rounded-full text-gris hover:bg-ecume"
          aria-label="Fermer"
        >
          <X aria-hidden className="size-6" />
        </button>
      </div>
      <div className="px-5 pb-6 pt-4">{children}</div>
    </dialog>
  )
}
