import { useEffect, useState } from 'react'

/** Re-renders every `interval` ms with the current time. */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

/** Current wall-clock time in an IANA timezone as {date: 'YYYY-MM-DD', minutes, seconds}. */
export function zonedNow(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  const h = Number(get('hour')), m = Number(get('minute')), s = Number(get('second'))
  return { date, minutes: h * 60 + m, seconds: h * 3600 + m * 60 + s }
}
