"use client";

import dynamic from "next/dynamic";

const ProxyPoolPage = dynamic(() => import("./ProxyPoolPage"), {
  ssr: false,
  loading: () => (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-sidebar rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-sidebar rounded-xl" />
        ))}
      </div>
    </div>
  ),
});

export default function Page() {
  return <ProxyPoolPage />;
}