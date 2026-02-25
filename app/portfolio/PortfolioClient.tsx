"use client";

import dynamic from "next/dynamic";

const PortfolioScene = dynamic(() => import("./PortfolioScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-black text-zinc-500">
      Loading...
    </div>
  ),
});

export default function PortfolioClient() {
  return <PortfolioScene />;
}
