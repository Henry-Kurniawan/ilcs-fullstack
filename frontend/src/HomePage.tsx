import { useEffect, useState } from "react";
import { healthResponseSchema } from "@musicpedia/shared";

type State = "memuat" | "ok" | "gagal";

export function HomePage() {
  const [state, setState] = useState<State>("memuat");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((body) => {
        healthResponseSchema.parse(body);
        setState("ok");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("gagal");
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">MusicPedia</h1>
      <p className="mt-4">
        Status backend: <span data-testid="health">{state}</span>
      </p>
    </main>
  );
}
