// Auth controls moved to header in layout
import WorkspaceList from '@/components/WorkspaceList'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-10">
        <div className="flex items-start justify-center">
          <WorkspaceList />
        </div>
      </main>
    </div>
  );
}
