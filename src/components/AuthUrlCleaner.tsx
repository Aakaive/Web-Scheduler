'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthUrlCleaner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const cleanQuery = async () => {
      const url = new URL(window.location.href)
      
      // provider_token을 세션에 저장하기 전에 추출
      const providerToken = url.searchParams.get('provider_token')
      
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
      
      // provider_token이 있으면 localStorage에 저장
      if (providerToken) {
        console.log('Found provider_token in URL (query), saving to localStorage')
        localStorage.setItem('google_provider_token', providerToken)
      } else {
        console.log('No provider_token found in URL query params')
      }
    }

    const cleanHash = async () => {
      const raw = window.location.hash.replace(/^#/, '')
      if (!raw) return
      const params = new URLSearchParams(raw)
      
      // provider_token을 세션에 저장하기 전에 추출
      const providerToken = params.get('provider_token')
      
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
      
      // provider_token이 있으면 localStorage에 저장
      if (providerToken) {
        console.log('Found provider_token in URL (hash), saving to localStorage')
        localStorage.setItem('google_provider_token', providerToken)
      } else {
        console.log('No provider_token found in URL hash')
      }
    }

    cleanQuery()
    cleanHash()
  }, [pathname, searchParams])

  return null
}