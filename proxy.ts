/**
 * Protection des pages de l'équipe côté serveur (étape 7C, docs/PLAN_BASE_DE_DONNEES.md).
 * /admin et /scan : il faut une session Supabase valide, un profil actif, un mot de passe définitif et le
 * droit du rôle (domain/roles.ts). Les actions serveur revérifient chacune de leur côté.
 * Mode « code » (poste local sans base) : rien n'est filtré, le code de démonstration protège l'écran.
 */
import { NextResponse, type NextRequest } from "next/server"
import { accueilDuRole, droitPourChemin, peut } from "@/domain/roles"
import { gestionParComptes } from "@/services/mode-gestion"
import { serviceComptes } from "@/services/serveur/session-gestion"
import { clientSession } from "@/services/serveur/supabase"

export async function proxy(request: NextRequest) {
  if (!gestionParComptes) return NextResponse.next()

  // Session Supabase relue et rafraîchie : les cookies renouvelés repartent avec la réponse.
  let reponse = NextResponse.next({ request })
  const supabase = clientSession({
    getAll: () => request.cookies.getAll(),
    setAll: (liste) => {
      for (const { name, value } of liste) request.cookies.set(name, value)
      reponse = NextResponse.next({ request })
      for (const { name, value, options } of liste) reponse.cookies.set(name, value, options)
    },
  })
  const { data } = await supabase.auth.getUser()

  const chemin = request.nextUrl.pathname
  const droit = droitPourChemin(chemin)
  if (!droit) return reponse

  const versPage = (page: string) => {
    const redirection = NextResponse.redirect(new URL(page, request.url))
    for (const c of reponse.cookies.getAll()) redirection.cookies.set(c)
    return redirection
  }
  const demandee = chemin + request.nextUrl.search
  const connexion = `/gestion/connexion?suite=${encodeURIComponent(demandee)}`

  if (!data.user) return versPage(connexion)
  const profil = await serviceComptes().profilActif(data.user.id)
  if (!profil) return versPage(`${connexion}&refus=1`)
  if (profil.doitChangerMotDePasse) return versPage(`/gestion/mot-de-passe?suite=${encodeURIComponent(demandee)}`)
  if (!peut(profil.role, droit)) return versPage(accueilDuRole(profil.role))
  return reponse
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/scan", "/scan/:path*", "/gestion/:path*"],
}
