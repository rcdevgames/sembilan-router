"use client";

import dynamic from "next/dynamic";

const ProfilePage = dynamic(() => import("./ProfilePage"), {
  ssr: false,
  loading: () => (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-sidebar rounded" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 bg-sidebar rounded-xl" />
      ))}
    </div>
  ),
});

export default function Page() {
  return <ProfilePage />;
}