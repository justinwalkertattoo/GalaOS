"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function SystemPage() {
  const diag = trpc.system.diagnostics.useQuery();

  const Dot = ({ ok, label }: { ok: boolean; label: string }) => (
    <HoverTip text={ok ? `${label} is healthy` : `${label} check failed` }>
      <div className={`inline-flex items-center gap-2 p-2 rounded border ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">{label}</span>
      </div>
    </HoverTip>
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">System Health</h1>
      {diag.isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="border rounded p-3 space-y-2">
            <h2 className="font-medium mb-2">Structure</h2>
            <ul className="text-sm space-y-2">
              {diag.data && Object.entries(diag.data.checks).map(([k,v]) => (
                <li key={k}><Dot ok={Boolean(v)} label={k} /></li>
              ))}
            </ul>
          </section>
          <section className="border rounded p-3 space-y-2">
            <h2 className="font-medium mb-2">Health</h2>
            <ul className="text-sm space-y-2">
              <li><Dot ok={Boolean(diag.data?.health.api)} label="API" /></li>
              <li><Dot ok={Boolean(diag.data?.health.db)} label="Database" /></li>
              <li><Dot ok={Boolean(diag.data?.health.redis)} label="Redis" /></li>
            </ul>
          </section>
          <section className="border rounded p-3 space-y-2">
            <h2 className="font-medium mb-2">Env Lint</h2>
            <ul className="text-sm space-y-2">
              {diag.data && Object.entries(diag.data.envLint).map(([k,v]) => (
                <li key={k}><Dot ok={Boolean(v)} label={k} /></li>
              ))}
            </ul>
          </section>
          <section className="border rounded p-3 space-y-2">
            <h2 className="font-medium mb-2">Scripts</h2>
            <ul className="text-xs space-y-1">
              {diag.data && Object.entries(diag.data.scripts).map(([k,v]) => (
                <li key={k}><code>{k}</code><span className="text-slate-500"> — {String(v)}</span></li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function HoverTip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="inline-block relative" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      {children}
      <div className={`absolute z-10 left-0 mt-1 w-64 p-2 text-xs rounded border bg-white shadow transition-all ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{ transformOrigin: 'top left' }}>
        {text}
      </div>
    </div>
  );
}
