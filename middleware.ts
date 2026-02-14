import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAppRoute = pathname === '/app' || pathname.startsWith('/app/')
  // Skip Supabase session for public root and auth pages so they always load
  if (pathname === '/' || pathname === '/signin' || pathname === '/signup' || pathname.startsWith('/legal') || pathname === '/trust') {
    return NextResponse.next()
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }
  try {
    const { response, user } = await updateSession(request)
    if (isAppRoute && !user) {
      const signInUrl = request.nextUrl.clone()
      signInUrl.pathname = '/signin'
      const nextPath = `${pathname}${request.nextUrl.search || ''}`
      signInUrl.searchParams.set('next', nextPath)
      return NextResponse.redirect(signInUrl)
    }
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
