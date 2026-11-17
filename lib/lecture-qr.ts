/**
 * Lecture des QR codes dans le navigateur.
 * - Lecteur intégré (BarcodeDetector) quand il existe : Chrome et Edge sur Android, Chrome sur ordinateur.
 * - Sinon, décodeur JavaScript jsQR (Apache-2.0), chargé à la demande : Safari sur iPhone, Firefox.
 */

type SourceImage = HTMLVideoElement | HTMLCanvasElement | ImageBitmap | Blob

interface Detecteur {
  detect(source: SourceImage): Promise<{ rawValue: string }[]>
}

interface ConstructeurDetecteur {
  new (options: { formats: string[] }): Detecteur
  getSupportedFormats(): Promise<string[]>
}

export type LecteurQr = (source: SourceImage) => Promise<string | null>

type FonctionJsQr = typeof import("jsqr").default

let jsQrCharge: Promise<FonctionJsQr> | null = null

function chargerJsQr(): Promise<FonctionJsQr> {
  jsQrCharge ??= import("jsqr").then((m) => {
    const exporte = m.default as FonctionJsQr | { default: FonctionJsQr }
    return typeof exporte === "function" ? exporte : exporte.default
  })
  return jsQrCharge
}

/** Décode un QR code dans des pixels RGBA (aussi utilisable hors navigateur, pour les tests). */
export async function decoderPixels(pixels: Uint8ClampedArray, largeur: number, hauteur: number): Promise<string | null> {
  const jsQR = await chargerJsQr()
  return jsQR(pixels, largeur, hauteur, { inversionAttempts: "dontInvert" })?.data ?? null
}

function lecteurIntegre(): ConstructeurDetecteur | null {
  if (typeof window === "undefined") return null
  return (window as unknown as { BarcodeDetector?: ConstructeurDetecteur }).BarcodeDetector ?? null
}

async function creerLecteurIntegre(): Promise<LecteurQr | null> {
  const Detecteur = lecteurIntegre()
  if (!Detecteur) return null
  try {
    if (!(await Detecteur.getSupportedFormats()).includes("qr_code")) return null
    const detecteur = new Detecteur({ formats: ["qr_code"] })
    return async (source) => {
      try {
        return (await detecteur.detect(source))[0]?.rawValue ?? null
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

/** Plus grand côté de l'image analysée par jsQR : assez pour un billet tenu devant la caméra, assez léger pour un téléphone. */
const COTE_MAX = 720

function dimensions(image: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): [number, number] {
  if (typeof HTMLVideoElement !== "undefined" && image instanceof HTMLVideoElement) return [image.videoWidth, image.videoHeight]
  return [image.width, image.height]
}

function creerLecteurJsQr(): LecteurQr | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  const contexte = canvas.getContext("2d", { willReadFrequently: true })
  if (!contexte) return null
  void chargerJsQr() // préchargement, pour que le premier scan soit immédiat
  return async (source) => {
    try {
      const image = source instanceof Blob ? await createImageBitmap(source) : source
      const [largeur, hauteur] = dimensions(image)
      if (!largeur || !hauteur) return null
      const echelle = Math.min(1, COTE_MAX / Math.max(largeur, hauteur))
      canvas.width = Math.round(largeur * echelle)
      canvas.height = Math.round(hauteur * echelle)
      contexte.drawImage(image, 0, 0, canvas.width, canvas.height)
      const { data } = contexte.getImageData(0, 0, canvas.width, canvas.height)
      return await decoderPixels(data, canvas.width, canvas.height)
    } catch {
      return null
    }
  }
}

/** Un lecteur de QR codes : le lecteur intégré du navigateur, sinon jsQR ; null seulement sans canvas. */
export async function creerLecteurQr(): Promise<LecteurQr | null> {
  return (await creerLecteurIntegre()) ?? creerLecteurJsQr()
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
