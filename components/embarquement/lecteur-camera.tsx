"use client"

import { CameraOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { LecteurQr } from "@/lib/lecture-qr"

const INTERVALLE_MS = 250

/**
 * Aperçu de la caméra arrière et lecture continue des QR codes.
 * `pause` suspend la lecture (pendant l'affichage d'un résultat) sans couper la caméra.
 */
export function LecteurCamera({
  lecteur,
  pause,
  onCode,
}: {
  lecteur: LecteurQr
  pause: boolean
  onCode: (contenu: string) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const rappel = useRef(onCode)
  const enPause = useRef(pause)

  useEffect(() => {
    rappel.current = onCode
    enPause.current = pause
  }, [onCode, pause])

  useEffect(() => {
    let flux: MediaStream | null = null
    let minuteur: number | undefined
    let actif = true

    async function demarrer() {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
        if (!actif || !video.current) return
        video.current.srcObject = flux
        await video.current.play()
        const lire = async () => {
          if (!actif) return
          const v = video.current
          if (v && !enPause.current && v.readyState >= 2) {
            const contenu = await lecteur(v)
            if (contenu && actif && !enPause.current) rappel.current(contenu)
          }
          minuteur = window.setTimeout(lire, INTERVALLE_MS)
        }
        void lire()
      } catch (e) {
        if (!actif) return
        const nom = e instanceof DOMException ? e.name : ""
        setErreur(
          nom === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez la caméra dans les réglages du navigateur, ou utilisez la recherche manuelle."
            : "Caméra indisponible sur cet appareil. Utilisez la recherche manuelle.",
        )
      }
    }
    void demarrer()

    return () => {
      actif = false
      window.clearTimeout(minuteur)
      flux?.getTracks().forEach((t) => t.stop())
    }
  }, [lecteur])

  if (erreur) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-carte bg-alerte-pale p-4 text-[14px] text-alerte">
        <CameraOff aria-hidden className="mt-0.5 size-5 shrink-0" />
        {erreur}
      </p>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-carte bg-encre">
      <video ref={video} muted playsInline className="aspect-square w-full object-cover" aria-label="Aperçu de la caméra" />
      <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-[18px] border-4 border-white/85" />
      <p className="absolute inset-x-0 bottom-3 text-center text-[14px] font-semibold text-white drop-shadow">
        {pause ? "Résultat affiché…" : "Placez le QR code du billet dans le cadre"}
      </p>
    </div>
  )
}
