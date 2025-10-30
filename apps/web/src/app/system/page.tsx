"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function SystemPage() {
  const diag = trpc.system.diagnostics.useQuery();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">System Health</h1>
      {diag.isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="border rounded p-3">
            <h2 className="font-medium mb-2">Structure</h2>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(diag.data?.checks, null, 2)}</pre>
          </section>
          <section className="border rounded p-3">
            <h2 className="font-medium mb-2">Health</h2>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(diag.data?.health, null, 2)}</pre>
          </section>
          <section className="border rounded p-3">
            <h2 className="font-medium mb-2">Env Lint</h2>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(diag.data?.envLint, null, 2)}</pre>
          </section>
          <section className="border rounded p-3">
            <h2 className="font-medium mb-2">Scripts</h2>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(diag.data?.scripts, null, 2)}</pre>
          </section>
        </div>
      )}
    </div>
  );
}

