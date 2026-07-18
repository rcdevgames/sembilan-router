export default function Loading() {
  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-sidebar rounded animate-pulse" />
        <div className="h-10 w-32 bg-sidebar rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-sidebar rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}