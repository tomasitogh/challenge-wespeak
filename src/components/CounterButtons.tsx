"use client";

import { useTransition } from "react";
import { decrement, increment } from "@/lib/actions";

export default function CounterButtons() {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
    });
  };

  return (
    <div>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          aria-label="Decrementar contador"
          aria-busy={isPending}
          disabled={isPending}
          onClick={() => handleUpdate(decrement)}
          className={`h-14 w-14 cursor-pointer rounded-full border border-zinc-300 text-3xl font-medium text-zinc-700 hover:bg-zinc-100 ${
            isPending ? "cursor-not-allowed opacity-30" : ""
          }`}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Incrementar contador"
          aria-busy={isPending}
          disabled={isPending}
          onClick={() => handleUpdate(increment)}
          className={`h-14 w-14 cursor-pointer rounded-full bg-zinc-900 text-3xl font-medium text-white hover:bg-zinc-800 ${
            isPending ? "cursor-not-allowed opacity-30" : ""
          }`}
        >
          +
        </button>
      </div>

      {isPending && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          Guardando…
        </p>
      )}
    </div>
  );
}