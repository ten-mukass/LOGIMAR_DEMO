import QRCode from "qrcode"
import { describe, expect, it } from "vitest"
import { seed } from "@/data/seed"
import { contenuQrBillet } from "@/services/documents/signature-billet"
import { ServiceEmbarquement } from "@/services/embarquement/service-embarquement"
import { DemoRepository } from "@/services/repository/demo-repository"
import { stockageMemoire } from "@/services/stockage"
import { decoderPixels } from "./lecture-qr"

/**
 * Dessine un QR code comme sur le billet (même bibliothèque, même niveau de correction) dans une image RGBA,
 * posé sur un fond donné, éventuellement décalé : une « photo » simplifiée du billet.
 */
function image(contenu: string, o: { module: number; fond: number; encre: [number, number, number]; marge: number; decalage: number }) {
  const { modules } = QRCode.create(contenu, { errorCorrectionLevel: "M" })
  const qr = (modules.size + 8) * o.module // zone blanche de 4 modules autour, comme sur le billet
  const cote = qr + o.marge * 2
  const pixels = new Uint8ClampedArray(cote * cote * 4)
  for (let y = 0; y < cote; y++) {
    for (let x = 0; x < cote; x++) {
      const qx = x - o.marge - o.decalage
      const qy = y - o.marge
      const dansQr = qx >= 0 && qy >= 0 && qx < qr && qy < qr
      const mx = Math.floor(qx / o.module) - 4
      const my = Math.floor(qy / o.module) - 4
      const noir = dansQr && mx >= 0 && my >= 0 && mx < modules.size && my < modules.size && modules.get(my, mx)
      const [r, g, b] = noir ? o.encre : dansQr ? [255, 255, 255] : [o.fond, o.fond, o.fond]
      const i = (y * cote + x) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
    }
  }
  return { pixels, cote }
}

const TRAVERSEE = "LBV-POG-2026-11-20-1215"

describe("décodage du QR d'un billet par jsQR (caméra sans lecteur intégré, iPhone)", () => {
  it("relit exactement le contenu signé dessiné sur le billet", async () => {
    const contenu = await contenuQrBillet("LGM-AB12C", TRAVERSEE, seed.cleSignatureBilletDemo)
    const { pixels, cote } = image(contenu, { module: 4, fond: 255, encre: [18, 35, 59], marge: 0, decalage: 0 })
    expect(await decoderPixels(pixels, cote, cote)).toBe(contenu)
  })

  it("le lit aussi sur un fond gris, décalé dans l'image", async () => {
    const contenu = await contenuQrBillet("LGM-ZZ99Z", TRAVERSEE, seed.cleSignatureBilletDemo)
    const { pixels, cote } = image(contenu, { module: 3, fond: 120, encre: [40, 40, 40], marge: 60, decalage: 25 })
    expect(await decoderPixels(pixels, cote, cote)).toBe(contenu)
  })

  it("ne renvoie rien sans QR code", async () => {
    const vide = new Uint8ClampedArray(200 * 200 * 4).fill(255)
    expect(await decoderPixels(vide, 200, 200)).toBeNull()
  })

  it("de l'image du billet au passage à bord", async () => {
    const instant = new Date("2026-11-20T11:30:00+01:00")
    const repository = new DemoRepository(seed, stockageMemoire())
    let n = 0
    const service = new ServiceEmbarquement({
      repository,
      horloge: () => instant,
      genererId: () => `id-${++n}`,
      cleSignature: seed.cleSignatureBilletDemo,
      agent: "Agent démo",
    })
    const [billet] = (await repository.listerReservations(instant, { traverseeIds: [TRAVERSEE] })).filter((r) => r.statut === "emise")
    const contenu = await contenuQrBillet(billet.reference, TRAVERSEE, seed.cleSignatureBilletDemo)
    const { pixels, cote } = image(contenu, { module: 4, fond: 230, encre: [18, 35, 59], marge: 40, decalage: 0 })
    const lu = await decoderPixels(pixels, cote, cote)
    const resultat = await service.scanner(lu ?? "", TRAVERSEE)
    expect(resultat.controle.resultat).toBe("valide")
    expect(resultat.embarques).toHaveLength(billet.passagers.length)
  })
})
