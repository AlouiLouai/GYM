import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link
        href="/"
        className="rounded-full bg-accent px-8 py-3 font-semibold text-zinc-950 active:scale-95"
      >
        Back to the coach
      </Link>
    </main>
  );
}
