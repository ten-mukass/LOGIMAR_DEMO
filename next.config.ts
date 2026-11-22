import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
