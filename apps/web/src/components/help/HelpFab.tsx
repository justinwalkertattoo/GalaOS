"use client";
import React from 'react';
import { trpc } from '@/lib/trpc';

export default function HelpFab() {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [focus, setFocus] = React.useState("");
  const ask = trpc.help.ask.useMutation();
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-black text-white text-xl shadow">?</button>
      {open && (
        <div className="fixed inset-0 bg-black/20" onClick={()=>setOpen(false)} />
      )}
      {open && (
        <div className="fixed bottom-16 right-4 w-[360px] max-w-[calc(100%-2rem)] bg-white rounded shadow-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Ask Gala</div>
            <button className="text-sm" onClick={()=>setOpen(false)}>Close</button>
          </div>
          <input className="w-full border rounded px-2 py-1" placeholder="How can I…" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="w-full border rounded px-2 py-1" placeholder="Optional focus (e.g., integrations, setup)" value={focus} onChange={e=>setFocus(e.target.value)} />
          <button className="px-3 py-1 rounded bg-black text-white disabled:opacity-50" disabled={!q || ask.isPending} onClick={async ()=>{ await ask.mutateAsync({ q, focus: focus||undefined }); }}>Ask</button>
          <div className="text-xs text-slate-700 whitespace-pre-wrap min-h-[80px] border rounded p-2 bg-gray-50">{ask.data?.text || 'Ask how to set up, integrate, or use features.'}</div>
          <div className="text-[11px] text-slate-500">Powered by local manual + AI (if configured)</div>
        </div>
      )}
    </>
  );
}

