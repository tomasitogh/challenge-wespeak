"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { rescheduleResetJob } from "@/lib/qstash";




export async function getCounter() {
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, value: 0 },
  });

  return {
    value: counter.value,
    updatedAt: counter.updatedAt.toISOString(),
    serverNow: Date.now(),
  };
}

export async function increment() {
  const current = await db.counter.findUnique({ where: { id: 1 } });
  
  // Cancela el anterior y agenda el nuevo
  const newMessageId = await rescheduleResetJob(current?.lastMessageId);
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: { 
      value: { increment: 1 }, 
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
  // Cancela el anterior y agenda el nuevo
  const newMessageId = await rescheduleResetJob(current?.lastMessageId);
  const counter = await db.counter.upsert({
    where: { id: 1 },
    update: { 
      value: { decrement: 1 }, 
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