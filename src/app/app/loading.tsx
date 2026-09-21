export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-16 bg-slate-200/70 rounded-xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-200/60 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-slate-200/50 rounded-xl w-full" />
    </div>
  )
}
