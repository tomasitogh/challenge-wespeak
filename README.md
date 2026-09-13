# We Speak programming challenge

Este challenge consiste de lo siguiente:

```markdown
Creación de un contador con persistencia en base de datos

El objetivo de este desafío es desarrollar una aplicación web sencilla utilizando Next.js que implemente un contador cuyos valores se persistan en una base de datos relacional. La aplicación deberá tener las siguientes funcionalidades básicas:

Contador con Persistencia: Crear un contador que muestre su valor actual en pantalla. El valor del contador debe estar almacenado en una base de datos relacional y persistir entre sesiones. Proveer dos botones: uno para incrementar y otro para disminuir el valor del contador.
Persistencia de Datos: Al hacer clic en los botones de incrementar o disminuir, el valor actualizado del contador debe guardarse inmediatamente en la base de datos
Pasados los 20 minutos del último cambio al contador, este se tiene que reiniciar a 0 de manera global y aunque la página esté cerrada.
Requisitos Técnicos

Framework: Next.js.15/16. Para el manejo del backend usar server actions
Base de Datos: usar Supabase (postgresql)
Lenguaje: JavaScript o TypeScript.
ORM: puede ser Prisma o Drizzle para manejar las consultas con la base de datos.
Usar en su mayoría server components
Tener en cuenta experiencia de usuario (estados de carga, etc)
Deployarlo en Vercel
Entrega: Subí el código a un repositorio de GitHub o GitLab. Proporciona instrucciones claras para configurar y ejecutar la aplicación. Documenta brevemente las decisiones técnicas tomadas y cualquier funcionalidad adicional que hayas implementado.

Tiempo Estimado: El desafío debería poder completarse antes del miércoles 16 de septiembre.
```

# Planteo de solución

## Trampa en la consigna

Este challenge es muy simple, es decir un contador con base de datos, peeero tiene una pequeña trampita en "Pasados los 20 minutos del último cambio al contador, este se tiene que reiniciar a 0 de manera global y aunque la página esté cerrada."

Hay un par de maneras de resolver esto. La opción de resetear a 0 cuando el usuario accede a la página (es decir sin un cron que se ejecute por detrás) se descarta con la frase de la consigna "aunque la página esté cerrada.", porque necesitamos ejecutar este cambio en el servidor o en la base de datos.

Había analizado dos opciones en un principio, o correr un cron del lado de Vercel o del lado de Supabase.

Estas dos opciones hubiesen resuelto el ejercicio de una manera mediocre, y explico a continuación:

- **Vercel**: En el Free tier solo puede correr dos crons por día, queda descartado. Encima, levantaría una conexión a la base de datos en cada cron, cuando en la siguiente opción nos ahorramos eso.
- **Supabase**: Se configura el cron en la base de datos, y cada minuto, validaría si el updatedAt ya pasaron 20min, poniendo el valor en cero.
  Esto hubiese funcionado, pero de manera mediocre -> si el último updatedAt era a las 00:01:15, recien iba a actualizarse el valor a las 00:22:00, porque se ejecuta un cron con una secuencia de tiempo específica, es decir cada minuto. Esto hubiese reseteado el timer pasados los 20 minutos con 45 segundos. Es decir, al estar en el minuto 00:21:00, la validación de si pasaron 20min hubiese dado false (ya que habrían pasado 19:45).
  Bueno, entonces dijimos que esta opción nos puede agregar una ventana de 1 a 59 segundos extra de validación para poner el valor en cero en la base de datos. Los pros es que no hace llamadas HTTP ni se levanta el servidor, sino que todo ocurre en la base de datos. Otra contra es que este cron se va a ejecutar cada minuto, todos los días, indiferente de si la página tuvo interacción o tráfico. Es decir, si no clickea nadie en todo el día, el cron se corre igual cada minuto.
  Además, mi primera implementación hacía una validación en el front end, entonces cuando el timer llegaba a 20min, se escribía cero en el frontend, pero en la base de datos seguía siendo otro valor.

Al seguir indagando, y ver cómo había alguna otra manera de resolverlo bien, pensé en que el problema podía resolverse orientado a eventos, es decir que de alguna manera, cada vez que el usuario aumenta o disminuye, se dispare un job en el background. Los jobs no se acumularían, sino que cada vez que se crea uno, se elimina el último. Para implementar eso, pensé en utilizar QStash cómo tecnología de manejo de colas. Además entiendo que es parte del stack que usa el equipo de We Speak.

Para implementar esto, agremos la columna lastMessageId, agregamos la dependencia de qstash e hicimos la implementación en los server actions y la configuración del webhook de qstash.

La documentación en Upstash fue clave para entender bien la configuración e implementación.

# Prototipado y frontend

Antes de mandarme a desarrollar el front, siempre me gusta prototipar y ver gráficamente como se vé la solución. Para este caso tan simple, se me ocurrió una funcionalidad extra que creo que suma un plus visual.
En este tipo de ejercicios no me gusta hacer de más, pero lo veo acertado.

![Imagen de prototipado, con titulo, contador con botones y un reminder del tiempo restante](image.png)

Además, mantuve Tailwind ya que en los comandos de incialización de Next.js ya viene configurado y el desarrollo es más simple y rápido.

---

## Cómo correrlo en local

1. Clonar el repositorio e instalar dependencias:
   ```bash
   git clone https://github.com/tu-usuario/challenge-wespeak.git
   cd challenge-wespeak
   npm install
   ```

2. Configurar el archivo `.env` en la raíz con las credenciales correspondientes:
   ```env
   DATABASE_URL=postgresql://...
   
   # QStash (para entorno local usamos el emulador integrado)
   QSTASH_DEV=true
   APP_URL=http://127.0.0.1:3000

   # Tiempo de reseteo (opcional, default: 20m. Ej: "20m", "30s", "1h")
   NEXT_PUBLIC_RESET_TIME=20m
   ```

3. En el **SQL Editor** de Supabase, ejecutar el esquema de [`supabase/schema.sql`](supabase/schema.sql) para crear la tabla `counter` con `last_message_id`.

4. Generar el cliente de Prisma:
   ```bash
   npx prisma generate
   ```

5. En una terminal, iniciar el emulador local de QStash:
   ```bash
   npx @upstash/qstash-cli@latest dev
   ```

6. En otra terminal, correr la aplicación:
   ```bash
   npm run dev
   ```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Cómo lo resolví

### 1. Lógica del contador
- Tabla `counter` en Supabase con una única fila (`id = 1`) que persiste `value`, `updated_at` y `last_message_id`.
- `increment` y `decrement` son **Server Actions** (`src/lib/actions.ts`): actualizan la base de datos de manera inmediata y atómica.
- El valor es global y persistente entre sesiones.

### 2. Reseteo a los 20 minutos: Arquitectura orientada a eventos con QStash
En lugar de un cron tradicional que consulta la base de datos cada minuto consumiendo recursos innecesarios y generando desfasajes de tiempo:
- Se implementó el patrón **"Eliminar y Crear" (Cancel & Reschedule)** con **Upstash QStash**.
- Cada vez que el usuario clickea en `+` o `−`, la Server Action cancela el job anterior en QStash (usando el `last_message_id` almacenado) y programa uno nuevo exactamente a 20 minutos.
- Si pasan 20 minutos sin nuevos clics, QStash despacha un webhook vía `POST` a `/api/reset-counter`.
- El endpoint valida la firma criptográfica con `verifySignatureAppRouter` para garantizar seguridad y reinicia el valor a `0`.

### 3. Experiencia de Usuario (UX)
- **Carga inicial**: Se implementó `src/app/loading.tsx` con un esqueleto (skeleton) animado con Tailwind mientras el servidor resuelve la consulta inicial a Supabase.
- **Feedback interactivo**: Mientras se ejecuta la Server Action, se muestra el estado *"Guardando…"*.
- **Transición a cero**: Cuando el temporizador llega a `00:00`, se activa un estado de sincronización (`isResetting`), se atenúa el contador, se muestra *"Reiniciando contador a 0…"* y se **deshabilitan los botones** para prevenir condiciones de carrera hasta que la base de datos confirme el reseteo.

---

## Estructura del Proyecto

```
prisma/schema.prisma              Modelo de datos (Counter con lastMessageId)
supabase/schema.sql               DDL para inicializar la tabla en Supabase
src/app/page.tsx                  Página principal (Server Component)
src/app/loading.tsx               Skeleton de carga inicial (React Suspense)
src/app/api/reset-counter/route.ts Webhook protegido de QStash para el reseteo
src/components/Counter.tsx        Widget interactivo del contador (Client Component)
src/lib/actions.ts                Server Actions (getCounter, increment, decrement)
src/lib/qstash.ts                 Cliente y helper de reprogramación de jobs en QStash
src/lib/prisma.ts                 Instancia singleton de Prisma con adapter pg
```

---

## Deploy en Vercel

1. Subir el código a GitHub.
2. Importar el proyecto en [Vercel](https://vercel.com).
3. Configurar las siguientes **Environment Variables** en Vercel:
   - `DATABASE_URL`: Connection string de Supabase (modo pooler recomendado).
   - `QSTASH_TOKEN`: Token obtenido en [console.upstash.com](https://console.upstash.com/) (pestaña QStash).
   - `QSTASH_CURRENT_SIGNING_KEY`: Clave de firma actual de QStash.
   - `QSTASH_NEXT_SIGNING_KEY`: Siguiente clave de firma de QStash.
   - `NEXT_PUBLIC_RESET_TIME`: (Opcional) Tiempo de reseteo, por defecto `20m`.
4. Realizar el deploy. Vercel ejecutará automáticamente `prisma generate && next build`.
