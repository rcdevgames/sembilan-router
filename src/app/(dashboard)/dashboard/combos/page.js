"use client";

import dynamic from "next/dynamic";

const CombosPage = dynamic(() => import("./CombosPage"), {
  ssr: false,
  loading: () => (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-sidebar rounded" />
        <div className="h-10 w-32 bg-sidebar rounded-lg" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-sidebar rounded-xl" />
      ))}
    </div>
  ),
});

export default function Page() {
  return <CombosPage />;
}