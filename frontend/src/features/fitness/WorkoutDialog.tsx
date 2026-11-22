import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormDialog } from '@/components/FormDialog'
import type { Workout, WorkoutExercise } from '@/types'

export const WORKOUT_TYPES = [
  { value: 'push', label: 'Push' }, { value: 'pull', label: 'Pull' }, { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' }, { value: 'full_body', label: 'Full body' }, { value: 'custom', label: 'Custom' },
]
const CATS = ['push', 'pull', 'legs', 'core', 'cardio', 'other'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))

export function WorkoutDialog({ open, onOpenChange, workout, template, date, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void; workout: Workout | null; template: boolean; date: string
  onSubmit: (v: Record<string, unknown>) => Promise<unknown>
}) {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={workout ? `Edit ${template ? 'plan' : 'workout'}` : template ? 'New workout plan' : 'Log workout'}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', options: WORKOUT_TYPES },
        { name: 'date', label: 'Date', type: 'date', required: !template, hidden: () => template },
        { name: 'duration_minutes', label: 'Duration (min)', type: 'number', min: 1 },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      initial={workout ? { ...workout, exercises: workout.exercises.map((e) => ({ ...e })) } : { name: '', type: 'custom', date, duration_minutes: 45, notes: '', exercises: [{ name: '', category: 'push', sets: 3, reps: 10, weight_kg: null }] }}
      onSubmit={(v) => onSubmit({ ...v, is_template: template, exercises: ((v.exercises as WorkoutExercise[]) ?? []).filter((e) => e.name.trim()) })}
      extra={(values, set) => {
        const list = (values.exercises as WorkoutExercise[]) ?? []
        const upd = (i: number, patch: Partial<WorkoutExercise>) => set('exercises', list.map((e, j) => (j === i ? { ...e, ...patch } : e)))
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Exercises</p><Button type="button" size="sm" variant="outline" onClick={() => set('exercises', [...list, { name: '', category: 'other', sets: 3, reps: 10, weight_kg: null }])}><Plus /> Add</Button></div>
            <div className="hidden grid-cols-[1fr_110px_60px_60px_80px_32px] gap-2 px-1 text-[11px] uppercase text-muted-foreground sm:grid"><span>Exercise</span><span>Category</span><span>Sets</span><span>Reps</span><span>Kg</span><span /></div>
            {list.map((e, i) => (
              <div key={i} className="grid grid-cols-[1fr_32px] gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_110px_60px_60px_80px_32px] sm:border-0 sm:p-0">
                <Input placeholder="e.g. Bench press" value={e.name} onChange={(ev) => upd(i, { name: ev.target.value })} />
                <Button type="button" variant="ghost" size="icon" className="sm:order-last" onClick={() => set('exercises', list.filter((_, j) => j !== i))} aria-label="Remove exercise"><Trash2 /></Button>
                <div className="col-span-2 grid grid-cols-4 gap-2 sm:contents">
                  <Select value={e.category} onValueChange={(v) => upd(i, { category: v })} options={CATS} />
                  <Input type="number" min={1} value={e.sets} onChange={(ev) => upd(i, { sets: Number(ev.target.value) })} aria-label="Sets" />
                  <Input type="number" min={1} value={e.reps} onChange={(ev) => upd(i, { reps: Number(ev.target.value) })} aria-label="Reps" />
                  <Input type="number" min={0} step="0.5" value={e.weight_kg ?? ''} placeholder="—" onChange={(ev) => upd(i, { weight_kg: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label="Weight" />
                </div>
              </div>
            ))}
          </div>
        )
      }}
    />
  )
}
