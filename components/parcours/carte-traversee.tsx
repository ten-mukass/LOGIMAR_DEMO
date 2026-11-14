import { Clock } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { dureeTraversee } from "@/domain/programme"
import { formatDuree, heureLocale } from "@/domain/temps"
import type { Navire, Port, Terminal, Traversee } from "@/domain/types"

export function CarteTraversee({
  traversee,
  navire,
  depart,
  arrivee,
  terminalDepart,
  placesRestantes,
}: {
  traversee: Traversee
  navire: Navire | undefined
  depart: Port | undefined
  arrivee: Port | undefined
  terminalDepart: Terminal | undefined
  placesRestantes: number
}) {
  return (
    <div className="rounded-carte border border-bordure bg-white">
      <div className="flex items-center gap-3 border-b border-bordure p-3.5">
        {navire && (
          <Image src={navire.photo} alt="" width={56} height={40} className="h-10 w-14 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-encre">{navire?.nom}</p>
          <p className="text-sm text-gris">Direct · {formatDuree(dureeTraversee(traversee))}</p>
        </div>
        {placesRestantes > 0 ? (
          <Badge ton="soleil">
            {placesRestantes} place{placesRestantes > 1 ? "s" : ""} restante{placesRestantes > 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge ton="alerte">Complet</Badge>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-titre text-[26px] font-bold tabular-nums text-encre">{heureLocale(traversee.departAt)}</p>
            <p className="text-sm text-gris">{depart?.nom}</p>
          </div>
          <span aria-hidden className="mb-5 h-0.5 flex-1 rounded bg-ocean" />
          <div className="text-right">
            <p className="font-titre text-[26px] font-bold tabular-nums text-encre">{heureLocale(traversee.arriveeAt)}</p>
            <p className="text-sm text-gris">{arrivee?.nom}</p>
          </div>
        </div>
        <p className="mt-3 flex gap-2 rounded-champ bg-bleu-pale px-3 py-2.5 text-sm text-marine">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Enregistrement dès {heureLocale(traversee.enregistrementOuvertureAt)}</strong>
            {terminalDepart && <> au terminal {terminalDepart.nom}</>}
          </span>
        </p>
      </div>
    </div>
  )
}
