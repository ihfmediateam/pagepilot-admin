export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />
        ))}
      </div>
      {/* Two column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 h-64" />
        <div className="bg-white rounded-xl border border-gray-200 h-64" />
      </div>
      {/* Deployments panel */}
      <div className="bg-white rounded-xl border border-gray-200 h-48" />
    </div>
  )
}
