import { describe, expect, it } from "vitest"
import { contenuQrBillet, verifierQrBillet } from "./signature-billet"

const cle = "cle-de-test"

describe("QR code signé du billet", () => {
  it("contient la référence, la traversée et une signature vérifiable", async () => {
    const contenu = await contenuQrBillet("LGM-7K4Q2", "LBV-POG-2026-11-17-1215", cle)
    expect(contenu).toMatch(/^LGM1\|LGM-7K4Q2\|LBV-POG-2026-11-17-1215\|[A-Za-z0-9_-]{22}$/)
    expect(await verifierQrBillet(contenu, cle)).toEqual({
      valide: true,
      reference: "LGM-7K4Q2",
      traverseeId: "LBV-POG-2026-11-17-1215",
    })
  })

  it("détecte un billet modifié ou signé avec une autre clé", async () => {
    const contenu = await contenuQrBillet("LGM-7K4Q2", "LBV-POG-2026-11-17-1215", cle)
    const falsifie = contenu.replace("2026-11-17", "2026-11-20")
    expect(await verifierQrBillet(falsifie, cle)).toEqual({ valide: false, motif: "signature" })
    expect(await verifierQrBillet(contenu, "autre-cle")).toEqual({ valide: false, motif: "signature" })
    expect(await verifierQrBillet("n'importe quoi", cle)).toEqual({ valide: false, motif: "format" })
  })
})
