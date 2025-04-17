import OrchestraBuilder from "@/components/orchestra-builder"

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-slate-800 dark:text-slate-100">
          Orchestra Builder
        </h1>
        <OrchestraBuilder />
      </div>
    </main>
  )
}
