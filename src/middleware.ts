import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Edge Middleware for Server-Side Route Protection
 * 
 * Inspects incoming request cookies for Appwrite session tokens (`a_session_*`).
 * Intercepts unauthenticated requests targeting protected `/app/*` and `/onboarding` routes,
 * redirecting them to `/auth/login` before page HTML rendering.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route requires authentication
  const isProtectedRoute = pathname.startsWith('/app') || pathname.startsWith('/onboarding')
  const isAuthRoute = pathname.startsWith('/auth')

  // Inspect cookies for any Appwrite session cookie (a_session_<project_id> or legacy session)
  const cookies = request.cookies.getAll()
  const hasAppwriteSession = cookies.some(
    (c) => c.name.startsWith('a_session_') || c.name === 'appwrite_session' || c.name === 'session'
  )

  // 1. Unauthenticated request trying to access protected routes -> redirect to login
  if (isProtectedRoute && !hasAppwriteSession) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Authenticated user trying to access auth pages (login/signup) -> redirect to app dashboard
  if (isAuthRoute && hasAppwriteSession && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files, _next, favicon
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
