import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Briefcase, Code2, FolderKanban, Map } from 'lucide-react'
import { PageHeader } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodingTab } from './CodingTab'
import { RoadmapTab } from './RoadmapTab'
import { ProjectsTab } from './ProjectsTab'

export default function CareerPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') ?? 'coding')
  return (
    <>
      <PageHeader title="Career" description="Deliberate practice, a clear roadmap and shipped projects." icon={<Briefcase />} />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setParams({ tab: v }, { replace: true }) }}>
        <TabsList>
          <TabsTrigger value="coding"><Code2 /> Coding tracker</TabsTrigger>
          <TabsTrigger value="roadmap"><Map /> Learning roadmap</TabsTrigger>
          <TabsTrigger value="projects"><FolderKanban /> Projects</TabsTrigger>
        </TabsList>
        <TabsContent value="coding"><CodingTab /></TabsContent>
        <TabsContent value="roadmap"><RoadmapTab /></TabsContent>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
      </Tabs>
    </>
  )
}
