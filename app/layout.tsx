import type { Metadata, Viewport } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";
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
};

export const viewport: Viewport = {
  themeColor: "#05070f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${chakra.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
