import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Racine explicite : évite que Turbopack prenne un package-lock.json
  // situé dans un dossier parent pour la racine du projet.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
