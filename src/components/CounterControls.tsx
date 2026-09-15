"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decrement, increment } from "@/lib/actions";
import { RESET_MS } from "@/lib/constants";

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CounterControls({
  isActive,
  updatedAt,
  serverNow,
}: {
  isActive: boolean;
  updatedAt: string;
  serverNow: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // "anchor" y "now" viven en el reloj del cliente alineado al servidor
  const [anchor, setAnchor] = useState(() => new Date(updatedAt).getTime());
  const [now, setNow] = useState(serverNow);
  const [isResetting, setIsResetting] = useState(false);

  // Cuando llega un valor nuevo (cambió updatedAt) reiniciamos el countdown
  // en RESET_MS y desbloqueamos la UI.
  const [prevUpdatedAt, setPrevUpdatedAt] = useState(updatedAt);
  if (updatedAt !== prevUpdatedAt) {
    setPrevUpdatedAt(updatedAt);
    setAnchor(serverNow);
    setNow(serverNow);
    setIsResetting(false);
  }

  const remaining = Math.min(RESET_MS, Math.max(0, RESET_MS - (now - anchor)));
  const isLocked = isPending || (isActive && isResetting);

  const handleUpdate = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
    });
  };

  useEffect(() => {
    if (!isActive) return;

    // Offset entre reloj del cliente y del servidor para no depender del reloj local
    const offset = Date.now() - serverNow;
    const serverTimeNow = () => Date.now() - offset;

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      const current = serverTimeNow();
      setNow(current);

      const next = Math.min(
        RESET_MS,
        Math.max(0, RESET_MS - (current - anchor))
      );

      // Mientras haya tiempo, la UI está desbloqueada
      if (next > 0) {
        setIsResetting(false);
        return;
      }

      // Llegó a 0: bloqueamos los botones, damos 1s de margen para que QStash
      // haya persistido el 0 y luego obligamos a leer el valor actual de la DB
      // (router.refresh re-renderiza el Server Component -> getCounter -> DB).
      if (refreshTimeout === null) {
        setIsResetting(true);
        refreshTimeout = setTimeout(() => {
          refreshTimeout = null;
          router.refresh();
        }, 1000);
      }
    }, 250);

    return () => {
      clearInterval(interval);
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [isActive, anchor, serverNow, router]);

  return (
    <div>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          aria-label="Decrementar contador"
          aria-busy={isLocked}
          disabled={isLocked}
          onClick={() => handleUpdate(decrement)}
          className={`h-14 w-14 rounded-full border border-zinc-300 text-3xl font-medium text-zinc-700 ${
            isLocked
              ? "cursor-not-allowed opacity-30"
              : "cursor-pointer hover:bg-zinc-100"
          }`}
        >
          {isPending ? (
            <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          ) : (
            "−"
          )}
        </button>
        <button
          type="button"
          aria-label="Incrementar contador"
          aria-busy={isLocked}
          disabled={isLocked}
          onClick={() => handleUpdate(increment)}
          className={`h-14 w-14 rounded-full bg-zinc-900 text-3xl font-medium text-white ${
            isLocked
              ? "cursor-not-allowed opacity-30"
              : "cursor-pointer hover:bg-zinc-800"
          }`}
        >
          {isPending ? (
            <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "+"
          )}
        </button>
      </div>

      {isPending && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          Guardando…
        </p>
      )}

      {!isPending && isActive && !isResetting && (
        <p className="mt-4 text-xs text-zinc-400">
          Se reinicia en{" "}
          <span className="font-semibold tabular-nums text-zinc-600">
            {formatTime(remaining)}
          </span>
        </p>
      )}

      {!isPending && isActive && isResetting && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          Actualizando…
        </p>
      )}
    </div>
  );
}