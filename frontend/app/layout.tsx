import './globals.css';

export const metadata = {
  title: 'Analizador de Código',
  description: 'Plataforma de análisis de código con SonarQube',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}