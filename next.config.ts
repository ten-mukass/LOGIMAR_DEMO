import type { NextConfig } from "next";

// Données du parcours client : dans la base quand elle est configurée, sauf en production
// (la production reste sur la démo dans le navigateur jusqu'aux étapes C et D du plan de la base).
// Seul le mot « base » ou « demo » est inscrit dans le code, jamais l'adresse de la base.
const donnees = process.env.POSTGRES_URL && process.env.VERCEL_ENV !== "production" ? "base" : "demo";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LOGIMAR_DONNEES: donnees,
  },
  // Racine explicite : évite que Turbopack prenne un package-lock.json
  // situé dans un dossier parent pour la racine du projet.
  turbopack: {
    root: __dirname,
  },
  // En développement seulement : l'indicateur de Next.js passe à droite pour ne pas
  // couvrir le bas du menu latéral de la gestion.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
