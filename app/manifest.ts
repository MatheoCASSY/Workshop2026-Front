import type { MetadataRoute } from "next";

/** Convention de fichier Next : sert /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fige l'identité de l'appli installée : sans lui, changer start_url
    // un jour ferait apparaitre une seconde icone au lieu d'en mettre à jour une.
    id: "/",
    name: "CrewDesk",
    short_name: "CrewDesk",
    description: "Gestion des incidents — Station Horizon",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#05070f",
    theme_color: "#4fd1ff",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
