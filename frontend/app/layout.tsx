import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Analizador de Código',
  description: 'Analiza tu código con SonarQube e IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}