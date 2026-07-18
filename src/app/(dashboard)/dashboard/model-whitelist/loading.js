export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      <div className="h-8 w-64 bg-sidebar rounded animate-pulse mb-6" />
      <div className="h-24 bg-sidebar rounded-xl animate-pulse mb-4" />
      <div className="h-16 bg-sidebar rounded-xl animate-pulse mb-4" />
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-sidebar rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}