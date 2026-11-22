import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Moon, RotateCcw, Sun, Sunset } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DateNav } from '@/components/common'
import { useAction, useList } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AdhkarLog } from '@/types'

const SETS = {
  morning: { title: 'Morning Adhkar', icon: Sun, items: [['Ayat al-Kursi', 1], ['Al-Ikhlas, Al-Falaq, An-Nas', 3], ['Sayyid al-Istighfar', 1], ['SubhanAllahi wa bihamdihi', 100], ['La ilaha illallah wahdahu…', 10]] },
  evening: { title: 'Evening Adhkar', icon: Sunset, items: [['Ayat al-Kursi', 1], ['Al-Ikhlas, Al-Falaq, An-Nas', 3], ['Sayyid al-Istighfar', 1], ['A\'udhu bikalimatillah…', 3], ['SubhanAllahi wa bihamdihi', 100]] },
  sleep: { title: 'Before sleeping', icon: Moon, items: [['Ayat al-Kursi', 1], ['Last two ayat of Al-Baqarah', 1], ['Al-Ikhlas, Al-Falaq, An-Nas', 3], ['SubhanAllah · Alhamdulillah · Allahu Akbar', 100], ['Bismika Allahumma amutu wa ahya', 1]] },
} as const
type SetKey = keyof typeof SETS

const DHIKR_PRESETS = [
  { value: 'SubhanAllah', label: 'SubhanAllah (33)', target: 33 },
  { value: 'Alhamdulillah', label: 'Alhamdulillah (33)', target: 33 },
  { value: 'Allahu Akbar', label: 'Allahu Akbar (34)', target: 34 },
  { value: 'Astaghfirullah', label: 'Astaghfirullah (100)', target: 100 },
  { value: 'Salawat', label: 'Salawat on the Prophet ﷺ (100)', target: 100 },
  { value: 'La ilaha illallah', label: 'La ilaha illallah (100)', target: 100 },
]

export function AdhkarTab() {
  const today = useToday()
  const [date, setDate] = useState(today)
  const logs = useList<AdhkarLog>('adhkar-logs', { date })
  const upsert = useAction((b: Partial<AdhkarLog>) => api.post('/adhkar-logs', { date, ...b }))
  const find = (type: string, name: string) => logs.data?.find((l) => l.type === type && l.name === name)

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><DateNav value={date} onChange={setDate} max={today} /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(SETS) as SetKey[]).map((k) => {
          const set = SETS[k]
          const main = find(k, set.title)
          const done = !!main?.completed
          const Icon = set.icon
          const checkedCount = set.items.filter(([n]) => find(k, n)?.completed).length
          return (
            <Card key={k} className={cn(done && 'border-success/40 bg-success/5')}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2"><Icon className="size-4 text-primary" /> {set.title}</CardTitle>
                <span className="text-xs text-muted-foreground">{checkedCount}/{set.items.length}</span>
              </CardHeader>
              <CardContent className="space-y-1">
                {set.items.map(([name, target]) => {
                  const item = find(k, name)
                  return (
                    <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                      <Checkbox checked={!!item?.completed} onCheckedChange={(c) => {
                        upsert.mutate({ type: k, name, count: c ? target : 0, target, completed: !!c })
                        const willAllBeDone = set.items.every(([n]) => (n === name ? !!c : !!find(k, n)?.completed))
                        if (willAllBeDone !== done) upsert.mutate({ type: k, name: set.title, count: willAllBeDone ? 1 : 0, target: 1, completed: willAllBeDone })
                      }} />
                      <span className="flex-1">{name}</span>
                      {target > 1 && <span className="text-xs tabular-nums text-muted-foreground">×{target}</span>}
                    </label>
                  )
                })}
                <Button className="mt-3 w-full" variant={done ? 'secondary' : 'default'} loading={upsert.isPending}
                  onClick={() => upsert.mutate({ type: k, name: set.title, count: done ? 0 : 1, target: 1, completed: !done })}>
                  <CheckCircle2 /> {done ? 'Completed — undo' : 'Mark all as complete'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <DhikrCounter date={date} logs={logs.data ?? []} />
    </div>
  )
}

function DhikrCounter({ date, logs }: { date: string; logs: AdhkarLog[] }) {
  const [name, setName] = useState(DHIKR_PRESETS[0].value)
  const [custom, setCustom] = useState('')
  const preset = DHIKR_PRESETS.find((p) => p.value === name)
  const label = name === '__custom' ? custom.trim() : name
  const saved = logs.find((l) => l.type === 'custom' && l.name === label)
  const [target, setTarget] = useState(preset?.target ?? 33)
  const [count, setCount] = useState(saved?.count ?? 0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const save = useAction((b: { name: string; count: number; target: number }) => api.post('/adhkar-logs', { date, type: 'custom', ...b }))

  useEffect(() => { setCount(saved?.count ?? 0); if (saved?.target) setTarget(saved.target) }, [label, date, saved?.count, saved?.target])
  useEffect(() => { if (preset) setTarget(preset.target) }, [preset])

  const persist = (c: number) => {
    if (!label) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save.mutate({ name: label, count: c, target }), 700)
  }
  const tap = () => { const c = count + 1; setCount(c); persist(c); if (c === target && navigator.vibrate) navigator.vibrate(120) }
  const pct = Math.min(100, (count / Math.max(1, target)) * 100)

  return (
    <Card>
      <CardHeader><CardTitle>Dhikr counter</CardTitle><p className="text-sm text-muted-foreground">Tap the circle. Counts are saved for the selected date.</p></CardHeader>
      <CardContent className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={name} onValueChange={setName} options={[...DHIKR_PRESETS, { value: '__custom', label: 'Custom…' }]} />
          {name === '__custom' && <Input placeholder="Dhikr name" value={custom} onChange={(e) => setCustom(e.target.value)} />}
          <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Target</span><Input type="number" min={1} value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value)))} className="w-24" /></div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Today's dhikr</p>
            <div className="flex flex-wrap gap-2">
              {logs.filter((l) => l.type === 'custom').map((l) => <span key={l.id} className={cn('rounded-full border px-2.5 py-1 text-xs', l.completed && 'border-success/40 bg-success/10')}>{l.name}: {l.count}/{l.target}</span>)}
              {!logs.some((l) => l.type === 'custom') && <span className="text-sm text-muted-foreground">No dhikr counted yet.</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button onClick={tap} disabled={!label} className="relative flex size-44 cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-lg transition active:scale-95 disabled:opacity-50" aria-label="Count">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="4" /><circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray={289} strokeDashoffset={289 - (289 * pct) / 100} style={{ transition: 'stroke-dashoffset 200ms' }} /></svg>
            <span className="text-center"><span className="block text-5xl font-semibold tabular-nums">{count}</span><span className="text-xs text-white/80">of {target}</span></span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => { setCount(0); persist(0) }}><RotateCcw /> Reset</Button>
        </div>
      </CardContent>
    </Card>
  )
}
