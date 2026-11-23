import { describe, expect, it } from "vitest"
import { generateur } from "./aleatoire"
import {
  accueilDuRole,
  droitPourChemin,
  erreurMotDePasse,
  estRole,
  motDePasseProvisoire,
  peut,
  ROLES,
  suiteApresConnexion,
} from "./roles"

describe("rôles de l'équipe", () => {
  it("donne à chaque rôle ses droits", () => {
    expect(ROLES.filter((r) => peut(r, "utilisateurs"))).toEqual(["administrateur"])
    expect(ROLES.filter((r) => peut(r, "paliers"))).toEqual(["administrateur", "revenue"])
    expect(ROLES.filter((r) => peut(r, "back-office"))).toEqual(["administrateur", "direction", "revenue"])
    expect(ROLES.every((r) => peut(r, "embarquement"))).toBe(true)
    expect(estRole("direction")).toBe(true)
    expect(estRole("agent")).toBe(false)
  })

  it("protège les pages de gestion et seulement elles", () => {
    expect(droitPourChemin("/admin")).toBe("back-office")
    expect(droitPourChemin("/admin/traversees/x/manifeste")).toBe("back-office")
    expect(droitPourChemin("/admin/utilisateurs")).toBe("utilisateurs")
    expect(droitPourChemin("/scan")).toBe("embarquement")
    expect(droitPourChemin("/administration")).toBeNull()
    expect(droitPourChemin("/")).toBeNull()
    expect(droitPourChemin("/billet/LGM-7K4Q2")).toBeNull()
  })

  it("renvoie chacun vers une page à laquelle il a droit après la connexion", () => {
    expect(accueilDuRole("embarquement")).toBe("/scan")
    expect(accueilDuRole("direction")).toBe("/admin")
    expect(suiteApresConnexion("direction", "/admin/reservations?q=x")).toBe("/admin/reservations?q=x")
    expect(suiteApresConnexion("embarquement", "/admin")).toBe("/scan")
    expect(suiteApresConnexion("revenue", "/admin/utilisateurs")).toBe("/admin")
    expect(suiteApresConnexion("administrateur", "//exemple.com/admin")).toBe("/admin")
    expect(suiteApresConnexion("administrateur", "https://exemple.com")).toBe("/admin")
  })

  it("exige un mot de passe solide et en fabrique des provisoires valables", () => {
    expect(erreurMotDePasse("court1")).not.toBeNull()
    expect(erreurMotDePasse("seulementdeslettres")).not.toBeNull()
    expect(erreurMotDePasse("1234567890")).not.toBeNull()
    expect(erreurMotDePasse("victoria-jet-2026")).toBeNull()
    const alea = generateur(3)
    const provisoires = Array.from({ length: 20 }, () => motDePasseProvisoire(alea))
    expect(provisoires.every((m) => m.length === 14 && erreurMotDePasse(m) === null)).toBe(true)
    expect(new Set(provisoires).size).toBe(20)
  })
})
