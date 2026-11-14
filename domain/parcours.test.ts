import { describe, expect, it } from "vitest"
import { chiffresTelephone, estEmailValide, formaterTelephone, validerContact } from "./contact"
import { choisirOptions, lignesOptions, lignesPassagers, optionsProposees, totalLignes } from "./montants"
import { categoriesDe, validerPassager, type SaisiePassager } from "./passagers"
import type { OptionCatalogue } from "./types"

const bornes = { enfantDes: 3, adulteDes: 12 }

const catalogue: OptionCatalogue[] = [
  { code: "BAGAGE", libelle: "Bagage supplémentaire", detail: "20 kg", prix: 5000, familles: ["ECO", "STD", "FLEX"], quantiteMax: 9 },
  { code: "GARANTIE", libelle: "Garantie modification", detail: "", prix: 3000, familles: ["ECO", "STD"], quantiteMax: 1 },
]

describe("détail du prix", () => {
  it("donne une ligne par catégorie présente", () => {
    const lignes = lignesPassagers({ adulte: 35000, enfant: 21000, bebe: 5000 }, { adultes: 2, enfants: 1, bebes: 0 })
    expect(lignes).toEqual([
      { libelle: "2 adultes", quantite: 2, prixUnitaire: 35000, montant: 70000 },
      { libelle: "1 enfant", quantite: 1, prixUnitaire: 21000, montant: 21000 },
    ])
    expect(totalLignes(lignes)).toBe(91000)
  })

  it("ajoute les options choisies", () => {
    const { options, erreurs } = choisirOptions({ BAGAGE: 2, GARANTIE: 1 }, catalogue, "STD")
    expect(erreurs).toEqual([])
    expect(totalLignes(lignesOptions(options, catalogue))).toBe(13000)
    expect(lignesOptions(options, catalogue)[0].libelle).toBe("2 × bagage supplémentaire")
  })

  it("ne propose pas la garantie avec Flex et refuse les quantités hors limite", () => {
    expect(optionsProposees(catalogue, "FLEX").map((o) => o.code)).toEqual(["BAGAGE"])
    expect(choisirOptions({ GARANTIE: 1 }, catalogue, "FLEX").erreurs).toHaveLength(1)
    expect(choisirOptions({ BAGAGE: 10 }, catalogue, "ECO").erreurs).toHaveLength(1)
  })
})

describe("contact", () => {
  it("accepte les numéros avec ou sans indicatif", () => {
    expect(chiffresTelephone("+241 07 12 34 56")).toBe("07123456")
    expect(chiffresTelephone("00241 077123456")).toBe("077123456")
    expect(chiffresTelephone("07.12.34.56")).toBe("07123456")
    expect(chiffresTelephone("+33 6 12 34 56 78")).toBeNull()
    expect(chiffresTelephone("abc")).toBeNull()
    expect(formaterTelephone("07123456")).toBe("+241 07 12 34 56")
    expect(formaterTelephone("077123456")).toBe("+241 077 12 34 56")
  })

  it("exige au moins un téléphone ou un e-mail valide", () => {
    expect(validerContact({ telephone: "", email: "" }).general).toBeDefined()
    expect(validerContact({ telephone: "", email: "paul@example.com" })).toEqual({})
    expect(validerContact({ telephone: "12", email: "" }).telephone).toBeDefined()
    expect(estEmailValide("paul@example")).toBe(false)
  })
})

describe("fiche passager", () => {
  const adulte: SaisiePassager = {
    categorie: "adulte",
    nom: "MBA",
    prenom: "Paul",
    dateNaissance: "",
    typePiece: "cni",
    numeroPiece: "EX1234567",
  }

  it("valide un adulte complet", () => {
    expect(validerPassager(adulte, "2026-11-17", bornes)).toEqual({})
  })

  it("exige la pièce d'identité des adultes", () => {
    expect(validerPassager({ ...adulte, typePiece: "", numeroPiece: "" }, "2026-11-17", bornes)).toEqual({
      typePiece: "Choisissez la pièce d’identité.",
      numeroPiece: "Indiquez le numéro de la pièce.",
    })
  })

  it("vérifie que la date de naissance correspond à la catégorie le jour du voyage", () => {
    const enfant: SaisiePassager = { ...adulte, categorie: "enfant", typePiece: "", numeroPiece: "", dateNaissance: "2018-05-02" }
    expect(validerPassager(enfant, "2026-11-17", bornes)).toEqual({})
    expect(validerPassager({ ...enfant, dateNaissance: "2010-01-01" }, "2026-11-17", bornes).dateNaissance).toMatch(
      /compte comme adulte/,
    )
    expect(validerPassager({ ...enfant, dateNaissance: "" }, "2026-11-17", bornes).dateNaissance).toBe(
      "Indiquez la date de naissance.",
    )
  })

  it("refuse un nom vide ou fantaisiste", () => {
    expect(validerPassager({ ...adulte, nom: " ", prenom: "P@ul" }, "2026-11-17", bornes)).toEqual({
      nom: "Indiquez le nom.",
      prenom: "Prénom invalide.",
    })
  })

  it("liste les catégories dans l'ordre adultes, enfants, bébés", () => {
    expect(categoriesDe({ adultes: 2, enfants: 1, bebes: 1 })).toEqual(["adulte", "adulte", "enfant", "bebe"])
  })
})
