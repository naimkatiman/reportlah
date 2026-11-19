import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Reportlah', description: 'Many complaints about one public facility become one report.' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <head>
        {/* Falls back to system fonts when the venue network is down. */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
