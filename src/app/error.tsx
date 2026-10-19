"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-zinc-400">
        The coach hit an unexpected problem. Your camera video was never uploaded. Try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-accent px-8 py-3 font-semibold text-zinc-950 active:scale-95"
      >
        Try again
      </button>
    </main>
  );
}
