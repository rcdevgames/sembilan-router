export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      <div className="h-8 w-48 bg-sidebar rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-sidebar rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}