/**
 * Lecture des QR codes dans le navigateur, avec le lecteur intégré (BarcodeDetector) :
 * Chrome et Edge sur Android, Chrome sur ordinateur. Safari (iPhone) ne le propose pas encore.
 *
 * Point d'accroche pour la production : brancher ici un décodeur JavaScript (par exemple jsQR) quand le
 * lecteur intégré manque, pour que la caméra fonctionne aussi sur iPhone. La démo ne l'embarque pas
 * (pas de dépendance ajoutée) ; la recherche manuelle reste toujours possible.
 */

type SourceImage = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | Blob

interface Detecteur {
  detect(source: SourceImage): Promise<{ rawValue: string }[]>
}

interface ConstructeurDetecteur {
  new (options: { formats: string[] }): Detecteur
  getSupportedFormats(): Promise<string[]>
}

function constructeur(): ConstructeurDetecteur | null {
  if (typeof window === "undefined") return null
  return (window as unknown as { BarcodeDetector?: ConstructeurDetecteur }).BarcodeDetector ?? null
}

export type LecteurQr = (source: SourceImage) => Promise<string | null>

/** Un lecteur de QR codes, ou null si le navigateur n'en propose pas. */
export async function creerLecteurQr(): Promise<LecteurQr | null> {
  const Detecteur = constructeur()
  if (!Detecteur) return null
  try {
    const formats = await Detecteur.getSupportedFormats()
    if (!formats.includes("qr_code")) return null
    const detecteur = new Detecteur({ formats: ["qr_code"] })
    return async (source) => {
      try {
        const codes = await detecteur.detect(source)
        return codes[0]?.rawValue ?? null
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

/** La caméra est-elle utilisable ici (contexte sécurisé, API disponible) ? */
export function cameraDisponible(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)
}

/** Petit retour haptique sur les téléphones qui le permettent. */
export function vibrer(motif: number | number[]): void {
  try {
    navigator.vibrate?.(motif)
  } catch {
    // non disponible : sans conséquence
  }
}
