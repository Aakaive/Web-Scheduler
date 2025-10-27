import UserList from '@/components/UserList'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            Web Scheduler
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Supabase 유저 데이터 관리 시스템
          </p>
        </div>
        <UserList />
      </main>
    </div>
  );
}
