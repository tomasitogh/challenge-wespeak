import Counter from "@/components/Counter";
import { getCounter } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { serverNow, ...initial } = await getCounter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Counter initial={initial} serverNow={serverNow} />
    </main>
  );
}
