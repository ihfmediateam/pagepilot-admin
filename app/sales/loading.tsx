export default function SalesLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gray-200" />
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded mb-1" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="h-10 bg-gray-100 rounded-lg mb-6" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-16" />
        ))}
      </div>
    </div>
  )
}
