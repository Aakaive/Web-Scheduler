'use client'

import { useCallback, useEffect, useState } from 'react'
import { Category, getCategoriesByWorkspace } from '@/lib/supabase'

interface Options {
  enabled?: boolean
  refreshKey?: string | number
}

export const useWorkspaceCategories = (
  workspaceId?: string | null,
  options: Options = {}
) => {
  const { enabled = true, refreshKey } = options
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!workspaceId) {
      setCategories([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getCategoriesByWorkspace(workspaceId)
      setCategories(data)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '태그를 불러오지 못했습니다.'
      )
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!enabled) return
    fetchCategories()
  }, [enabled, fetchCategories, refreshKey])

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
  }
}

