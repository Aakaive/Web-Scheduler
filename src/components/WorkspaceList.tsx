'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from "next/image";

interface Workspace {
  id: string // int8 comes back as string in JS
  user_id: string
  title: string
  created_at: string
}

function EditNoteIcon() {
  return (
    <svg
      className="w-[17px] h-[17px] text-gray-400 hover:text-black transition-colors"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"
      />
    </svg>
  )
}

export default function WorkspaceList() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>("")
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      
      if (!uid) {
        setWorkspaces([])
        setLoading(false)
      }
    }
    init()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      
      if (event === 'SIGNED_OUT' || !uid) {
        setWorkspaces([])
        setLoading(false)
        setError(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
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
        await fetchWorkspaces(userId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '워크스페이스 생성에 실패했어요')
    } finally {
      setCreating(false)
    }
  }

  const handleSaveEdit = async (wsId: string) => {
    if (!userId || !editingTitle.trim()) return
    try {
      setUpdating(true)
      const { error: err } = await supabase
        .from('workspaces')
        .update({ title: editingTitle.trim() })
        .eq('id', wsId)
        .eq('user_id', userId)
      if (err) throw err
      setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, title: editingTitle.trim() } : w))
      setEditingId(null)
      setEditingTitle("")
    } catch (e) {
      setError(e instanceof Error ? e.message : '이름 변경에 실패했어요')
    } finally {
      setUpdating(false)
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
              className="flex-1 cursor-pointer flex items-center gap-2"
              onClick={() => editingId ? undefined : router.push(`/workspace/${ws.id}`)}
            >
              {editingId === ws.id ? (
                <>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    className="border px-2 rounded text-sm h-7 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    disabled={updating}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(ws.id)
                      if (e.key === 'Escape') { setEditingId(null); setEditingTitle("") }
                    }}
                  />
                  <button
                    onClick={e => {e.stopPropagation(); handleSaveEdit(ws.id)}}
                    disabled={updating || !editingTitle.trim()}
                    className="ml-1 rounded p-1 bg-transparent text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label="저장"
                    title="저장"
                    type="button"
                    style={{lineHeight:0,display:'inline-flex',alignItems:'center',justifyContent:'center'}}
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px] pointer-events-none">
                      <polyline points="4 11 9 16 16 6" />
                    </svg>
                  </button>
                  <button
                    onClick={e => {e.stopPropagation(); setEditingId(null); setEditingTitle("")}}
                    disabled={updating}
                    className="ml-1 rounded p-1 bg-transparent text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label="취소"
                    title="취소"
                    type="button"
                    style={{lineHeight:0,display:'inline-flex',alignItems:'center',justifyContent:'center'}}
                  >
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px] pointer-events-none">
                      <line x1="5" y1="5" x2="15" y2="15" />
                      <line x1="15" y1="5" x2="5" y2="15" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ws.title}</div>
                  <button
                    onClick={e => {e.stopPropagation(); setEditingId(ws.id); setEditingTitle(ws.title)}}
                    className="ml-2 group rounded p-1 bg-transparent text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label="이름 수정"
                    title="이름 수정"
                    type="button"
                    style={{lineHeight:0,display:'inline-flex',alignItems:'center',justifyContent:'center'}}
                  >
                    <span className="inline-block w-[17px] h-[17px]">
                      <EditNoteIcon />
                    </span>
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-col items-end pl-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation()
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
                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed mb-1"
                aria-label="워크스페이스 삭제"
                title="워크스페이스 삭제"
              >
                {deletingId === ws.id ? (
                  <span className="text-xs">…</span>
                ) : (
                  <span className="text-sm">×</span>
                )}
              </button>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {new Date(ws.created_at).toLocaleString('ko-KR')}
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }, [userId, loading, error, workspaces, deletingId, editingId, editingTitle, updating])

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


