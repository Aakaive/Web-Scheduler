'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Workspace {
  id: string // int8 comes back as string in JS
  user_id: string
  title: string
  created_at: string
}

export default function WorkspaceList() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    fetchWorkspaces(userId)
  }, [userId])

  const fetchWorkspaces = async (uid: string) => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (err) throw err
      setWorkspaces((data as Workspace[]) || [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '워크스페이스를 불러오지 못했어요')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!userId || creating) return
    try {
      setCreating(true)
      const defaultTitle = `새 워크스페이스 ${new Date().toLocaleString('ko-KR')}`
      const { data, error: err } = await supabase
        .from('workspaces')
        .insert({ user_id: userId, title: defaultTitle })
        .select('*')
        .single()

      if (err) throw err
      if (data) {
        setWorkspaces(prev => [data as Workspace, ...prev])
      } else {
        // fallback: refetch
        await fetchWorkspaces(userId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '워크스페이스 생성에 실패했어요')
    } finally {
      setCreating(false)
    }
  }

  const content = useMemo(() => {
    if (!userId) {
      return (
        <div className="text-zinc-600 dark:text-zinc-400">로그인 후 이용해 주세요.</div>
      )
    }
    if (loading) {
      return (
        <div className="text-zinc-600 dark:text-zinc-400">불러오는 중...</div>
      )
    }
    if (error) {
      return (
        <div className="text-red-600 dark:text-red-400">{error}</div>
      )
    }
    if (workspaces.length === 0) {
      return (
        <div className="text-zinc-600 dark:text-zinc-400">아직 워크스페이스가 없습니다. 상단의 + 버튼으로 만들어 보세요.</div>
      )
    }
    return (
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        {workspaces.map(ws => (
          <li key={ws.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => router.push(`/workspace/${ws.id}`)}
            >
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ws.title}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(ws.created_at).toLocaleString('ko-KR')}</div>
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation() // 클릭 이벤트가 부모로 전파되지 않도록 방지
                if (!userId || deletingId) return
                const ok = window.confirm('워크스페이스를 삭제하시겠습니까?')
                if (!ok) return
                try {
                  setDeletingId(ws.id)
                  const { error: err } = await supabase
                    .from('workspaces')
                    .delete()
                    .eq('id', ws.id)
                    .eq('user_id', userId)
                  if (err) throw err
                  setWorkspaces(prev => prev.filter(w => w.id !== ws.id))
                } catch (e) {
                  setError(e instanceof Error ? e.message : '삭제에 실패했어요')
                } finally {
                  setDeletingId(null)
                }
              }}
              disabled={!userId || deletingId === ws.id}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="워크스페이스 삭제"
              title="워크스페이스 삭제"
            >
              {deletingId === ws.id ? (
                <span className="text-xs">…</span>
              ) : (
                <span className="text-sm">×</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    )
  }, [userId, loading, error, workspaces, deletingId])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">워크스페이스</h2>
        <button
          onClick={handleCreate}
          disabled={!userId || creating}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="새 워크스페이스 생성"
          title="새 워크스페이스 생성"
        >
          {creating ? (
            <span className="text-xs">...</span>
          ) : (
            <span className="text-xl leading-none">+</span>
          )}
        </button>
      </div>
      {content}
    </div>
  )
}


