import { useAuth } from './useAuth'
import { useNow, zonedNow } from './useNow'

/** Today's date (YYYY-MM-DD) in the user's configured timezone. */
export function useToday() {
  const { user } = useAuth()
  const now = useNow(60_000)
  return zonedNow(now, user?.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone).date
}

export function useTimezone() {
  const { user } = useAuth()
  return user?.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
}
