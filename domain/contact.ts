/**
 * Contact de la réservation : au moins un téléphone ou un e-mail (cahier des charges §4.5).
 * Le format exact des numéros gabonais est à confirmer : la validation reste volontairement souple
 * (indicatif +241 facultatif, 7 à 9 chiffres).
 */

const INDICATIF = "241"

/** Chiffres du numéro national, sans indicatif ni séparateurs ; null si ce n'est pas un numéro. */
export function chiffresTelephone(saisie: string): string | null {
  const brut = saisie.trim()
  if (!/^[+\d][\d\s.\-()]*$/.test(brut)) return null
  let chiffres = brut.replace(/\D/g, "")
  if (brut.startsWith("+") || chiffres.startsWith("00")) {
    chiffres = chiffres.replace(/^00/, "")
    if (!chiffres.startsWith(INDICATIF)) return null
    chiffres = chiffres.slice(INDICATIF.length)
  }
  return /^\d{7,9}$/.test(chiffres) ? chiffres : null
}

export function estTelephoneValide(saisie: string): boolean {
  return chiffresTelephone(saisie) !== null
}

/** « +241 07 12 34 56 » : chiffres groupés par deux en partant de la fin. */
export function formaterTelephone(saisie: string): string | null {
  const chiffres = chiffresTelephone(saisie)
  if (!chiffres) return null
  const groupes: string[] = []
  for (let fin = chiffres.length; fin > 0; fin -= 2) groupes.unshift(chiffres.slice(Math.max(0, fin - 2), fin))
  if (groupes[0].length === 1 && groupes.length > 1) {
    const premier = groupes.shift() as string
    groupes[0] = premier + groupes[0]
  }
  return `+${INDICATIF} ${groupes.join(" ")}`
}

export function estEmailValide(saisie: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(saisie.trim())
}

export interface SaisieContact {
  telephone: string
  email: string
}

export function validerContact(c: SaisieContact): { telephone?: string; email?: string; general?: string } {
  const erreurs: { telephone?: string; email?: string; general?: string } = {}
  const tel = c.telephone.trim()
  const mail = c.email.trim()
  if (!tel && !mail) erreurs.general = "Renseignez au moins un téléphone ou un e-mail."
  if (tel && !estTelephoneValide(tel)) erreurs.telephone = "Numéro de téléphone invalide."
  if (mail && !estEmailValide(mail)) erreurs.email = "Adresse e-mail invalide."
  return erreurs
}
