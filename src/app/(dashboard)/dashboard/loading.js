export default function Loading() {
  return (
    <div className="p-8 space-y-6">
      <div className="h-8 w-64 bg-sidebar rounded animate-pulse" />
      <div className="h-[400px] bg-sidebar rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64 bg-sidebar rounded-xl animate-pulse" />
        <div className="h-64 bg-sidebar rounded-xl animate-pulse" />
      </div>
    </div>
  );
}