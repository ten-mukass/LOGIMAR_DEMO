"use client"

import { createContext, useContext } from "react"
import { peut, type Droit } from "@/domain/roles"
import { gestionParComptes } from "@/services/mode-gestion"
import type { SessionGestion } from "@/services/serveur/actions-gestion"

/** Personne connectée à la gestion (mode « comptes ») ; null avec le code de démonstration. */
export const ContexteProfilGestion = createContext<SessionGestion | null>(null)

export function useProfilGestion(): SessionGestion | null {
  return useContext(ContexteProfilGestion)
}

/**
 * Le rôle connecté a-t-il ce droit ? Sert à masquer ce qu'il ne peut pas faire ; le serveur revérifie.
 * Code de démonstration : tous les droits, comme avant l'étape 7C.
 */
export function useDroitGestion(droit: Droit): boolean {
  const profil = useProfilGestion()
  if (!gestionParComptes) return true
  return profil !== null && peut(profil.role, droit)
}
