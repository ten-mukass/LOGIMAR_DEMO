/**
 * Contenu signé du QR code d'un billet : « LGM1|référence|traversée|signature ».
 * docs/CAHIER_DES_CHARGES_RESERVATION.md §4.6 : vérifiable hors ligne à l'embarquement.
 *
 * Démo : HMAC-SHA256 avec une clé de démonstration publique (aucune sécurité réelle).
 * Production : signature asymétrique (Ed25519) côté serveur ; l'application de scan ne détient que la clé publique.
 */

export const VERSION_QR = "LGM1"
const OCTETS_SIGNATURE = 16

function base64url(octets: Uint8Array): string {
  let binaire = ""
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function hmac(message: string, cle: string): Promise<string> {
  const encodeur = new TextEncoder()
  const cleCrypto = await crypto.subtle.importKey(
    "raw",
    encodeur.encode(cle),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", cleCrypto, encodeur.encode(message)))
  return base64url(signature.slice(0, OCTETS_SIGNATURE))
}

export async function contenuQrBillet(reference: string, traverseeId: string, cle: string): Promise<string> {
  const message = `${VERSION_QR}|${reference}|${traverseeId}`
  return `${message}|${await hmac(message, cle)}`
}

export type VerificationQr =
  | { valide: true; reference: string; traverseeId: string }
  | { valide: false; motif: "format" | "signature" }

export async function verifierQrBillet(contenu: string, cle: string): Promise<VerificationQr> {
  const morceaux = contenu.split("|")
  if (morceaux.length !== 4 || morceaux[0] !== VERSION_QR) return { valide: false, motif: "format" }
  const [version, reference, traverseeId, signature] = morceaux
  const attendue = await hmac(`${version}|${reference}|${traverseeId}`, cle)
  if (attendue.length !== signature.length) return { valide: false, motif: "signature" }
  let difference = 0
  for (let i = 0; i < attendue.length; i++) difference |= attendue.charCodeAt(i) ^ signature.charCodeAt(i)
  return difference === 0 ? { valide: true, reference, traverseeId } : { valide: false, motif: "signature" }
}
