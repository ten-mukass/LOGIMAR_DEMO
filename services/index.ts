/**
 * Choix des implémentations : seul endroit à modifier pour passer de la démo à la production.
 */
import { seed } from "@/data/seed"
import { DemoRepository } from "./repository/demo-repository"
import type { Repository } from "./repository/repository"

export const repository: Repository = new DemoRepository(seed)

export type { FiltreTraversees, Inventaire, Referentiel, Repository } from "./repository/repository"
