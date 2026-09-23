import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { COULEUR_BARRE, SCRIPT_THEME } from "@/lib/theme";
import ServiceWorkerRegister from "./service-worker-register";

// Les deux polices de la maquette. next/font les télécharge au build et les
// sert depuis notre domaine : pas d'appel à Google au chargement de la page.
const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrewDesk",
  description: "Gestion des incidents — Station Horizon",
  applicationName: "CrewDesk",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CrewDesk" },
  // iOS ignore les icones du manifeste : sans ce lien, une appli ajoutee a
  // l'ecran d'accueil depuis Safari recupere une capture de la page.
  icons: { apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  // Valeur de depart, corrigee des le script de theme si l'appli s'ouvre en
  // clair. Une seule balise, pas deux variantes en media query : c'est le
  // choix de l'utilisateur qui decide, pas seulement celui du systeme.
  themeColor: COULEUR_BARRE.sombre,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : le script ci-dessous pose data-theme sur
    // <html> avant que React n'arrive. Sans ça, React signalerait un écart
    // entre le HTML du serveur et celui qu'il attendait.
    <html
      lang="fr"
      className={`${chakra.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/* Bloquant et place avant tout contenu : il doit s'executer avant la
            premiere peinture, sinon on verrait le thème sombre apparaitre une
            fraction de seconde avant de basculer en clair. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />

        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
