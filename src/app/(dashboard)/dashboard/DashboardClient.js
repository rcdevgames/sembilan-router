"use client";

import dynamic from "next/dynamic";

const EndpointPageClient = dynamic(() => import("./endpoint/EndpointPageClient"), {
  ssr: false,
  loading: () => (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-sidebar rounded" />
      <div className="h-[400px] bg-sidebar rounded-xl" />
    </div>
  ),
});

export default function DashboardClient({ machineId }) {
  return <EndpointPageClient machineId={machineId} />;
}