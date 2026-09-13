import { Client } from "@upstash/qstash"

export const qstash = new Client({
    token: process.env.QSTASH_TOKEN!,
    baseUrl: process.env.QSTASH_URL || undefined,
});


import { RESET_MS } from "@/lib/constants";

const APP_URL =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000");


/**
 * Cancela el mensaje pendiente anterior (si existe) y programa uno nuevo a 20m.
 * Retorna el nuevo messageId generado por QStash.
 */
export async function rescheduleResetJob(previousMessageId?: string | null): Promise<string | null> {
  // 1. Si había un job agendado previamente, lo cancelamos
  if (previousMessageId) {
    try {
      await qstash.messages.delete(previousMessageId);
      console.log(`[QStash] Mensaje previo cancelado: ${previousMessageId}`);
    } catch (error) {
      console.warn("[QStash] No se pudo cancelar el mensaje previo (posiblemente ya expiró):", error);
    }
  }
  // 2. Programamos el nuevo reseteo
  try {
    const res = await qstash.publishJSON({
      url: `${APP_URL}/api/reset-counter`,
      body: { action: "reset" },
      delay: Math.floor(RESET_MS / 1000),
    });

    const messageId = "messageId" in res ? res.messageId : null;
    console.log(`[QStash] Nuevo mensaje agendado con ID: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error("[QStash] Error al agendar mensaje en QStash:", error);
    return null;
  }
}