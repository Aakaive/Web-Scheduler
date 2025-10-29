'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function AuthUrlCleaner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const cleanQuery = () => {
      const url = new URL(window.location.href)
      const keys = [
        'access_token',
        'refresh_token',
        'provider_token',
        'expires_in',
        'expires_at',
        'token_type',
        'provider',
        'error',
        'code',
      ]
      let changed = false
      keys.forEach((k) => {
        if (url.searchParams.has(k)) {
          url.searchParams.delete(k)
          changed = true
        }
      })
      if (changed) {
        const qs = url.searchParams.toString()
        const base = url.origin + url.pathname + (qs ? `?${qs}` : '')
        window.history.replaceState(null, '', base)
      }
    }

    const cleanHash = () => {
      const raw = window.location.hash.replace(/^#/, '')
      if (!raw) return
      const params = new URLSearchParams(raw)
      const keys = [
        'access_token',
        'refresh_token',
        'provider_token',
        'expires_in',
        'expires_at',
        'token_type',
        'provider',
        'error',
        'code',
      ]
      let changed = false
      keys.forEach((k) => {
        if (params.has(k)) {
          params.delete(k)
          changed = true
        }
      })
      if (changed) {
        const newHash = params.toString()
        const base = window.location.pathname + (window.location.search || '') + (newHash ? `#${newHash}` : '')
        window.history.replaceState(null, '', base)
      }
    }

    cleanQuery()
    cleanHash()
  }, [pathname, searchParams])

  return null
}


