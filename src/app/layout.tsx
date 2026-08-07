import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  // Without this Next resolves the file-based OG image against localhost, so every
  // scorecard forwarded to Slack or LinkedIn arrived as a bare link with no card.
  metadataBase: new URL(process.env.STACKPICK_BASE_URL ?? 'http://localhost:3000'),
  title: 'StackPick: will an AI agent pick your product?',
  description:
    'Measures whether an AI coding agent can find, register with and integrate your product. Deterministic checks, published formula, reproducible score.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} font-sans antialiased`}>
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-6 py-4">
            <Link href="/" className="font-mono text-base font-semibold tracking-tight">
              Stack<span className="text-brass">Pick</span>
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs uppercase tracking-widest text-ink-faint">
              <Link href="/docs" className="hover:text-ink">
                Docs
              </Link>
              <Link href="/methodology" className="hover:text-ink">
                Methodology
              </Link>
              <Link href="/report" className="hover:text-ink">
                Report
              </Link>
              <Link href="/findings" className="hover:text-ink">
                Findings
              </Link>
              <Link href="/pricing" className="hover:text-ink">
                Pricing
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-24 border-t border-rule">
          <div className="mx-auto max-w-5xl px-6 py-8 font-mono text-xs text-ink-faint">
            StackPick measures agent behaviour, not marketing. Every check on the free scan is an HTTP
            request with a published rule.
          </div>
        </footer>
      </body>
    </html>
  )
}
