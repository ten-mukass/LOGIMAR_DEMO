/**
 * Réservations d'exemple déjà « vendues », pour que les remplissages varient
 * (PERIMETRE_DEMO : certaines traversées presque pleines, une complète).
 *
 * Génération déterministe : mêmes réservations à chaque chargement, côté client comme back-office.
 * Chaque vente est tarifée par le même calcul que le site (meilleureOffre), dans l'ordre chronologique :
 * les paliers vendus sont donc cohérents avec les quotas. Une réservation n'est comptée qu'à partir
 * de sa date de création : le remplissage progresse avec la date réelle, comme en vrai.
 */
import { choisir, choisirPondere, entier, generateur, graineDepuis, type Aleatoire } from "@/domain/aleatoire"
import type { BornesAge } from "@/domain/passagers"
import { genererReference } from "@/domain/reference"
import { meilleureOffre, ORDRE_FAMILLES, type Occupation } from "@/domain/tarifs"
import { ajouterJours, jourLocal, jourSemaine } from "@/domain/temps"
import type {
  Canal,
  Categorie,
  ClasseReservation,
  CodeFamille,
  CompositionPassagers,
  MoyenPaiement,
  Passager,
  Reservation,
  Traversee,
  TypePiece,
} from "@/domain/types"
import { nomsExemple, prenomsExemple } from "./noms"

type Pondere<T> = readonly (readonly [T, number])[]

export interface ParametresVentes {
  graine: string
  /** Remplissage visé par ligne et par jour de semaine (0 = dimanche). */
  remplissageParJour: Record<string, Record<number, number>>
  variation: number
  fetes: { du: string; au: string; bonus: number }
  /** Plafond des traversées ordinaires : laisse des places aux réservations faites pendant la démo. */
  remplissageMax: number
  completes: string[]
  presquePleines: { ids: string[]; remplissage: number }
  /** Ventes réparties sur les N derniers jours, plus nombreuses à l'approche du départ. */
  horizonJours: number
  /** Traversées complètes ou presque pleines : ventes entre J-de et J-a. */
  fenetreAnticipee: { de: number; a: number }
  tailleGroupe: Pondere<number>
  partEnfants: number
  partBebes: number
  preferenceFamille: Pondere<CodeFamille>
  canal: Pondere<Canal>
  moyenWeb: Pondere<MoyenPaiement>
  moyenAgence: Pondere<MoyenPaiement>
  pieceAdulte: Pondere<TypePiece>
  partTelephone: number
  partEmail: number
}

// EXEMPLE — à remplacer par LOGIMAR (tout ce bloc décrit des ventes fictives)
export const parametresVentes: ParametresVentes = {
  graine: "logimar-241-demo",
  remplissageParJour: {
    "LBV-POG": { 2: 0.55, 5: 0.7, 0: 0.5 },
    "POG-LBV": { 2: 0.45, 5: 0.55, 0: 0.7 },
  },
  variation: 0.15,
  fetes: { du: "2026-12-18", au: "2027-01-04", bonus: 0.2 },
  remplissageMax: 0.85,
  completes: ["LBV-POG-2026-11-24-1215", "LBV-POG-2026-12-22-1215", "POG-LBV-2027-01-03-0725"],
  presquePleines: {
    ids: [
      "LBV-POG-2026-11-17-1215",
      "POG-LBV-2026-11-22-0725",
      "LBV-POG-2026-12-18-1215",
      "LBV-POG-2026-12-20-1215",
      "POG-LBV-2027-01-05-0725",
    ],
    remplissage: 0.9,
  },
  horizonJours: 45,
  fenetreAnticipee: { de: 50, a: 10 },
  tailleGroupe: [[1, 45], [2, 30], [3, 15], [4, 10]],
  partEnfants: 0.25,
  partBebes: 0.08,
  preferenceFamille: [["ECO", 45], ["STD", 40], ["FLEX", 15]],
  canal: [["web", 65], ["agence", 35]],
  moyenWeb: [["airtel", 60], ["moov", 40]],
  moyenAgence: [["especes", 50], ["airtel", 30], ["moov", 20]],
  pieceAdulte: [["cni", 80], ["passeport", 20]],
  partTelephone: 0.85,
  partEmail: 0.5,
}

interface Demande {
  composition: CompositionPassagers
  famille: CodeFamille
  creeLe: number
}

const MS_JOUR = 86_400_000

function remplissageVise(t: Traversee, alea: Aleatoire, p: ParametresVentes): number {
  if (p.completes.includes(t.id)) return 1
  if (p.presquePleines.ids.includes(t.id)) return p.presquePleines.remplissage
  const jour = jourLocal(t.departAt)
  const base = p.remplissageParJour[t.ligneId]?.[jourSemaine(jour)] ?? 0.5
  const fetes = jour >= p.fetes.du && jour <= p.fetes.au ? p.fetes.bonus : 0
  const vise = base + fetes + p.variation * (2 * alea() - 1)
  return Math.min(p.remplissageMax, Math.max(0.15, vise))
}

function compositionAleatoire(taille: number, alea: Aleatoire, p: ParametresVentes): CompositionPassagers {
  const c = { adultes: 1, enfants: 0, bebes: 0 }
  for (let i = 1; i < taille; i++) {
    if (alea() < p.partEnfants) c.enfants += 1
    else c.adultes += 1
  }
  if (alea() < p.partBebes) c.bebes = 1
  return c
}

function dateNaissance(age: number, jourVoyage: string): string {
  return ajouterJours(jourVoyage, -Math.round((age + 0.5) * 365.25))
}

function chiffres(alea: Aleatoire, n: number): string {
  let s = ""
  for (let i = 0; i < n; i++) s += String(entier(alea, 0, 9))
  return s
}

function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function creerPassagers(
  idReservation: string,
  c: CompositionPassagers,
  jourVoyage: string,
  bornes: BornesAge,
  alea: Aleatoire,
  p: ParametresVentes,
): Passager[] {
  const nomFamille = choisir(alea, nomsExemple)
  const categories: Categorie[] = [
    ...Array<Categorie>(c.adultes).fill("adulte"),
    ...Array<Categorie>(c.enfants).fill("enfant"),
    ...Array<Categorie>(c.bebes).fill("bebe"),
  ]
  return categories.map((categorie, i) => {
    const adulte = categorie === "adulte"
    const age =
      categorie === "enfant"
        ? entier(alea, bornes.enfantDes, bornes.adulteDes - 1)
        : entier(alea, 0, bornes.enfantDes - 1)
    return {
      id: `${idReservation}-p${i + 1}`,
      categorie,
      nom: adulte && i > 0 && alea() < 0.3 ? choisir(alea, nomsExemple) : nomFamille,
      prenom: choisir(alea, prenomsExemple),
      dateNaissance: adulte ? null : dateNaissance(age, jourVoyage),
      typePiece: adulte ? choisirPondere(alea, p.pieceAdulte) : null,
      numeroPiece: adulte ? `EX${chiffres(alea, 7)}` : null,
    }
  })
}

function referenceUnique(alea: Aleatoire, dejaPrises: Set<string>): string {
  let ref = genererReference(alea)
  while (dejaPrises.has(ref)) ref = genererReference(alea)
  dejaPrises.add(ref)
  return ref
}

function ventesTraversee(
  t: Traversee,
  classes: ClasseReservation[],
  bornes: BornesAge,
  references: Set<string>,
  p: ParametresVentes,
): Reservation[] {
  const alea = generateur(graineDepuis(`${p.graine}:${t.id}`))
  const depart = Date.parse(t.departAt)
  const jourVoyage = jourLocal(t.departAt)
  const anticipee = p.completes.includes(t.id) || p.presquePleines.ids.includes(t.id)
  const cible = Math.round(t.capaciteVendable * remplissageVise(t, alea, p))

  const demandes: Demande[] = []
  let places = 0
  while (places < cible) {
    const taille = Math.min(choisirPondere(alea, p.tailleGroupe), cible - places)
    const joursAvant = anticipee
      ? p.fenetreAnticipee.a + (p.fenetreAnticipee.de - p.fenetreAnticipee.a) * alea()
      : p.horizonJours * alea() ** 2
    demandes.push({
      composition: compositionAleatoire(taille, alea, p),
      famille: choisirPondere(alea, p.preferenceFamille),
      // au plus tard une heure avant le départ
      creeLe: depart - Math.max(joursAvant * MS_JOUR, 3_600_000),
    })
    places += taille
  }
  demandes.sort((a, b) => a.creeLe - b.creeLe)

  const occupation: Occupation = { total: 0, parClasse: {} }
  const reservations: Reservation[] = []

  const vendre = (d: Demande) => {
    const ordre = [d.famille, ...ORDRE_FAMILLES.filter((f) => f !== d.famille)]
    for (const famille of ordre) {
      const offre = meilleureOffre(classes, famille, d.composition, t.capaciteVendable, occupation)
      if (!offre.disponible) continue
      const id = `seed-${t.id}-${reservations.length + 1}`
      const canal = choisirPondere(alea, p.canal)
      const avecTelephone = alea() < p.partTelephone
      const passagers = creerPassagers(id, d.composition, jourVoyage, bornes, alea, p)
      const titulaire = passagers[0]
      reservations.push({
        id,
        commandeId: null,
        reference: referenceUnique(alea, references),
        traverseeId: t.id,
        familleCode: famille,
        classeId: offre.classe.id,
        statut: "emise",
        telephone: avecTelephone ? `+241 06 00 ${chiffres(alea, 2)} ${chiffres(alea, 2)}` : null,
        email:
          !avecTelephone || alea() < p.partEmail
            ? `${sansAccents(titulaire.prenom)}.${sansAccents(titulaire.nom)}@example.com`
            : null,
        passagers,
        prixUnitaires: offre.prixUnitaires,
        options: [],
        total: offre.total,
        devise: "XAF",
        bloqueeJusquA: null,
        canal,
        moyenPaiement: choisirPondere(alea, canal === "web" ? p.moyenWeb : p.moyenAgence),
        creeLe: new Date(d.creeLe).toISOString(),
      })
      const placesVendues = d.composition.adultes + d.composition.enfants
      occupation.total += placesVendues
      occupation.parClasse[offre.classe.id] = (occupation.parClasse[offre.classe.id] ?? 0) + placesVendues
      return
    }
  }

  demandes.forEach(vendre)

  // Traversée complète : on complète avec des voyageurs seuls jusqu'à la dernière place.
  if (p.completes.includes(t.id)) {
    let dernier = demandes.at(-1)?.creeLe ?? depart - p.fenetreAnticipee.a * MS_JOUR
    while (occupation.total < t.capaciteVendable) {
      dernier += 60_000
      vendre({ composition: { adultes: 1, enfants: 0, bebes: 0 }, famille: "STD", creeLe: dernier })
    }
  }
  return reservations
}

export function genererVentes(
  traversees: Traversee[],
  classesParTraversee: Map<string, ClasseReservation[]>,
  bornes: BornesAge,
  p: ParametresVentes = parametresVentes,
): Reservation[] {
  const references = new Set<string>()
  return traversees.flatMap((t) => ventesTraversee(t, classesParTraversee.get(t.id) ?? [], bornes, references, p))
}
