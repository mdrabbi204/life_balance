import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, GraduationCap, HandHeart, MoonStar } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SalahTab } from './SalahTab'
import { QuranTab } from './QuranTab'
import { AdhkarTab } from './AdhkarTab'
import { LearningTab } from './LearningTab'

export default function IslamicPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') ?? 'salah')
  return (
    <>
      <PageHeader title="Islamic Life" description="Salah, Quran, adhkar and continuous learning." icon={<MoonStar />} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setParams({ tab: v }, { replace: true }) }}>
        <TabsList>
          <TabsTrigger value="salah"><MoonStar /> Salah</TabsTrigger>
          <TabsTrigger value="quran"><BookOpen /> Quran</TabsTrigger>
          <TabsTrigger value="adhkar"><HandHeart /> Adhkar</TabsTrigger>
          <TabsTrigger value="learning"><GraduationCap /> Learning</TabsTrigger>
        </TabsList>
        <TabsContent value="salah"><SalahTab /></TabsContent>
        <TabsContent value="quran"><QuranTab /></TabsContent>
        <TabsContent value="adhkar"><AdhkarTab /></TabsContent>
        <TabsContent value="learning"><LearningTab /></TabsContent>
      </Tabs>
    </>
  )
}
