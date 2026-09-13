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

## Cómo correrlo

1. Crear un proyecto en [Supabase](https://supabase.com) y copiar la connection string del pooler.
2. Crear el archivo `.env` (o `.env.local`) en la raíz con la variable:

   ```
   DATABASE_URL=postgresql://...
   ```

3. Abrir el **SQL Editor** de Supabase y ejecutar el contenido de [`supabase/schema.sql`](supabase/schema.sql). Esto crea la tabla `counter` y el cron de reset cada 20 minutos en un solo paso.
4. Instalar dependencias y generar el cliente Prisma:

   ```bash
   npm install
   npx prisma generate
   ```

5. Correr la aplicación:

   ```bash
   npm run dev
   ```

Abrir [http://localhost:3000](http://localhost:3000).

## Cómo lo resolví

### Lógica del contador

- Tabla `counter` con una única fila (`id = 1`) que guarda `value` y `updated_at` (momento del último cambio).
- `increment`/`decrement` son **Server Actions**: leen el valor actual, lo modifican en DB y guardan el cambio **inmediatamente** (transacción), actualizando `updated_at`.
- El valor es **global**: una sola fila para todos los usuarios.

### Reset a los 20 minutos

Hay dos capas para el reset:

1. **Cron en Supabase (`pg_cron`)**: cada minuto pone el valor en 0 si `now() - updated_at >= 20 minutes`. Corre en la base, por lo que funciona aunque la app esté apagada.
2. **"Lazy reset" en la app (red de seguridad)**: al leer el valor, si ya pasaron 20 minutos, se devuelve (y persiste) 0. Cubre el caso de que el cron falle o no se haya configurado.

### Cron: ¿Vercel o Supabase? → **Supabase (pg_cron)**

- El cron escribe la base; correrlo **dentro de la misma base** elimina un salto de red y una dependencia, y **garantiza el reset aunque Vercel no reciba tráfico** (los cron de Vercel dependen de que el proyecto esté activo y del plan).
- `pg_cron` está disponible en el **plan free** de Supabase, sin costo ni configuración extra; un cron de Vercel suma una invocación serverless adicional por corrida.
- La lógica de negocio (respetar los 20 minutos) queda junto a los datos, en el mismo lugar.

### UX

- **Reminder de tiempo restante**: muestra cuánto falta para que el contador se reinicie (mm:ss) con una barra de progreso.
- **Estados de carga**: al tocar un botón se muestra "Guardando…" y los botones se deshabilitan hasta confirmar la escritura en DB; los errores se muestran en pantalla.
- La página es un **Server Component** (lee de DB en el server); solo el widget del contador es Client Component (necesario para el countdown y el estado de los botones).

## Estructura

```
prisma/schema.prisma      Modelo de datos (Counter)
supabase/schema.sql       DDL + pg_cron (copiar y pegar en SQL Editor)
src/lib/prisma.ts         Cliente Prisma (driver adapter pg)
src/lib/actions.ts        Server Actions: getCounter, increment, decrement
src/components/Counter.tsx  UI del contador + countdown (Client Component) - el único client component porque requiere interacción del usuario.
src/app/page.tsx          Landing (Server Component)
```

## Deploy

Deploy estándar en Vercel con una variable de entorno `DATABASE_URL`. En Supabase conviene chequear que IP allow-list (si está activa) contenga los egress de Vercel o usar la connection string del pooler.
