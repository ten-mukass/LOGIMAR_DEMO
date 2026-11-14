/**
 * Pages d'information (cahier des charges §3) : les textes sont à fournir par LOGIMAR.
 * Seules les phrases reprises des maquettes et des affiches sont rédigées ; le reste est signalé.
 */

export interface RubriqueAide {
  ancre: string
  titre: string
  paragraphes: string[]
}

const A_FOURNIR = "[TEXTE À FOURNIR PAR LOGIMAR]"

export const rubriquesAide: RubriqueAide[] = [
  {
    ancre: "pieces",
    titre: "Pièces d’identité et formalités",
    paragraphes: [
      "Une pièce d’identité est exigée pour chaque passager adulte ; elle est présentée à l’embarquement avec le billet.",
      "Pour les enfants et les bébés, prévoir l’acte de naissance.",
      A_FOURNIR,
    ],
  },
  {
    ancre: "bagages",
    titre: "Bagages",
    paragraphes: [
      "La franchise (soute et cabine) est indiquée sur la page d’accueil ; un bagage supplémentaire peut être ajouté à l’étape paiement.",
      A_FOURNIR,
    ],
  },
  {
    ancre: "enfants",
    titre: "Enfants, bébés et mineurs non accompagnés",
    paragraphes: ["Un bébé voyage sur les genoux d’un adulte : un bébé au plus par adulte.", A_FOURNIR],
  },
  { ancre: "accessibilite", titre: "Accessibilité et assistance à l’embarquement", paragraphes: [A_FOURNIR] },
  { ancre: "grossesse", titre: "Femmes enceintes", paragraphes: [A_FOURNIR] },
  {
    ancre: "enregistrement",
    titre: "Enregistrement",
    paragraphes: ["Tout passager arrivé après l’enregistrement ne pourra pas embarquer."],
  },
  { ancre: "faq", titre: "Questions fréquentes", paragraphes: [A_FOURNIR] },
  { ancre: "cgt", titre: "Conditions générales de transport", paragraphes: [A_FOURNIR] },
  { ancre: "confidentialite", titre: "Politique de confidentialité", paragraphes: [A_FOURNIR] },
  { ancre: "cookies", titre: "Cookies et stockage", paragraphes: ["La démonstration enregistre vos réservations dans ce navigateur uniquement.", A_FOURNIR] },
  { ancre: "mentions", titre: "Mentions légales", paragraphes: [A_FOURNIR] },
]
