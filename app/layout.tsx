import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Tipografia institucional Gardner. Confirmado explicitamente por Alan que el
// panel de SAG debe seguir usando Calibri y NO Inter, pese a que el mockup de
// diseno original lo proponia -- prioridad a la identidad visual oficial.
const calibri = localFont({
  src: [
    { path: "../public/fonts/calibri-regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/calibri-bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-calibri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAG · Sistema de Acceso Gardner",
  description: "Panel administrativo del Sistema de Acceso Gardner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${calibri.variable} h-full antialiased`}>
      <head>
        {/* Material Symbols: solo el set de íconos del rediseño (Google Stitch, 2026-09-06).
            La tipografía sigue siendo Calibri -- Alan confirmó explícitamente no usar Inter. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
