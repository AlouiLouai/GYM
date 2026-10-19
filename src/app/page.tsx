import Link from "next/link";
import { InstallHint } from "@/components/install-hint";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Gym <span className="text-accent">Coach</span>
      </h1>
      <p className="max-w-sm text-zinc-400">
        Counts your reps and checks your form using only your camera. Everything runs on your
        device.
      </p>
      <Link
        href="/session"
        className="rounded-full bg-accent px-8 py-3 font-semibold text-zinc-950 active:scale-95"
      >
        Start a session
      </Link>
      <InstallHint />
    </main>
  );
}
