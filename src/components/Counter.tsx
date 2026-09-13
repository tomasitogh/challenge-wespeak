"use client";

import { useEffect, useState, useTransition } from "react";
import { increment, decrement, getCounter } from "@/lib/actions";
import { RESET_MS } from "@/lib/constants";

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Counter({
  initial,
  serverNow,
}: {
  initial: { value: number; updatedAt: string };
  serverNow: number;
}) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(serverNow);
  const [isPending, startTransition] = useTransition();
  const [isResetting, setIsResetting] = useState(false);

  // Actualiza el reloj cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calcula el tiempo restante a partir del último cambio
  const remaining = Math.max(
    0,
    RESET_MS - (now - new Date(state.updatedAt).getTime())
  );
  
  const displayValue = state.value;

  // Sincronización limpia cuando el timer llega a 0
  useEffect(() => {
    if (remaining === 0 && state.value !== 0) {
      setIsResetting(true);
      let isMounted = true;

      const checkDatabase = async () => {
        try {
          const fresh = await getCounter();
          if (!isMounted) return;

          if (fresh.value === 0) {
            setState({ value: 0, updatedAt: fresh.updatedAt });
            setIsResetting(false);
          } else {
            // Si el webhook aún estaba en vuelo, reintenta en 1s sin spamear
            setTimeout(checkDatabase, 1000);
          }
        } catch {
          if (isMounted) setTimeout(checkDatabase, 1000);
        }
      };

      // Damos 800ms para permitir que el webhook de QStash impacte primero
      const timer = setTimeout(checkDatabase, 800);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      setIsResetting(false);
    }
  }, [remaining, state.value]);

  const handleUpdate = (action: typeof increment) => {
    startTransition(async () => {
      const next = await action();
      setState(next);
      setNow(Date.now());
    });
  };

  const isDisabled = isPending || isResetting;

  return (
    <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
        Contador
      </h1>

      <p className={`my-6 text-7xl font-bold tabular-nums text-zinc-900 transition-opacity duration-200 ${isResetting ? "opacity-40" : "opacity-100"}`}>
        {displayValue}
      </p>

      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={() => handleUpdate(decrement)}
          disabled={isDisabled}
          className="h-14 w-14 cursor-pointer rounded-full border border-zinc-300 text-3xl font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => handleUpdate(increment)}
          disabled={isDisabled}
          className="h-14 w-14 cursor-pointer rounded-full bg-zinc-900 text-3xl font-medium text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {/* Estados de feedback al usuario */}
      {isPending && (
        <p className="mt-4 text-xs text-zinc-400">Guardando…</p>
      )}

      {!isPending && isResetting && (
        <p className="mt-4 text-xs font-medium text-zinc-500 animate-pulse">
          Reiniciando contador a 0…
        </p>
      )}

      {!isPending && !isResetting && (
        <p className="mt-4 text-xs text-zinc-400">
          Se reinicia en{" "}
          <span className="font-semibold tabular-nums text-zinc-600">
            {formatTime(remaining)}
          </span>
        </p>
      )}
    </div>
  );
}
