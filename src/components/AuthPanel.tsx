'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuthUserInfo {
  email: string | null
}

export default function AuthPanel() {
  const [user, setUser] = useState<AuthUserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const ensuredRef = useRef(false)
  const router = useRouter()
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : undefined)

  const cleanAuthParamsFromUrl = () => {
    if (typeof window === 'undefined') return
    const hasSearch = !!window.location.search
    const hasHash = !!window.location.hash
    if (!hasSearch && !hasHash) return

    if (hasSearch) {
      const url = new URL(window.location.href)
      url.searchParams.delete('access_token')
      url.searchParams.delete('refresh_token')
      url.searchParams.delete('provider_token')
      url.searchParams.delete('expires_in')
      url.searchParams.delete('expires_at')
      url.searchParams.delete('token_type')
      url.searchParams.delete('provider')
      url.searchParams.delete('error')
      url.searchParams.delete('code')
      const newSearch = url.searchParams.toString()
      const base = url.origin + url.pathname + (newSearch ? `?${newSearch}` : '')
      window.history.replaceState(null, '', base)
    }

    if (hasHash) {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash) {
        const params = new URLSearchParams(hash)
        params.delete('access_token')
        params.delete('refresh_token')
        params.delete('provider_token')
        params.delete('expires_in')
        params.delete('expires_at')
        params.delete('token_type')
        params.delete('provider')
        params.delete('error')
        params.delete('code')
        const newHash = params.toString()
        const base =
          window.location.pathname +
          (window.location.search || '') +
          (newHash ? `#${newHash}` : '')
        window.history.replaceState(null, '', base)
      }
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const currentUser = data.session?.user ?? null
      setUser(currentUser ? { email: currentUser.email ?? null } : null)
      setLoading(false)
      cleanAuthParamsFromUrl()
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u ? { email: u.email ?? null } : null)
      cleanAuthParamsFromUrl()
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const ensureUserRow = async () => {
      if (!user?.email || ensuredRef.current) return
      try {
        const { data: auth } = await supabase.auth.getUser()
        const authUser = auth.user
        if (!authUser?.id || !authUser.email) return

        const { error: upsertError } = await supabase
          .from('users')
          .upsert({ id: authUser.id, email: authUser.email }, { onConflict: 'id' })

        if (upsertError) {
          console.error('Failed to upsert user row:', upsertError)
          return
        }

        ensuredRef.current = true
      } catch (e) {
        console.error('ensureUserRow error:', e)
      }
    }

    ensureUserRow()
  }, [user])

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: siteUrl,
        queryParams: {
          prompt: 'select_account'
        }
      }
    })
  }

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      setUser(null)
      ensuredRef.current = false
      cleanAuthParamsFromUrl()
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm transition-colors"
      >
        Google로 로그인
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-900 dark:text-zinc-100">{user.email}</span>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100"
      >
        {signingOut ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  )
}