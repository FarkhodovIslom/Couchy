import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Couchy — AI-ассистент для командного обучения разработчиков",
  description: "Живая память вашей команды с агентной логикой и базой знаний в реальном времени. Сократите онбординг разработчиков с 2 недель до 3 дней.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen selection:bg-violet-500/30 selection:text-violet-200">
        {children}
      </body>
    </html>
  );
}
