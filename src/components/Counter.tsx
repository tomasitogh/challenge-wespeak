import CounterControls from "@/components/CounterControls";
import { getCounter } from "@/lib/actions";

export default async function Counter() {
  const { value, updatedAt, serverNow } = await getCounter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
          Contador
        </h1>

        <p className="my-6 text-7xl font-bold tabular-nums text-zinc-900">
          {value}
        </p>

        <CounterControls
          isActive={value !== 0}
          updatedAt={updatedAt}
          serverNow={serverNow}
        />
      </div>
    </main>
  );
}