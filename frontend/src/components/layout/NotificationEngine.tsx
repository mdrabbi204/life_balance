import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useApi, useList } from '@/lib/queries'
import { useAuth } from '@/hooks/useAuth'
import { zonedNow } from '@/hooks/useNow'
import { timeToMinutes } from '@/lib/date'
import { PRAYERS } from '@/lib/constants'
import type { DayTimeline, Reminder } from '@/types'

// eslint-disable-next-line react-refresh/only-export-components
export function useNotificationPermission() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported')
  const request = useCallback(async () => {
    if (!supported) { toast.error('This browser does not support notifications.'); return }
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === 'granted') toast.success('Browser notifications enabled')
    else toast.message('Notifications were not allowed. In-app reminders will still appear.')
  }, [supported])
  return { permission, request, supported }
}

function notify(title: string, body: string) {
  toast.info(title, { description: body, duration: 10000 })
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg', tag: title })
    }
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
}

/**
 * Client-side reminder scheduler. Every 20 seconds it compares the current time
 * (in the user's timezone) with today's prayer times, schedule blocks and reminder
 * rules, and fires each reminder once (deduplicated in localStorage).
 */
export function NotificationEngine() {
  const { user } = useAuth()
  const tz = user?.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const timeline = useApi<DayTimeline>('schedule/day', undefined, { refetchInterval: 15 * 60_000 })
  const reminders = useList<Reminder>('reminders')
  const ref = useRef({ timeline: timeline.data, reminders: reminders.data })
  ref.current = { timeline: timeline.data, reminders: reminders.data }

  useEffect(() => {
    const check = () => {
      const { timeline: tl, reminders: rules } = ref.current
      if (!tl || !rules) return
      const now = zonedNow(new Date(), tz)
      if (tl.date !== now.date) { timeline.refetch(); return }
      const storeKey = `lb-notified:${now.date}`
      let sent: string[] = []
      try { sent = JSON.parse(localStorage.getItem(storeKey) || '[]') } catch { /* ignore */ }
      const fire = (key: string, at: number, title: string, body: string) => {
        if (now.minutes < at || now.minutes > at + 2 || sent.includes(key)) return
        sent.push(key)
        notify(title, body)
      }
      const dow = new Date(`${now.date}T12:00:00`).getDay()

      for (const r of rules) {
        if (!r.enabled) continue
        if (r.days_of_week?.length && !r.days_of_week.includes(dow)) continue
        if (r.type === 'salah') {
          for (const p of PRAYERS) {
            const t = tl.prayer_times.times[p.key]
            if (!t) continue
            fire(`salah-${p.key}`, timeToMinutes(t) - (r.minutes_before ?? 10), `${p.name} in ${r.minutes_before ?? 10} min`, `${p.name} at ${t}. ${r.message ?? ''}`)
          }
        } else if (r.type === 'schedule') {
          for (const it of tl.items) {
            if (it.is_prayer || it.segment > 0 || it.reminder_minutes == null || it.status === 'rest' || it.status === 'done') continue
            fire(`sched-${it.key}`, it.start_min - it.reminder_minutes, it.title, `Starts at ${it.start}${it.reminder_minutes ? ` (in ${it.reminder_minutes} min)` : ''}`)
          }
        } else if (r.interval_minutes && r.window_start && r.window_end) {
          const start = timeToMinutes(r.window_start), end = timeToMinutes(r.window_end)
          for (let t = start; t <= end; t += r.interval_minutes) fire(`r${r.id}-${t}`, t, r.title, r.message ?? '')
        } else if (r.time) {
          fire(`r${r.id}`, timeToMinutes(r.time), r.title, r.message ?? '')
        }
      }
      try { localStorage.setItem(storeKey, JSON.stringify(sent)) } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 20_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tz])

  return null
}
