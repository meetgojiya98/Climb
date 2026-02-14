import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function hashToken(value: string | undefined): string {
  if (!value) return 'session-unknown'
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `session-${Math.abs(hash)}`
}

function isMissingRelationError(message: string): boolean {
  const text = message.toLowerCase()
  return text.includes('does not exist') || text.includes('relation') || text.includes('column')
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && (request.nextUrl.pathname === '/app' || request.nextUrl.pathname.startsWith('/app/'))) {
    const sessionKey = hashToken(request.cookies.get('sb-access-token')?.value)
    const heartbeat = await supabase.from('user_sessions').upsert(
      {
        user_id: user.id,
        session_key: sessionKey,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        user_agent: request.headers.get('user-agent'),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,session_key' }
    )
    if (heartbeat.error && !isMissingRelationError(String(heartbeat.error.message || ''))) {
      console.error('Session heartbeat error:', heartbeat.error)
    }
  }

  return { response, user }
}
