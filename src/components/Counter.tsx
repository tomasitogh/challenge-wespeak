import CounterButtons from "@/components/CounterButtons";
import { getCounter } from "@/lib/actions";

const serverDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatServerTime(iso: string) {
  return serverDateFormatter.format(new Date(iso));
}

export default async function Counter() {
  const { value, updatedAt } = await getCounter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
          Contador
        </h1>

        <p className="my-6 text-7xl font-bold tabular-nums text-zinc-900">
          {value}
        </p>

        <CounterButtons />

        <p className="mt-4 text-xs text-zinc-400">
          Última actualización:{" "}
          <span className="font-semibold tabular-nums text-zinc-600">
            {formatServerTime(updatedAt)}
          </span>{" "}
          (hora del servidor)
        </p>
      </div>
    </main>
  );
}