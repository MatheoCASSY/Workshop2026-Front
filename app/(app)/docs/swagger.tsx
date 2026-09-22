"use client";

import Script from "next/script";

// Version figée : une URL CDN sans numéro de version casserait le jour d'une
// mise à jour majeure de Swagger UI.
const VERSION = "5.17.14";
const BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${VERSION}`;

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => void;
  }
}

/**
 * Swagger UI manipule le DOM lui-même : on lui donne juste un <div> vide et
 * l'URL de la description OpenAPI.
 *
 * On le charge depuis un CDN plutôt que de l'installer en dépendance : le
 * paquet npm pèse plusieurs mégaoctets, inutiles dans le bundle de l'appli.
 */
export default function Swagger() {
  return (
    <>
      <link rel="stylesheet" href={`${BASE}/swagger-ui.css`} />

      {/* onLoad ne se déclenche qu'une fois le script réellement exécuté :
          c'est le seul moment où window.SwaggerUIBundle existe. */}
      <Script
        src={`${BASE}/swagger-ui-bundle.js`}
        onLoad={() =>
          window.SwaggerUIBundle?.({
            url: "/api/openapi",
            domNode: document.getElementById("swagger"),
            docExpansion: "list",
            // « Try it out » doit envoyer le cookie de session, sinon toutes
            // les routes répondent 401.
            requestInterceptor: (req: { credentials?: string }) => {
              req.credentials = "same-origin";
              return req;
            },
          })
        }
      />

      {/* Swagger UI est conçu pour un fond clair : on lui réserve un encadré
          blanc plutôt que de réécrire tout son thème. */}
      <div id="swagger" className="rounded bg-white p-2 text-black" />
    </>
  );
}
