import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-zinc-400">
        This page isn&apos;t cached yet. Reconnect once and open it, and the coach will work
        offline from then on.
      </p>
    </main>
  );
}
