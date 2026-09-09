import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'stackpick_console'

/**
 * The console lists every lead captured, so it must not be world-readable. A shared token is
 * the right weight for a single-operator tool; swap it for real auth when someone else logs in.
 */
export function proxy(request: NextRequest) {
  // Heroku terminates TLS at its router and overwrites X-Forwarded-Proto. The URL
  // reaching Next may therefore be HTTP even when the visitor used HTTPS.
  // Only our public hosts and read requests participate; local previews and APIs keep their URLs.
  const host = request.headers.get('host')?.toLowerCase().replace(/:\d+$/, '')
  const protocol = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  const publicHost = host === 'letagentsin.com' || host === 'www.letagentsin.com'
  const readRequest = request.method === 'GET' || request.method === 'HEAD'
  const api = request.nextUrl.pathname === '/api' || request.nextUrl.pathname.startsWith('/api/')
  if (publicHost && readRequest && !api && (host === 'www.letagentsin.com' || protocol === 'http')) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    url.host = 'letagentsin.com'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  if (request.nextUrl.pathname !== '/app' && !request.nextUrl.pathname.startsWith('/app/')) {
    return NextResponse.next()
  }

  const expected = process.env.STACKPICK_CONSOLE_TOKEN
  if (!expected) {
    return new NextResponse('Console is disabled: STACKPICK_CONSOLE_TOKEN is not set.', { status: 503 })
  }

  const fromQuery = request.nextUrl.searchParams.get('key')
  if (fromQuery === expected) {
    const url = request.nextUrl.clone()
    url.searchParams.delete('key')
    const response = NextResponse.redirect(url)
    response.cookies.set(COOKIE, expected, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
    return response
  }

  if (request.cookies.get(COOKIE)?.value === expected) return NextResponse.next()

  return new NextResponse('Not found', { status: 404 })
}

export const config = { matcher: ['/((?!api/|_next/).*)'] }
