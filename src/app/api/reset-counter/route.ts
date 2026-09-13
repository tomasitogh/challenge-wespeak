import { db } from "@/lib/prisma";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

async function handler() {
  try {
    await db.counter.update({
      where: { id: 1 },
      data: {
        value: 0,
        lastMessageId: null,
      },
    });

    console.log("[Webhook] Contador reiniciado a 0 por inactividad.");
    return NextResponse.json({ success: true, message: "Contador reiniciado a 0" });
  } catch (error) {
    console.error("[Webhook] Error procesando reseteo:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
