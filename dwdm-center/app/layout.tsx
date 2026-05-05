import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DWDM Architect Center',
  description: 'Production-grade LMS for DWDM network engineers — L1, L2, L3 certification program',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
