import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMP | Parc biomédical",
  description: "Application de gestion du parc biomédical de la Polyclinique Groupe Médical du Plateau."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
