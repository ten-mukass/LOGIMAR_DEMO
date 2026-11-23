import type { NextConfig } from "next";

// Données du parcours client : dans la base quand elle est configurée, sauf en production
// (la production reste sur la démo dans le navigateur jusqu'aux étapes C et D du plan de la base).
// Seul le mot « base » ou « demo » est inscrit dans le code, jamais l'adresse de la base.
const donnees = process.env.POSTGRES_URL && process.env.VERCEL_ENV !== "production" ? "base" : "demo";

// Gestion (/admin, /scan) : comptes de l'équipe partout où Supabase est configuré, production comprise
// (étape 7C) ; sinon le code de démonstration. Là encore, seul le mot est inscrit dans le code.
const gestion =
  process.env.POSTGRES_URL && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY
    ? "comptes"
    : "code";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_LOGIMAR_DONNEES: donnees,
    NEXT_PUBLIC_LOGIMAR_GESTION: gestion,
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
