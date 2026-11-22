import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/common'
import { ResourceTable } from '@/components/ResourceTable'
import { useApi } from '@/lib/queries'
import { useToday } from '@/hooks/useToday'
import { fmtDate } from '@/lib/date'
import { capitalize, formatMinutes } from '@/lib/utils'
import type { IslamicLearningLog } from '@/types'

interface Weekly { minutes: number; target_minutes: number; by_type: Record<string, { count: number; minutes: number }> }
const TYPES = [{ value: 'lecture', label: 'Lecture' }, { value: 'hadith', label: 'Hadith' }, { value: 'book', label: 'Islamic book' }, { value: 'other', label: 'Other' }]

export function LearningTab() {
  const today = useToday()
  const weekly = useApi<Weekly>('islamic-learning/weekly')
  const w = weekly.data
  return (
    <div className="space-y-6">
      {w && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard className="col-span-2 lg:col-span-1" label="This week" value={formatMinutes(w.minutes)} sub={`Target ${formatMinutes(w.target_minutes)}`} icon={<GraduationCap />} accent="var(--deen)" progress={(w.minutes / Math.max(1, w.target_minutes)) * 100} />
          {TYPES.map((t) => <StatCard key={t.value} label={t.label} value={w.by_type[t.value]?.count ?? 0} sub={formatMinutes(w.by_type[t.value]?.minutes ?? 0)} />)}
        </div>
      )}
      <ResourceTable<IslamicLearningLog>
        resource="islamic-learning" title="Learning journal" addLabel="Add learning"
        emptyText="Track lectures, hadith study and Islamic books with your notes."
        columns={[
          { header: 'Date', cell: (r) => fmtDate(r.date, 'd MMM yyyy') },
          { header: 'Type', cell: (r) => <Badge variant="secondary">{capitalize(r.type)}</Badge> },
          { header: 'Title', cell: (r) => <div><p className="font-medium">{r.title}</p>{r.source && <p className="text-xs text-muted-foreground">{r.source}</p>}</div> },
          { header: 'Time', cell: (r) => formatMinutes(r.minutes) },
          { header: 'Notes', cell: (r) => <span className="line-clamp-2 max-w-sm text-muted-foreground">{r.notes || '—'}</span> },
        ]}
        fields={[
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'type', label: 'Type', type: 'select', options: TYPES, required: true },
          { name: 'title', label: 'Title', required: true, full: true, placeholder: 'e.g. Tafsir of Surah Al-Kahf, Riyad as-Salihin ch. 1' },
          { name: 'source', label: 'Speaker / author / book' },
          { name: 'minutes', label: 'Minutes', type: 'number', min: 0 },
          { name: 'notes', label: 'Learning notes', type: 'textarea' },
        ]}
        defaults={() => ({ date: today, type: 'lecture', title: '', source: '', minutes: 30, notes: '' })}
      />
    </div>
  )
}
