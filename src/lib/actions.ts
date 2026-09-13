"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { rescheduleResetJob } from "@/lib/qstash";
import { RESET_MS } from "@/lib/constants";

export async function getCounter() {
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, value: 0 },
  });

  // Si ya pasaron los 20m de inactividad y todavía no estaba en 0, reseteamos en BD
  const isExpired =
    counter.value !== 0 &&
    Date.now() - counter.updatedAt.getTime() >= RESET_MS;

  if (isExpired) {
    const updated = await db.counter.update({
      where: { id: 1 },
      data: {
        value: 0,
        updatedAt: new Date(),
        lastMessageId: null,
      },
    });
    return {
      value: 0,
      updatedAt: updated.updatedAt.toISOString(),
      serverNow: Date.now(),
    };
  }

  return {
    value: counter.value,
    updatedAt: counter.updatedAt.toISOString(),
    serverNow: Date.now(),
  };
}

export async function increment() {
  const current = await db.counter.findUnique({ where: { id: 1 } });
  
  // Si ya había expirado por inactividad, partimos desde 0
  const isExpired =
    current &&
    current.value !== 0 &&
    Date.now() - current.updatedAt.getTime() >= RESET_MS;
  const baseValue = isExpired ? 0 : (current?.value ?? 0);

  // Cancela el anterior y agenda el nuevo
  const newMessageId = await rescheduleResetJob(current?.lastMessageId);
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: { 
      value: baseValue + 1, 
      updatedAt: new Date(),
      lastMessageId: newMessageId,
    },
    create: { 
      id: 1, 
      value: 1,
      lastMessageId: newMessageId,
    },
  });
  revalidatePath("/");
  return { value: counter.value, updatedAt: counter.updatedAt.toISOString() };
}

export async function decrement() {
  const current = await db.counter.findUnique({ where: { id: 1 } });
  
  // Si ya había expirado por inactividad, partimos desde 0
  const isExpired =
    current &&
    current.value !== 0 &&
    Date.now() - current.updatedAt.getTime() >= RESET_MS;
  const baseValue = isExpired ? 0 : (current?.value ?? 0);

  // Cancela el anterior y agenda el nuevo
  const newMessageId = await rescheduleResetJob(current?.lastMessageId);
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: { 
      value: baseValue - 1, 
      updatedAt: new Date(),
      lastMessageId: newMessageId,
    },
    create: { 
      id: 1, 
      value: -1,
      lastMessageId: newMessageId,
    },
  });
  revalidatePath("/");
  return { value: counter.value, updatedAt: counter.updatedAt.toISOString() };
}