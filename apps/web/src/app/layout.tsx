import type { Metadata } from 'next';
import { JetBrains_Mono, DM_Sans } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '../lib/SessionProvider';
import AppShell from '../components/AppShell';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '600'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kibo AI — AI-ассистент для командного онбординга',
  description:
    'Живая память команды с агентной логикой. Сократите онбординг разработчиков с 2 недель до 3 дней.',
  keywords: ['AI', 'onboarding', 'developer', 'knowledge graph', 'NestJS', 'Next.js'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${jetbrainsMono.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
