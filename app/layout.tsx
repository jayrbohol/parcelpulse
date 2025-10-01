import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ParcelPulse',
  description: 'Track parcels with live context',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-white antialiased">
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </body>
    </html>
  )
}
