"use client"

import { ArrowRight, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { CalendrierSelection } from "@/components/reservation/calendrier-selection"
import { Bouton } from "@/components/ui/bouton"
import { Compteur } from "@/components/ui/compteur"
import { Feuille } from "@/components/ui/feuille"
import { Segmente } from "@/components/ui/segmente"
import type { ConfigCommerciale } from "@/domain/config"
import { resumeComposition, trancheAge, validerComposition } from "@/domain/passagers"
import { estOuverteALaVente, jourDeDepart, joursOuvertsALaVente, trouverLigne } from "@/domain/programme"
import { versParametres, type CriteresRecherche } from "@/domain/recherche"
import { formatJourCourt } from "@/domain/temps"
import type { CodePort, CompositionPassagers, Ligne, Port, Traversee } from "@/domain/types"
import { useDonnees } from "@/lib/use-donnees"
import { useMaintenant } from "@/lib/use-maintenant"
import { cn } from "@/lib/utils"
import { repository } from "@/services"

type TypeVoyage = "aller" | "aller-retour"
type FeuilleOuverte = null | "date" | "retour" | "passagers"

/** Jours de retour possibles : le bateau du retour part après l'arrivée de l'aller. */
function joursRetourPossibles(
  traversees: Traversee[],
  ligneRetourId: string,
  allerArriveeAt: string | null,
  maintenant: Date,
  config: ConfigCommerciale,
): string[] {
  if (!allerArriveeAt) return []
  const apres = Date.parse(allerArriveeAt)
  return [
    ...new Set(
      traversees
        .filter(
          (t) =>
            t.ligneId === ligneRetourId &&
            Date.parse(t.departAt) > apres &&
            estOuverteALaVente(t, maintenant, config.ventesEnLigneJusqua),
        )
        .map(jourDeDepart),
    ),
  ].sort()
}

export function FormulaireRecherche({
  ports,
  lignes,
  config,
  initial,
  className,
}: {
  ports: Port[]
  lignes: Ligne[]
  config: ConfigCommerciale
  /** Recherche à reprendre (lien « Modifier » des résultats). */
  initial?: CriteresRecherche | null
  className?: string
}) {
  const router = useRouter()
  const maintenant = useMaintenant()
  const nomPort = (code: CodePort) => ports.find((p) => p.code === code)?.nom ?? code
  const codePort = (id: string) => ports.find((p) => p.id === id)?.code as CodePort

  const [type, setType] = useState<TypeVoyage>(initial?.dateRetour ? "aller-retour" : "aller")
  const [depart, setDepart] = useState<CodePort>(initial?.depart ?? codePort(lignes[0].portDepartId))
  const [arrivee, setArrivee] = useState<CodePort>(initial?.arrivee ?? codePort(lignes[0].portArriveeId))
  const [dateChoisie, setDateChoisie] = useState<string | null>(initial?.date ?? null)
  const [retourChoisi, setRetourChoisi] = useState<string | null>(initial?.dateRetour ?? null)
  const [passagers, setPassagers] = useState<CompositionPassagers>(
    initial?.passagers ?? { adultes: 1, enfants: 0, bebes: 0 },
  )
  const [feuille, setFeuille] = useState<FeuilleOuverte>(null)
  const [erreurs, setErreurs] = useState<string[]>([])

  const charger = useCallback(() => repository.listerTraversees(), [])
  const { donnees: traversees } = useDonnees(charger)

  const ligne = trouverLigne(lignes, ports, depart, arrivee)
  const ligneRetour = trouverLigne(lignes, ports, arrivee, depart)

  const joursAller = useMemo(
    () =>
      traversees && maintenant && ligne
        ? joursOuvertsALaVente(traversees, ligne.id, maintenant, config.ventesEnLigneJusqua)
        : [],
    [traversees, maintenant, ligne, config.ventesEnLigneJusqua],
  )
  // La date reste valable tant qu'il y a une traversée ce jour-là ; sinon, première date possible.
  const date = dateChoisie && joursAller.includes(dateChoisie) ? dateChoisie : (joursAller[0] ?? null)

  const joursRetour = useMemo(() => {
    if (!traversees || !maintenant || !ligne || !ligneRetour || !date) return []
    const aller = traversees.find((t) => t.ligneId === ligne.id && jourDeDepart(t) === date)
    return joursRetourPossibles(traversees, ligneRetour.id, aller?.arriveeAt ?? null, maintenant, config)
  }, [traversees, maintenant, ligne, ligneRetour, date, config])
  const dateRetour = retourChoisi && joursRetour.includes(retourChoisi) ? retourChoisi : null

  const chargement = traversees === undefined || maintenant === null
  const max = config.passagersMax

  function inverser() {
    setDepart(arrivee)
    setArrivee(depart)
  }

  function rechercher(e: React.FormEvent) {
    e.preventDefault()
    const problemes: string[] = []
    if (!date) problemes.push("Choisissez la date de départ.")
    if (type === "aller-retour" && !dateRetour) problemes.push("Choisissez la date du retour.")
    problemes.push(...validerComposition(passagers, max))
    setErreurs(problemes)
    if (problemes.length > 0 || !date) return
    router.push(
      `/resultats?${versParametres({
        depart,
        arrivee,
        date,
        dateRetour: type === "aller-retour" ? dateRetour : null,
        passagers,
      })}`,
    )
  }

  return (
    <form
      onSubmit={rechercher}
      aria-label="Rechercher une traversée"
      className={cn("rounded-[20px] bg-white p-4 text-encre shadow-recherche", className)}
    >
      <Segmente
        libelle="Type de voyage"
        valeur={type}
        onChange={setType}
        options={[
          { valeur: "aller", libelle: "Aller simple" },
          { valeur: "aller-retour", libelle: "Aller-retour" },
        ]}
      />

      <div className="relative mt-3 rounded-champ border border-bordure-champ">
        <div className="border-b border-bordure-champ px-3.5 py-2.5 pr-16">
          <p className="text-[13px] font-medium text-gris">Départ</p>
          <p className="text-[17px] font-bold">
            {nomPort(depart)} <span className="font-normal text-gris">({depart})</span>
          </p>
        </div>
        <div className="px-3.5 py-2.5 pr-16">
          <p className="text-[13px] font-medium text-gris">Arrivée</p>
          <p className="text-[17px] font-bold">
            {nomPort(arrivee)} <span className="font-normal text-gris">({arrivee})</span>
          </p>
        </div>
        <button
          type="button"
          onClick={inverser}
          aria-label="Inverser le départ et l’arrivée"
          className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-bordure-champ bg-white text-action hover:bg-bleu-pale"
        >
          <ArrowUpDown aria-hidden className="size-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ChampBouton
          libelle={type === "aller-retour" ? "Aller" : "Date"}
          valeur={chargement ? "…" : date ? formatJourCourt(date) : "Aucune date"}
          onClick={() => setFeuille("date")}
          disabled={chargement}
        />
        {type === "aller-retour" ? (
          <ChampBouton
            libelle="Retour"
            valeur={dateRetour ? formatJourCourt(dateRetour) : "Choisir"}
            attenue={!dateRetour}
            onClick={() => setFeuille("retour")}
            disabled={chargement || !date}
          />
        ) : (
          <ChampBouton
            libelle="Passagers"
            valeur={resumeComposition(passagers)}
            onClick={() => setFeuille("passagers")}
          />
        )}
      </div>
      {type === "aller-retour" && (
        <ChampBouton
          className="mt-3 w-full"
          libelle="Passagers"
          valeur={resumeComposition(passagers)}
          onClick={() => setFeuille("passagers")}
        />
      )}

      {erreurs.length > 0 && (
        <ul role="alert" className="mt-3 rounded-champ bg-alerte-pale px-3.5 py-2.5 text-sm font-medium text-alerte">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Bouton type="submit" taille="grand" pleineLargeur className="mt-3">
        Rechercher <ArrowRight aria-hidden className="size-5" />
      </Bouton>

      <Feuille ouverte={feuille === "date"} onFermer={() => setFeuille(null)} titre="Date de départ">
        <CalendrierSelection
          joursDisponibles={joursAller}
          valeur={date}
          onChoisir={(j) => {
            setDateChoisie(j)
            setFeuille(null)
          }}
        />
      </Feuille>

      <Feuille ouverte={feuille === "retour"} onFermer={() => setFeuille(null)} titre="Date du retour">
        <CalendrierSelection
          joursDisponibles={joursRetour}
          valeur={dateRetour}
          onChoisir={(j) => {
            setRetourChoisi(j)
            setFeuille(null)
          }}
        />
      </Feuille>

      <Feuille ouverte={feuille === "passagers"} onFermer={() => setFeuille(null)} titre="Passagers">
        <div className="divide-y divide-bordure">
          <Compteur
            libelle="Adultes"
            aide={trancheAge("adulte", config.bornesAge)}
            nomAccessible="un adulte"
            valeur={passagers.adultes}
            min={1}
            max={max - passagers.enfants - passagers.bebes}
            onChange={(v) => setPassagers((p) => ({ ...p, adultes: v, bebes: Math.min(p.bebes, v) }))}
          />
          <Compteur
            libelle="Enfants"
            aide={trancheAge("enfant", config.bornesAge)}
            nomAccessible="un enfant"
            valeur={passagers.enfants}
            min={0}
            max={max - passagers.adultes - passagers.bebes}
            onChange={(v) => setPassagers((p) => ({ ...p, enfants: v }))}
          />
          <Compteur
            libelle="Bébés"
            aide={`${trancheAge("bebe", config.bornesAge)}, sur les genoux d’un adulte`}
            nomAccessible="un bébé"
            valeur={passagers.bebes}
            min={0}
            max={Math.min(passagers.adultes, max - passagers.adultes - passagers.enfants)}
            onChange={(v) => setPassagers((p) => ({ ...p, bebes: v }))}
          />
        </div>
        <p className="mt-3 text-sm text-gris">
          Au moins un adulte par réservation, un bébé au plus par adulte, {max} passagers au plus.
        </p>
        <Bouton taille="grand" pleineLargeur className="mt-4" onClick={() => setFeuille(null)}>
          Valider
        </Bouton>
      </Feuille>
    </form>
  )
}

function ChampBouton({
  libelle,
  valeur,
  onClick,
  disabled,
  attenue,
  className,
}: {
  libelle: string
  valeur: string
  onClick: () => void
  disabled?: boolean
  attenue?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[68px] rounded-champ border border-bordure-champ px-3.5 py-2.5 text-left hover:border-action disabled:opacity-60",
        className,
      )}
    >
      <span className="block text-[13px] font-medium text-gris">{libelle}</span>
      <span className={cn("block text-[17px] font-bold leading-snug", attenue && "font-medium text-gris")}>
        {valeur}
      </span>
    </button>
  )
}
