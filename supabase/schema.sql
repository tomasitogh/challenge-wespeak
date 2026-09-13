-- 1. Crear tabla con una única fila fija (id = 1)
CREATE TABLE IF NOT EXISTS "counter" (
  "id"              INTEGER     NOT NULL DEFAULT 1,
  "value"           INTEGER     NOT NULL DEFAULT 0,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_message_id" TEXT,
  CONSTRAINT "counter_pkey" PRIMARY KEY ("id")
);
