import type { Field } from '@/components/FormDialog'
import { surahOptions } from '@/lib/constants'
import type { LearningTopic } from '@/types'

export const quranFields: Field[] = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'pages_read', label: 'Pages read', type: 'number', required: true, min: 0 },
  { name: 'surah_number', label: 'Surah', type: 'select', options: surahOptions, placeholder: 'Select surah' },
  { name: 'minutes', label: 'Minutes', type: 'number', min: 0 },
  { name: 'notes', label: 'Reflections / notes', type: 'textarea' },
]

export const sessionFields = (topics: LearningTopic[]): Field[] => [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'minutes', label: 'Minutes studied', type: 'number', required: true, min: 1 },
  { name: 'learning_topic_id', label: 'Roadmap topic', type: 'select', options: [{ value: '', label: 'General' }, ...topics.map((t) => ({ value: String(t.id), label: t.name }))] },
  { name: 'topics_studied', label: 'What you studied', placeholder: 'e.g. Laravel queues, Rust ownership' },
  { name: 'challenges_solved', label: 'Coding challenges solved', type: 'number', min: 0 },
  { name: 'github_contributions', label: 'GitHub contributions', type: 'number', min: 0, help: 'Optional — commits/PRs you made today' },
  { name: 'notes', label: 'Technical notes', type: 'textarea' },
]

export const runFields: Field[] = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'distance_km', label: 'Distance (km)', type: 'number', step: '0.01', required: true, min: 0.1 },
  { name: 'duration_seconds', label: 'Duration', type: 'duration', required: true, full: true },
  { name: 'calories', label: 'Calories', type: 'number', min: 0, help: 'Leave empty to estimate from your body weight' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

export const MEALS = [
  { value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }, { value: 'water', label: 'Water only' },
]

export const nutritionFields: Field[] = [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'meal', label: 'Meal', type: 'select', options: MEALS, required: true },
  { name: 'description', label: 'What you ate', full: true, hidden: (v) => v.meal === 'water' },
  { name: 'calories', label: 'Calories (kcal)', type: 'number', min: 0, hidden: (v) => v.meal === 'water' },
  { name: 'protein_g', label: 'Protein (g)', type: 'number', step: '0.1', min: 0, hidden: (v) => v.meal === 'water' },
  { name: 'water_ml', label: 'Water (ml)', type: 'number', min: 0 },
]

export const sleepFields: Field[] = [
  { name: 'date', label: 'Wake-up date', type: 'date', required: true, help: 'The morning you woke up' },
  { name: 'quality', label: 'Sleep quality', type: 'select', options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'][n] + ` (${n})` })) },
  { name: 'bedtime', label: 'Bedtime', type: 'time', required: true },
  { name: 'wake_time', label: 'Wake-up time', type: 'time', required: true },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]
