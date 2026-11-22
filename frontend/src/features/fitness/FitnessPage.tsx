import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BedDouble, Dumbbell, Footprints, Salad } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RunningTab } from './RunningTab'
import { StrengthTab } from './StrengthTab'
import { NutritionTab } from './NutritionTab'
import { SleepTab } from './SleepTab'

export default function FitnessPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') ?? 'running')
  return (
    <>
      <PageHeader title="Fitness & Health" description="Train consistently, eat well, recover fully." icon={<Dumbbell />} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setParams({ tab: v }, { replace: true }) }}>
        <TabsList>
          <TabsTrigger value="running"><Footprints /> Running</TabsTrigger>
          <TabsTrigger value="strength"><Dumbbell /> Strength</TabsTrigger>
          <TabsTrigger value="nutrition"><Salad /> Nutrition</TabsTrigger>
          <TabsTrigger value="sleep"><BedDouble /> Sleep</TabsTrigger>
        </TabsList>
        <TabsContent value="running"><RunningTab /></TabsContent>
        <TabsContent value="strength"><StrengthTab /></TabsContent>
        <TabsContent value="nutrition"><NutritionTab /></TabsContent>
        <TabsContent value="sleep"><SleepTab /></TabsContent>
      </Tabs>
    </>
  )
}
