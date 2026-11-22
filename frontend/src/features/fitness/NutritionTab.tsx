import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Beef, Droplets, Flame, Pencil, Plus } from 'lucide-react'
import { addDays, format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateNav, EmptyState, StatCard } from '@/components/common'
import { axisProps, ChartCard, gridProps, tooltipProps } from '@/components/charts'
import { ConfirmDelete } from '@/components/ConfirmDelete'
import { FormDialog } from '@/components/FormDialog'
import { MEALS, nutritionFields } from '@/features/shared/forms'
import { useList, useResource } from '@/lib/queries'
import { useAuth } from '@/hooks/useAuth'
import { useToday } from '@/hooks/useToday'
import { toISODate } from '@/lib/date'
import type { NutritionLog } from '@/types'

export function NutritionTab() {
  const today = useToday()
  const { user } = useAuth()
  const g = { calories: 2400, protein_g: 120, water_ml: 3000, ...user?.profile?.goals }
  const [date, setDate] = useState(today)
  const from = toISODate(addDays(parseISO(date), -6))
  const week = useList<NutritionLog>('nutrition-logs', { from, to: date })
  const { create, update, remove } = useResource<NutritionLog>('nutrition-logs')
  const [editing, setEditing] = useState<NutritionLog | null>(null)
  const [open, setOpen] = useState(false)

  const day = (week.data ?? []).filter((l) => l.date === date)
  const totals = day.reduce((a, l) => ({ calories: a.calories + l.calories, protein: a.protein + Number(l.protein_g), water: a.water + l.water_ml }), { calories: 0, protein: 0, water: 0 })
  const chart = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = toISODate(addDays(parseISO(from), i))
    const logs = (week.data ?? []).filter((l) => l.date === d)
    return { date: d, calories: logs.reduce((a, l) => a + l.calories, 0), protein: Math.round(logs.reduce((a, l) => a + Number(l.protein_g), 0)), water: +(logs.reduce((a, l) => a + l.water_ml, 0) / 1000).toFixed(2) }
  }), [week.data, from])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Log meal</Button>
          {[250, 500].map((ml) => <Button key={ml} variant="outline" onClick={() => create.mutate({ date, meal: 'water', water_ml: ml })}><Droplets /> +{ml} ml</Button>)}
        </div>
        <DateNav value={date} onChange={setDate} max={today} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Calories" value={`${totals.calories}`} sub={`of ${g.calories} kcal (estimate)`} icon={<Flame />} accent="var(--fitness)" progress={(totals.calories / g.calories) * 100} />
        <StatCard label="Protein" value={`${Math.round(totals.protein)} g`} sub={`of ${g.protein_g} g`} icon={<Beef />} accent="var(--family)" progress={(totals.protein / g.protein_g) * 100} />
        <StatCard label="Water" value={`${(totals.water / 1000).toFixed(2)} L`} sub={`of ${(g.water_ml / 1000).toFixed(1)} L`} icon={<Droplets />} accent="#0284c7" progress={(totals.water / g.water_ml) * 100} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Meals</CardTitle></CardHeader>
          <CardContent>
            {day.length === 0 ? <EmptyState title="Nothing logged for this day" description="Log breakfast, lunch, dinner, snacks and water." /> : (
              <div className="space-y-4">
                {MEALS.map((m) => {
                  const items = day.filter((l) => l.meal === m.value)
                  if (!items.length) return null
                  return (
                    <div key={m.value}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</p>
                      <ul className="divide-y rounded-lg border">
                        {items.map((l) => (
                          <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                            <span className="flex-1 truncate">{l.meal === 'water' ? 'Water' : l.description || m.label}</span>
                            <span className="text-xs tabular-nums text-muted-foreground">{l.meal === 'water' ? `${l.water_ml} ml` : `${l.calories} kcal · ${l.protein_g} g${l.water_ml ? ` · ${l.water_ml} ml` : ''}`}</span>
                            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(l); setOpen(true) }} aria-label="Edit"><Pencil /></Button>
                            <ConfirmDelete onConfirm={() => remove.mutateAsync(l.id)} label="entry" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <ChartCard title="Last 7 days" description="Calories and protein">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -10 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => format(parseISO(d), 'EEE')} />
                <YAxis yAxisId="l" {...axisProps} />
                <YAxis yAxisId="r" orientation="right" {...axisProps} />
                <Tooltip {...tooltipProps} labelFormatter={(d) => format(parseISO(String(d)), 'EEE d MMM')} />
                <Bar yAxisId="l" dataKey="calories" name="Calories" fill="var(--fitness)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="r" dataKey="protein" name="Protein (g)" fill="var(--family)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
      <FormDialog open={open} onOpenChange={setOpen} title={editing ? 'Edit entry' : 'Log meal'} fields={nutritionFields}
        initial={editing ? { ...editing } : { date, meal: 'breakfast', description: '', calories: '', protein_g: '', water_ml: '' }}
        onSubmit={(v) => (editing ? update.mutateAsync({ ...v, id: editing.id }) : create.mutateAsync(v))} />
    </div>
  )
}
