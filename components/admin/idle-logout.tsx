'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { DEFAULT_IDLE_MINUTES } from '../../lib/auth-config'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_ADMIN_IDLE_MINUTES) || DEFAULT_IDLE_MINUTES
const WARNING_BEFORE_MS = 60 * 1000
const STORAGE_KEY = 'admin_last_activity'
const CHANNEL_NAME = 'admin_idle_sync'

export function IdleLogout() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [showWarning, setShowWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isSelfUpdate = useRef(false)

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(STORAGE_KEY)
    channelRef.current?.postMessage({ type: 'LOGOUT' })
    router.replace('/admin/login?message=Sesi berakhir karena tidak aktif')
    router.refresh()
  }, [supabase, router])

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (IDLE_MINUTES === 0) return

    const now = Date.now()
    isSelfUpdate.current = true
    localStorage.setItem(STORAGE_KEY, now.toString())
    isSelfUpdate.current = false

    clearTimers()

    const timeoutMs = IDLE_MINUTES * 60 * 1000

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, timeoutMs - WARNING_BEFORE_MS)

    timerRef.current = setTimeout(() => {
      logout()
    }, timeoutMs)
  }, [clearTimers, logout])

  useEffect(() => {
    if (IDLE_MINUTES === 0) return

    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll']
    let throttleTimer: ReturnType<typeof setTimeout> | null = null

    const handleActivity = () => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        resetTimers()
        throttleTimer = null
      }, 1000)
    }

    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }))

    // BroadcastChannel for instant cross-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME)
      channelRef.current.onmessage = (e) => {
        if (e.data?.type === 'ACTIVITY') {
          resetTimers()
          setShowWarning(false)
        } else if (e.data?.type === 'LOGOUT') {
          logout()
        }
      }
    }

    // localStorage sync (fallback & for tabs without BroadcastChannel support)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !isSelfUpdate.current) {
        resetTimers()
        setShowWarning(false)
      }
    }
    window.addEventListener('storage', handleStorage)

    resetTimers()

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      window.removeEventListener('storage', handleStorage)
      channelRef.current?.close()
      clearTimers()
    }
  }, [resetTimers, logout, clearTimers])

  // Notify other tabs on activity
  const notifyOthers = useCallback(() => {
    channelRef.current?.postMessage({ type: 'ACTIVITY' })
  }, [])

  // Call notifyOthers when timers reset (but avoid infinite loop)
  useEffect(() => {
    if (IDLE_MINUTES === 0) return
    notifyOthers()
  }, [notifyOthers]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sesi akan berakhir</AlertDialogTitle>
          <AlertDialogDescription>
            Anda sudah tidak aktif selama beberapa waktu. Anda akan keluar secara otomatis dalam 1 menit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => {
            setShowWarning(false)
            resetTimers()
          }}>
            Tetap Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}