/**
 * Billet et facture en PDF, générés dans le navigateur (démo) avec pdf-lib.
 * En production : génération côté serveur à la confirmation du paiement, fichier conservé (Facture.pdf_url).
 * Module chargé à la demande (import dynamique) pour ne pas alourdir les pages.
 */
import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import QRCode from "qrcode"

export interface DonneesBilletPdf {
  sens: "Aller" | "Retour" | null
  reference: string
  navire: string
  depart: { code: string; nom: string }
  arrivee: { code: string; nom: string }
  date: string
  /** « Mar. 17 nov. » pour l'écran. */
  dateCourte: string
  heureDepart: string
  heureArrivee: string
  enregistrement: string
  regleEnregistrement: string
  terminal: string | null
  lienItineraire: string | null
  tarif: string
  passagers: { nom: string; detail: string }[]
  qr: string
}

export interface DonneesFacturePdf {
  numero: string
  dateEmission: string
  emetteur: { raisonSociale: string; adresse: string; nif: string; rccm: string; regimeTva: string; mentionsLegales: string }
  client: { nom: string; telephone: string | null; email: string | null }
  references: string[]
  lignes: { libelle: string; quantite: number; prixUnitaire: number; montant: number }[]
  total: number
  paiement: string
}

const MARINE = rgb(15 / 255, 58 / 255, 115 / 255)
const ENCRE = rgb(18 / 255, 35 / 255, 59 / 255)
const GRIS = rgb(74 / 255, 91 / 255, 114 / 255)
const SOLEIL = rgb(243 / 255, 225 / 255, 43 / 255)
const BORDURE = rgb(217 / 255, 227 / 255, 238 / 255)
const MENTION_DEMO = "DÉMONSTRATION — DOCUMENT SANS VALEUR"

/** Les polices standard des PDF ne connaissent que l'alphabet WinAnsi : on remplace le reste. */
export function textePdf(s: string): string {
  return s
    .replace(/[  ]/g, " ")
    .replace(/[→⇄]/g, "-")
    .replace(/[^\x20-\x7e\xa0-\xff’‘“”«»…–—€•]/g, "?")
}

function montant(n: number): string {
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`
}

class Ecrivain {
  constructor(
    private readonly page: PDFPage,
    private readonly normal: PDFFont,
    private readonly gras: PDFFont,
  ) {}

  texte(t: string, x: number, y: number, o: { taille?: number; gras?: boolean; couleur?: ReturnType<typeof rgb>; droite?: boolean } = {}) {
    const police = o.gras ? this.gras : this.normal
    const taille = o.taille ?? 10
    const contenu = textePdf(t)
    const largeur = police.widthOfTextAtSize(contenu, taille)
    this.page.drawText(contenu, { x: o.droite ? x - largeur : x, y, size: taille, font: police, color: o.couleur ?? ENCRE })
  }

  /** Coupe un texte trop long sur plusieurs lignes ; renvoie la position sous le dernier tracé. */
  paragraphe(t: string, x: number, y: number, largeurMax: number, taille = 9, couleur = GRIS): number {
    const mots = textePdf(t).split(" ")
    let ligne = ""
    let yy = y
    for (const mot of mots) {
      const essai = ligne ? `${ligne} ${mot}` : mot
      if (this.normal.widthOfTextAtSize(essai, taille) > largeurMax && ligne) {
        this.page.drawText(ligne, { x, y: yy, size: taille, font: this.normal, color: couleur })
        yy -= taille + 3
        ligne = mot
      } else ligne = essai
    }
    if (ligne) this.page.drawText(ligne, { x, y: yy, size: taille, font: this.normal, color: couleur })
    return yy - taille - 3
  }
}

function dessinerQr(page: PDFPage, contenu: string, x: number, y: number, cote: number) {
  const { modules } = QRCode.create(contenu, { errorCorrectionLevel: "M" })
  const pas = cote / modules.size
  for (let r = 0; r < modules.size; r++) {
    for (let c = 0; c < modules.size; c++) {
      if (modules.get(r, c)) {
        page.drawRectangle({ x: x + c * pas, y: y + cote - (r + 1) * pas, width: pas, height: pas, color: ENCRE })
      }
    }
  }
}

function filigrane(page: PDFPage, police: PDFFont) {
  const { width, height } = page.getSize()
  page.drawText(textePdf(MENTION_DEMO), {
    x: width * 0.12,
    y: height * 0.32,
    size: 22,
    font: police,
    color: rgb(0.85, 0.2, 0.15),
    opacity: 0.12,
    rotate: degrees(35),
  })
}

export async function billetPdf(billets: DonneesBilletPdf[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(textePdf(`Billet LOGIMAR 241 ${billets.map((b) => b.reference).join(" ")}`))
  doc.setProducer("LOGIMAR 241 (démonstration)")
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const gras = await doc.embedFont(StandardFonts.HelveticaBold)

  for (const b of billets) {
    const page = doc.addPage([420, 595]) // A5
    const e = new Ecrivain(page, normal, gras)
    const L = 420
    page.drawRectangle({ x: 0, y: 515, width: L, height: 80, color: MARINE })
    e.texte("LOGIMAR 241", 28, 560, { taille: 18, gras: true, couleur: rgb(1, 1, 1) })
    e.texte(`Billet électronique${b.sens ? ` — ${b.sens}` : ""} · ${b.navire}`, 28, 540, { taille: 10, couleur: rgb(1, 1, 1) })
    e.texte("RÉFÉRENCE", L - 28, 568, { taille: 8, couleur: rgb(1, 1, 1), droite: true })
    e.texte(b.reference, L - 28, 548, { taille: 16, gras: true, couleur: rgb(1, 1, 1), droite: true })

    e.texte(b.depart.code, 28, 470, { taille: 30, gras: true, couleur: MARINE })
    e.texte(b.arrivee.code, L - 28, 470, { taille: 30, gras: true, couleur: MARINE, droite: true })
    page.drawLine({ start: { x: 110, y: 481 }, end: { x: L - 110, y: 481 }, thickness: 1.5, color: rgb(11 / 255, 124 / 255, 193 / 255) })
    e.texte(b.depart.nom, 28, 452, { taille: 9, couleur: GRIS })
    e.texte(b.arrivee.nom, L - 28, 452, { taille: 9, couleur: GRIS, droite: true })

    const colonnes: [string, string][] = [
      ["DATE", b.date],
      ["DÉPART", b.heureDepart],
      ["ARRIVÉE", b.heureArrivee],
    ]
    colonnes.forEach(([libelle, valeur], i) => {
      const x = 28 + i * 125
      e.texte(libelle, x, 422, { taille: 7, couleur: GRIS })
      e.texte(valeur, x, 406, { taille: 12, gras: true })
    })

    page.drawRectangle({ x: 28, y: 340, width: L - 56, height: 52, color: SOLEIL })
    e.texte(`Enregistrement dès ${b.enregistrement}`, 38, 374, { taille: 12, gras: true, couleur: MARINE })
    e.texte(b.regleEnregistrement, 38, 360, { taille: 8, couleur: MARINE })
    if (b.terminal) e.texte(`Terminal : ${b.terminal}`, 38, 348, { taille: 8, couleur: MARINE })

    dessinerQr(page, b.qr, (L - 140) / 2, 190, 140)
    e.texte("À présenter avec une pièce d’identité pour chaque passager.", L / 2 + 105, 176, { taille: 8, couleur: GRIS, droite: true })

    let y = 150
    page.drawLine({ start: { x: 28, y: y + 10 }, end: { x: L - 28, y: y + 10 }, thickness: 0.5, color: BORDURE })
    for (const p of b.passagers) {
      e.texte(p.nom, 28, y, { taille: 10, gras: true })
      e.texte(p.detail, L - 28, y, { taille: 9, couleur: GRIS, droite: true })
      y -= 16
    }
    e.texte(`Tarif ${b.tarif}`, 28, y - 4, { taille: 8, couleur: GRIS })
    e.texte(MENTION_DEMO, L / 2 + 95, 20, { taille: 7, couleur: GRIS, droite: true })
    filigrane(page, gras)
  }
  return doc.save()
}

export async function facturePdf(f: DonneesFacturePdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(textePdf(`Facture ${f.numero}`))
  doc.setProducer("LOGIMAR 241 (démonstration)")
  const normal = await doc.embedFont(StandardFonts.Helvetica)
  const gras = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([595, 842]) // A4
  const e = new Ecrivain(page, normal, gras)
  const D = 595 - 50

  e.texte(f.emetteur.raisonSociale, 50, 780, { taille: 13, gras: true, couleur: MARINE })
  let y = e.paragraphe(f.emetteur.adresse, 50, 764, 260)
  e.texte(`NIF : ${f.emetteur.nif}`, 50, y, { taille: 9, couleur: GRIS })
  e.texte(`RCCM : ${f.emetteur.rccm}`, 50, y - 12, { taille: 9, couleur: GRIS })

  e.texte("FACTURE", D, 780, { taille: 20, gras: true, couleur: MARINE, droite: true })
  e.texte(`N° ${f.numero}`, D, 760, { taille: 11, gras: true, droite: true })
  e.texte(`Date : ${f.dateEmission}`, D, 745, { taille: 9, couleur: GRIS, droite: true })

  page.drawRectangle({ x: 330, y: 640, width: D - 330, height: 70, borderColor: BORDURE, borderWidth: 1 })
  e.texte("Client", 342, 694, { taille: 8, couleur: GRIS })
  e.texte(f.client.nom, 342, 678, { taille: 11, gras: true })
  if (f.client.telephone) e.texte(f.client.telephone, 342, 664, { taille: 9 })
  if (f.client.email) e.texte(f.client.email, 342, 651, { taille: 9 })

  e.texte(`Billet${f.references.length > 1 ? "s" : ""} : ${f.references.join(", ")}`, 50, 650, { taille: 9, couleur: GRIS })

  y = 610
  page.drawRectangle({ x: 50, y: y - 6, width: D - 50, height: 22, color: rgb(234 / 255, 243 / 255, 251 / 255) })
  e.texte("Désignation", 58, y, { taille: 9, gras: true })
  e.texte("Qté", 360, y, { taille: 9, gras: true, droite: true })
  e.texte("Prix unitaire", 450, y, { taille: 9, gras: true, droite: true })
  e.texte("Montant", D - 8, y, { taille: 9, gras: true, droite: true })
  y -= 24
  for (const l of f.lignes) {
    e.texte(l.libelle, 58, y, { taille: 9 })
    e.texte(String(l.quantite), 360, y, { taille: 9, droite: true })
    e.texte(montant(l.prixUnitaire), 450, y, { taille: 9, droite: true })
    e.texte(montant(l.montant), D - 8, y, { taille: 9, droite: true })
    page.drawLine({ start: { x: 50, y: y - 6 }, end: { x: D, y: y - 6 }, thickness: 0.5, color: BORDURE })
    y -= 20
  }
  y -= 8
  e.texte("Total", 450, y, { taille: 12, gras: true, droite: true })
  e.texte(montant(f.total), D - 8, y, { taille: 12, gras: true, couleur: MARINE, droite: true })
  y -= 18
  e.texte(`TVA : ${f.emetteur.regimeTva}`, D - 8, y, { taille: 8, couleur: GRIS, droite: true })
  y -= 30
  y = e.paragraphe(`Payé ${f.paiement}.`, 50, y, D - 50, 9, ENCRE)
  y = e.paragraphe("Facture émise à la confirmation du paiement ; elle n’est jamais modifiée (un remboursement donne lieu à un avoir).", 50, y - 4, D - 50)
  e.paragraphe(f.emetteur.mentionsLegales, 50, 70, D - 50, 8)
  e.texte(MENTION_DEMO, 595 / 2 + 110, 40, { taille: 8, gras: true, couleur: rgb(0.64, 0.23, 0.09), droite: true })
  filigrane(page, gras)
  return doc.save()
}
