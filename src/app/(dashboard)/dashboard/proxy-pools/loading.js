export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-64 bg-sidebar rounded animate-pulse" />
        <div className="h-10 w-36 bg-sidebar rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-sidebar rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}