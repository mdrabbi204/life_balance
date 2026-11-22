import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; resolved: 'light' | 'dark' }>({ theme: 'system', setTheme: () => {}, resolved: 'light' })

function read(): Theme {
  try { return (localStorage.getItem('lb-theme') as Theme) || 'system' } catch { return 'system' }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(read)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  useEffect(() => { document.documentElement.classList.toggle('dark', resolved === 'dark') }, [resolved])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('lb-theme', t) } catch { /* ignore */ }
  }
  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
