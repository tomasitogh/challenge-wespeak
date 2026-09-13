export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm animate-pulse">
            <div className="mx-auto h-4 w-20 rounded bg-zinc-200" />
            <div className="mx-auto my-6 h-16 w-28 rounded-lg bg-zinc-200" />
            <div className="flex justify-center gap-4">
                <div className="h-14 w-14 rounded-full bg-zinc-200" />
                <div className="h-14 w-14 rounded-full bg-zinc-200" />
            </div>
            <div className="mx-auto mt-4 h-3 w-32 rounded bg-zinc-200" />
      </div>
    </main>
  );
}
