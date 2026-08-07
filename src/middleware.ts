import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'stackpick_console'

/**
 * The console lists every lead captured, so it must not be world-readable. A shared token is
 * the right weight for a single-operator tool; swap it for real auth when someone else logs in.
 */
export function middleware(request: NextRequest) {
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

export const config = { matcher: ['/app/:path*'] }
