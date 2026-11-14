/**
 * Démo : compte conservé sur l'appareil. Mot de passe haché (PBKDF2), codes à usage unique hachés,
 * e-mails visibles dans l'aperçu. En production : base de données, envoi réel, limitation des essais côté serveur.
 */
import { estEmailValide, formaterTelephone } from "@/domain/contact"
import { emailCode } from "@/domain/messages"
import type { Client, CodeVerification, PassagerEnregistre, Reservation } from "@/domain/types"
import type { NotificationService } from "../notification/notification-service"
import type { Repository } from "../repository/repository"
import { lireJson, type Stockage } from "../stockage"
import type { AuthService, EtatSession, ResultatAuth } from "./auth-service"

const CLE_SESSION = "logimar-demo:v2:session"
const ITERATIONS = 100_000
const VALIDITE_CODE_MIN = 15
const ESSAIS_MAX = 5
const LONGUEUR_MIN = 8

interface Session {
  clientId: string
}

function base64(octets: ArrayBuffer | Uint8Array): string {
  const tableau = octets instanceof Uint8Array ? octets : new Uint8Array(octets)
  let binaire = ""
  for (const o of tableau) binaire += String.fromCharCode(o)
  return btoa(binaire)
}

async function hacherMotDePasse(motDePasse: string, sel: string): Promise<string> {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(motDePasse), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sel), iterations: ITERATIONS },
    cle,
    256,
  )
  return base64(bits)
}

async function hacherCode(code: string, clientId: string): Promise<string> {
  return base64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${clientId}:${code}`)))
}

/** E-mail en minuscules ou téléphone au format +241 … ; null si ce n'est ni l'un ni l'autre. */
export function normaliserIdentifiant(saisie: string): string | null {
  const s = saisie.trim()
  if (s.includes("@")) return estEmailValide(s) ? s.toLowerCase() : null
  return formaterTelephone(s)
}

function cleIdentite(p: Omit<PassagerEnregistre, "id">): string {
  return `${p.nom}|${p.prenom}|${p.dateNaissance ?? ""}`.toLowerCase()
}

export class LocalAuthService implements AuthService {
  constructor(
    private readonly d: {
      repository: Repository
      notifications: NotificationService
      stockage: Stockage
      horloge: () => Date
      aleatoire: () => number
      genererId: () => string
    },
  ) {}

  private lireSession(): Session | null {
    return lireJson<Session | null>(this.d.stockage, CLE_SESSION, null)
  }

  private ouvrirSession(clientId: string | null): void {
    this.d.stockage.ecrire(CLE_SESSION, JSON.stringify(clientId ? { clientId } : null))
  }

  async session(): Promise<EtatSession | null> {
    const s = this.lireSession()
    const client = s ? await this.d.repository.getClient(s.clientId) : null
    return client ? { client, verificationRequise: client.email !== null && client.emailVerifieLe === null } : null
  }

  private async envoyerCode(client: Client, objet: CodeVerification["objet"]): Promise<string> {
    const code = String(Math.floor(this.d.aleatoire() * 1_000_000)).padStart(6, "0")
    await this.d.repository.supprimerCodes(client.id)
    await this.d.repository.enregistrerCode({
      id: this.d.genererId(),
      clientId: client.id,
      objet,
      canal: "email",
      destinataire: client.email as string,
      codeHash: await hacherCode(code, client.id),
      expireAt: new Date(this.d.horloge().getTime() + VALIDITE_CODE_MIN * 60_000).toISOString(),
      tentatives: 0,
    })
    const message = emailCode(code, objet, VALIDITE_CODE_MIN)
    const envoi = await this.d.notifications.envoyerEmail({
      destinataire: client.email as string,
      ...message,
      pieces: [],
      commandeId: null,
      clientId: client.id,
    })
    return envoi.id
  }

  private async controlerCode(client: Client, objet: CodeVerification["objet"], code: string): Promise<string | null> {
    const enregistre = await this.d.repository.dernierCode(client.id, objet)
    if (!enregistre) return "Aucun code en cours : demandez-en un nouveau."
    if (Date.parse(enregistre.expireAt) < this.d.horloge().getTime()) return "Ce code a expiré : demandez-en un nouveau."
    if (enregistre.tentatives >= ESSAIS_MAX) return "Trop d’essais : demandez un nouveau code."
    if ((await hacherCode(code.trim(), client.id)) !== enregistre.codeHash) {
      await this.d.repository.enregistrerCode({ ...enregistre, tentatives: enregistre.tentatives + 1 })
      return "Code incorrect."
    }
    await this.d.repository.supprimerCodes(client.id)
    return null
  }

  /** Rattache des réservations au compte et enregistre leurs passagers. */
  private async rattacher(client: Client, reservations: Reservation[]): Promise<Client> {
    const ids = new Set([...client.reservationIds, ...reservations.map((r) => r.id)])
    const connus = new Set(client.passagers.map(cleIdentite))
    const nouveaux: PassagerEnregistre[] = []
    for (const p of reservations.flatMap((r) => r.passagers)) {
      const enregistre = {
        categorie: p.categorie,
        nom: p.nom,
        prenom: p.prenom,
        dateNaissance: p.dateNaissance,
        typePiece: p.typePiece,
        numeroPiece: p.numeroPiece,
      }
      if (connus.has(cleIdentite(enregistre))) continue
      connus.add(cleIdentite(enregistre))
      nouveaux.push({ id: this.d.genererId(), ...enregistre })
    }
    const misAJour: Client = { ...client, reservationIds: [...ids], passagers: [...client.passagers, ...nouveaux] }
    await this.d.repository.enregistrerClient(misAJour)
    return misAJour
  }

  async creerCompte(commandeId: string, motDePasse: string): Promise<ResultatAuth<EtatSession & { envoiId: string | null }>> {
    const { repository } = this.d
    if (motDePasse.length < LONGUEUR_MIN) return { ok: false, message: `Choisissez un mot de passe d’au moins ${LONGUEUR_MIN} caractères.` }
    const commande = await repository.getCommande(commandeId)
    if (!commande || commande.statut !== "payee") return { ok: false, message: "Réservation introuvable sur cet appareil." }
    const identifiant = commande.email ?? commande.telephone
    if (!identifiant) return { ok: false, message: "Aucun contact sur cette réservation." }
    if (await repository.trouverClient(identifiant)) {
      return { ok: false, message: "Un compte existe déjà avec cet identifiant : connectez-vous." }
    }
    const sel = base64(crypto.getRandomValues(new Uint8Array(16)))
    let client: Client = {
      id: this.d.genererId(),
      telephone: commande.telephone,
      email: commande.email,
      emailVerifieLe: null,
      motDePasseHash: await hacherMotDePasse(motDePasse, sel),
      sel,
      langue: "fr",
      reservationIds: [],
      passagers: [],
      creeLe: this.d.horloge().toISOString(),
    }
    const reservations: Reservation[] = []
    for (const id of commande.reservationIds) {
      const r = await repository.getReservation(id)
      if (r) reservations.push(r)
    }
    client = await this.rattacher(client, reservations)
    await repository.enregistrerCommande({ ...commande, clientId: client.id })
    this.ouvrirSession(client.id)
    const envoiId = client.email ? await this.envoyerCode(client, "verification") : null
    return { ok: true, valeur: { client, verificationRequise: envoiId !== null, envoiId } }
  }

  async verifierCode(code: string): Promise<ResultatAuth<Client>> {
    const etat = await this.session()
    if (!etat) return { ok: false, message: "Session expirée : connectez-vous." }
    const erreur = await this.controlerCode(etat.client, "verification", code)
    if (erreur) return { ok: false, message: erreur }
    let client: Client = { ...etat.client, emailVerifieLe: this.d.horloge().toISOString() }
    // E-mail vérifié : on rattache les réservations faites avec cette adresse.
    const memeEmail = (await this.d.repository.listerReservationsLocales()).filter(
      (r) => r.email === client.email && ["emise", "embarquee", "absente"].includes(r.statut),
    )
    client = await this.rattacher(client, memeEmail)
    return { ok: true, valeur: client }
  }

  async renvoyerCode(): Promise<ResultatAuth<{ envoiId: string }>> {
    const etat = await this.session()
    if (!etat?.client.email) return { ok: false, message: "Aucune adresse e-mail à vérifier." }
    return { ok: true, valeur: { envoiId: await this.envoyerCode(etat.client, "verification") } }
  }

  async connecter(identifiant: string, motDePasse: string): Promise<ResultatAuth<EtatSession & { envoiId: string | null }>> {
    const normalise = normaliserIdentifiant(identifiant)
    const client = normalise ? await this.d.repository.trouverClient(normalise) : null
    // Même message dans les deux cas : on ne révèle pas si un compte existe.
    if (!client || (await hacherMotDePasse(motDePasse, client.sel)) !== client.motDePasseHash) {
      return { ok: false, message: "Identifiant ou mot de passe incorrect." }
    }
    this.ouvrirSession(client.id)
    const verificationRequise = client.email !== null && client.emailVerifieLe === null
    const envoiId = verificationRequise ? await this.envoyerCode(client, "verification") : null
    return { ok: true, valeur: { client, verificationRequise, envoiId } }
  }

  async deconnecter(): Promise<void> {
    this.ouvrirSession(null)
  }

  async demanderReinitialisation(
    identifiant: string,
  ): Promise<ResultatAuth<{ canal: "email"; envoiId: string } | { canal: "agence" }>> {
    const normalise = normaliserIdentifiant(identifiant)
    if (!normalise) return { ok: false, message: "Identifiant invalide." }
    if (!normalise.includes("@")) return { ok: true, valeur: { canal: "agence" } } // SMS en V2
    const client = await this.d.repository.trouverClient(normalise)
    if (!client) return { ok: false, message: "Aucun compte avec cette adresse." }
    return { ok: true, valeur: { canal: "email", envoiId: await this.envoyerCode(client, "reinitialisation") } }
  }

  async reinitialiser(identifiant: string, code: string, motDePasse: string): Promise<ResultatAuth<Client>> {
    if (motDePasse.length < LONGUEUR_MIN) return { ok: false, message: `Au moins ${LONGUEUR_MIN} caractères.` }
    const normalise = normaliserIdentifiant(identifiant)
    const client = normalise ? await this.d.repository.trouverClient(normalise) : null
    if (!client) return { ok: false, message: "Aucun compte avec cette adresse." }
    const erreur = await this.controlerCode(client, "reinitialisation", code)
    if (erreur) return { ok: false, message: erreur }
    const sel = base64(crypto.getRandomValues(new Uint8Array(16)))
    const misAJour: Client = {
      ...client,
      sel,
      motDePasseHash: await hacherMotDePasse(motDePasse, sel),
      emailVerifieLe: client.emailVerifieLe ?? this.d.horloge().toISOString(),
    }
    await this.d.repository.enregistrerClient(misAJour)
    this.ouvrirSession(misAJour.id)
    return { ok: true, valeur: misAJour }
  }

  async enregistrerPassagers(passagers: Omit<PassagerEnregistre, "id">[]): Promise<void> {
    const etat = await this.session()
    if (!etat) return
    const connus = new Set(etat.client.passagers.map(cleIdentite))
    const nouveaux = passagers
      .filter((p) => !connus.has(cleIdentite(p)))
      .map((p) => ({ id: this.d.genererId(), ...p }))
    if (nouveaux.length > 0) {
      await this.d.repository.enregistrerClient({ ...etat.client, passagers: [...etat.client.passagers, ...nouveaux] })
    }
  }

  async supprimerPassager(id: string): Promise<void> {
    const etat = await this.session()
    if (!etat) return
    await this.d.repository.enregistrerClient({
      ...etat.client,
      passagers: etat.client.passagers.filter((p) => p.id !== id),
    })
  }

  async supprimerCompte(): Promise<void> {
    const etat = await this.session()
    if (etat) await this.d.repository.supprimerClient(etat.client.id)
    this.ouvrirSession(null)
  }
}
