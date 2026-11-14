import type { Metadata, Viewport } from "next"
import { Inter, Montserrat } from "next/font/google"
import { BandeauDemo } from "@/components/site/bandeau-demo"
import { EnTeteOrdinateur } from "@/components/site/en-tete-ordinateur"
import { NavigationBasse } from "@/components/site/navigation-basse"
import "./globals.css"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "LOGIMAR 241 — Réservez votre traversée Libreville ⇄ Port-Gentil",
    template: "%s — LOGIMAR 241",
  },
  description:
    "Réservez votre traversée entre Libreville et Port-Gentil à bord du Victoria Jet. Version de démonstration.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#0F3A73",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-dvh">
        <BandeauDemo />
        <EnTeteOrdinateur />
        {children}
        <NavigationBasse />
      </body>
    </html>
  )
}
