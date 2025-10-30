"use client";

import React from "react";
import { trpc } from "@/lib/trpc";

export default function GeneratorsPage() {
  const utils = trpc.useUtils?.() as any;
  const list = trpc.generators.list.useQuery();

  const runMutation = trpc.generators.run.useMutation({
    onSuccess: () => {
      try {
        utils?.generators?.list?.invalidate?.();
      } catch {}
    },
  });

  const [pkgName, setPkgName] = React.useState("");
  const [pkgDesc, setPkgDesc] = React.useState("");
  const [featureName, setFeatureName] = React.useState("");
  const [addComp, setAddComp] = React.useState(true);
  const [addApi, setAddApi] = React.useState(false);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Generators</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Available</h2>
        {list.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {list.data?.generators.map((g: any) => (
              <li key={g.name}>
                <span className="font-medium">{g.name}</span> — {g.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">New Package</h2>
        <div className="flex gap-2 items-center">
          <input
            placeholder="name (e.g. utils)"
            className="border px-2 py-1 rounded"
            value={pkgName}
            onChange={(e) => setPkgName(e.target.value)}
          />
          <input
            placeholder="description"
            className="border px-2 py-1 rounded flex-1"
            value={pkgDesc}
            onChange={(e) => setPkgDesc(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            disabled={!pkgName || runMutation.isPending}
            onClick={() =>
              runMutation.mutate({
                name: "new-package",
                params: { name: pkgName, description: pkgDesc },
              } as any)
            }
          >
            {runMutation.isPending ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Next.js Feature (apps/web)</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            placeholder="feature name (e.g. billing)"
            className="border px-2 py-1 rounded"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={addComp}
              onChange={(e) => setAddComp(e.target.checked)}
            />
            Add component
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={addApi}
              onChange={(e) => setAddApi(e.target.checked)}
            />
            Add API route
          </label>
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            disabled={!featureName || runMutation.isPending}
            onClick={() =>
              runMutation.mutate({
                name: "nextjs-feature",
                params: {
                  name: featureName,
                  addComponent: addComp,
                  addApiRoute: addApi,
                },
              } as any)
            }
          >
            {runMutation.isPending ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      {runMutation.data ? (
        <section className="space-y-2">
          <h3 className="text-lg font-medium">Result</h3>
          {runMutation.data.ok ? (
            <pre className="whitespace-pre-wrap text-xs p-2 bg-gray-50 border rounded">
              {runMutation.data.stdout}
            </pre>
          ) : (
            <pre className="whitespace-pre-wrap text-xs p-2 bg-red-50 border rounded">
              {runMutation.data.stderr || runMutation.data.stdout}
            </pre>
          )}
        </section>
      ) : null}
    </div>
  );
}
