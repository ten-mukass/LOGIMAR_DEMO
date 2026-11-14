import { AvantDePartir } from "@/components/accueil/avant-de-partir"
import { ContactAgences } from "@/components/accueil/contact-agences"
import { FormulaireRecherche } from "@/components/accueil/formulaire-recherche"
import { InfoTraficAccueil } from "@/components/accueil/info-trafic"
import { PresentationNavire } from "@/components/accueil/presentation-navire"
import { ProchainesTraversees } from "@/components/accueil/prochaines-traversees"
import { Logo } from "@/components/site/logo"
import { dureeTypeMinutes } from "@/domain/programme"
import { repository } from "@/services"

const NOMS_MOYENS = { airtel: "Airtel Money", moov: "Moov Money" } as const

export default async function Accueil() {
  const { config, ports, lignes, navires, regles, agences } = await repository.getReferentiel()
  const navire = navires[0]
  const moyens = (Object.keys(NOMS_MOYENS) as (keyof typeof NOMS_MOYENS)[])
    .filter((m) => config.moyensPaiementActifs[m])
    .map((m) => NOMS_MOYENS[m])

  return (
    <main>
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[calc(100%-150px)] rounded-b-[28px] bg-marine lg:h-full lg:rounded-none"
        />
        <div className="relative mx-auto max-w-5xl px-5 pt-5 md:px-8 md:pt-10 lg:grid lg:grid-cols-[1fr_440px] lg:items-center lg:gap-12 lg:py-14">
          <div className="text-white">
            <div className="mb-4 flex items-center gap-3 md:hidden">
              <Logo />
              <span className="font-titre text-lg font-extrabold">LOGIMAR 241</span>
            </div>
            <InfoTraficAccueil />
            <h1 className="mt-5 text-[30px] font-extrabold leading-[1.15] md:text-[42px]">
              {ports.map((p) => p.nom).join(" ⇄ ")} à bord du {navire.nom}
            </h1>
            {moyens.length > 0 && (
              <p className="mt-2 text-[16px] text-white/90 md:text-[18px]">
                Réservez en 2 minutes, payez par {moyens.join(" ou ")}.
              </p>
            )}
          </div>
          <FormulaireRecherche ports={ports} lignes={lignes} config={config} className="mt-5 md:mt-8 lg:mt-0" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-9 px-5 py-8 md:px-8 md:py-12">
        <ProchainesTraversees lignes={lignes} ports={ports} config={config} />
        <PresentationNavire navire={navire} dureeTypeMinutes={dureeTypeMinutes(regles)} />
        <AvantDePartir />
        <ContactAgences agences={agences} />
      </div>
    </main>
  )
}
