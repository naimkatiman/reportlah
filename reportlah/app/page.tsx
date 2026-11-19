'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Board } from '@/app/ui/Board'
import type { StateView } from '@/lib/types'

const POLL_MS = 2000
const FAIL_NOTICE = 'Could not reach the server. Please try again.'

export default function Home() {
  const [state, setState] = useState<StateView | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/state', { cache: 'no-store' })
      if (!res.ok) throw new Error('state')
      setState((await res.json()) as StateView)
    } catch {
      setNotice(FAIL_NOTICE)
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(() => void load(), 0)
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void load()
    }, POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  async function post(url: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setPending(true)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      if (!res.ok) throw new Error('post')
      return (await res.json()) as Record<string, unknown>
    } catch {
      setNotice(FAIL_NOTICE)
      return null
    } finally {
      setPending(false)
    }
  }

  async function run() {
    setNotice(null)
    const data = await post('/api/run')
    if (data?.state) setState(data.state as StateView)
  }

  async function add(text: string, hasPhoto: boolean) {
    setNotice(null)
    const data = await post('/api/complaints', { text, has_photo: hasPhoto })
    if (!data) return
    if (data.state) setState(data.state as StateView)
    if (typeof data.reply === 'string') setNotice(data.reply)
  }

  async function reset() {
    setNotice(null)
    const data = await post('/api/reset')
    if (data) setState(data as unknown as StateView)
  }

  async function copy() {
    const message = state?.report?.message
    if (!message) return
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice('Could not copy. Select the message and copy it by hand.')
    }
  }

  if (!state) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 text-base">
        <p role="status">{notice ?? 'Loading'}</p>
      </main>
    )
  }

  return (
    <Board
      state={state}
      pending={pending}
      notice={notice}
      copied={copied}
      onGenerate={() => void run()}
      onRetry={() => void run()}
      onReset={() => void reset()}
      onAdd={(text, hasPhoto) => void add(text, hasPhoto)}
      onCopy={() => void copy()}
    />
  )
}
