export default function MenuLoading() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background p-4 space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
      <div className="h-10 bg-muted rounded" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-3 border rounded-lg">
            <div className="w-20 h-20 bg-muted rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
