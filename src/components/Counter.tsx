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
  
  // Si el tiempo llegó a 0, el contador expiró y pasa inmediatamente a 0
  const isExpired = remaining === 0 && state.value !== 0;
  const displayValue = isExpired ? 0 : state.value;

  // Sincroniza con el servidor cuando el tiempo llega a 0 para persistir el 0 en BD
  useEffect(() => {
    if (isExpired) {
      setState((prev) => ({ ...prev, value: 0 }));
      getCounter().catch(() => {});
    }
  }, [isExpired]);

  const handleUpdate = (action: typeof increment | typeof decrement) => {
    startTransition(async () => {
      const next = await action();
      setState(next);
      setNow(Date.now());
    });
  };

  // Los botones NUNCA se congelan: solo se deshabilitan durante el guardado de un clic
  const isDisabled = isPending;

  return (
    <div className="w-full max-w-xs rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
        Contador
      </h1>

      <p className="my-6 text-7xl font-bold tabular-nums text-zinc-900">
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

      {/* Feedback de guardado */}
      {isPending && (
        <p className="mt-4 text-xs text-zinc-400">Guardando…</p>
      )}

      {!isPending && displayValue !== 0 && (
        <p className="mt-4 text-xs text-zinc-400">
          Se reinicia en{" "}
          <span className="font-semibold tabular-nums text-zinc-600">
            {formatTime(remaining)}
          </span>
        </p>
      )}

      {!isPending && displayValue === 0 && (
        <p className="mt-4 text-xs text-zinc-400">
          Inactivo (el contador está en 0)
        </p>
      )}
    </div>
  );
}
