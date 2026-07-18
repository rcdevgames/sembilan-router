export default function Loading() {
  return (
    <div className="p-8 space-y-4">
      <div className="h-8 w-48 bg-sidebar rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-32 bg-sidebar rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}