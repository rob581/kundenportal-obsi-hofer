import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OBSI Hofer GmbH Kundenportal",
  description: "Geräte und Prüfberichte im Überblick",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
