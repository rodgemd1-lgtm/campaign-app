import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Resume Scorer - Instant Resume Analysis',
  description: 'Upload your resume and get instant AI-powered feedback to optimize it for ATS systems and increase your chances of landing interviews.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}