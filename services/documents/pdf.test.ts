import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { billetPdf, facturePdf, textePdf, type DonneesBilletPdf } from "./pdf"

const billet: DonneesBilletPdf = {
  sens: "Aller",
  reference: "LGM-7K4Q2",
  navire: "Victoria Jet",
  depart: { code: "LBV", nom: "Libreville" },
  arrivee: { code: "POG", nom: "Port-Gentil" },
  date: "Mardi 17 novembre 2026",
  dateCourte: "Mar. 17 nov.",
  heureDepart: "12:15",
  heureArrivee: "15:45",
  enregistrement: "09:30",
  regleEnregistrement: "Tout passager arrivé après l’enregistrement ne pourra pas embarquer.",
  terminal: "[À CONFIRMER]",
  lienItineraire: null,
  tarif: "Standard",
  passagers: [{ nom: "MBA Paul", detail: "Adulte · CNI" }],
  qr: "LGM1|LGM-7K4Q2|LBV-POG-2026-11-17-1215|abcdefghijklmnopqrstuv",
}

describe("PDF", () => {
  it("remplace les caractères absents des polices standard", () => {
    expect(textePdf("35 000 F LBV → POG ✓")).toBe("35 000 F LBV - POG ?")
  })

  it("produit un billet d'une page par trajet", async () => {
    const octets = await billetPdf([billet, { ...billet, sens: "Retour", reference: "LGM-ABCDE" }])
    expect(new TextDecoder().decode(octets.slice(0, 5))).toBe("%PDF-")
    expect((await PDFDocument.load(octets)).getPageCount()).toBe(2)
  })

  it("produit une facture", async () => {
    const octets = await facturePdf({
      numero: "F-2026-000001",
      dateEmission: "Samedi 14 novembre 2026",
      emetteur: { raisonSociale: "LOGIMAR 241", adresse: "[ADRESSE]", nif: "[NIF]", rccm: "[RCCM]", regimeTva: "[TVA]", mentionsLegales: "[MENTIONS]" },
      client: { nom: "MBA Paul", telephone: "+241 07 12 34 56", email: null },
      references: ["LGM-7K4Q2"],
      lignes: [{ libelle: "Traversée Standard, adultes", quantite: 2, prixUnitaire: 35000, montant: 70000 }],
      total: 70000,
      paiement: "par Airtel Money",
    })
    const doc = await PDFDocument.load(octets)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe("Facture F-2026-000001")
  })
})
