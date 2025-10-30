"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function UsageAdminPage() {
  const daily = trpc.usage.summary.useQuery({ range: "day" });
  const monthly = trpc.usage.summary.useQuery({ range: "month" });
  const breakdown = trpc.usage.breakdown.useQuery({ range: "month" });
  const series = trpc.usage.series.useQuery({ days: 14 });
  const limits = trpc.usage.getLimits.useQuery();
  const setLimits = trpc.usage.setLimits.useMutation({ onSuccess: () => limits.refetch() });
  const explain = trpc.usage.explain.useMutation();

  const [form, setForm] = React.useState({
    dailyUsdCap: 0,
    monthlyUsdCap: 0,
    perMinute: 60,
    perHour: 2000,
    perDay: 20000,
    alertEmail: "",
    alertThreshold: 80,
  });
  const [focus, setFocus] = React.useState("");
  const [analysis, setAnalysis] = React.useState<string>("");

  React.useEffect(() => {
    if (limits.data) {
      setForm({
        dailyUsdCap: Number(limits.data.dailyUsdCap ?? 0),
        monthlyUsdCap: Number(limits.data.monthlyUsdCap ?? 0),
        perMinute: limits.data.perMinute ?? 60,
        perHour: limits.data.perHour ?? 2000,
        perDay: limits.data.perDay ?? 20000,
        alertEmail: limits.data.alertEmail ?? "",
        alertThreshold: limits.data.alertThreshold ?? 80,
      });
    }
  }, [limits.data]);

  const bump = (k: keyof typeof form, delta: number) => setForm((f) => ({ ...f, [k]: Math.max(0, Number(f[k]) + delta) }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Usage & Limits</h1>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">Today</h2>
          {daily.data ? (
            <ul className="text-sm">
              <li>Total USD: ${daily.data.totalUsd.toFixed(4)}</li>
              <li>Events: {daily.data.count}</li>
              <li>Tokens In: {daily.data.tokensIn}</li>
              <li>Tokens Out: {daily.data.tokensOut}</li>
            </ul>
          ) : (
            <p>Loading…</p>
          )}
        </div>
        <div className="border rounded p-3">
          <h2 className="font-medium mb-2">This Month</h2>
          {monthly.data ? (
            <ul className="text-sm">
              <li>Total USD: ${monthly.data.totalUsd.toFixed(4)}</li>
              <li>Events: {monthly.data.count}</li>
              <li>Tokens In: {monthly.data.tokensIn}</li>
              <li>Tokens Out: {monthly.data.tokensOut}</li>
              <li>Forecast USD: ${monthly.data.forecast?.toFixed(2)}</li>
            </ul>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Spend Trend (14 days)</h2>
        {series.data ? (
          <Sparkline
            points={series.data}
            renderPoint={(pt) => (
              <ExplainHover
                label={`$${pt.totalUsd.toFixed(4)} on ${pt.date}`}
                cacheKey={`trend:${pt.date}:${pt.totalUsd.toFixed(4)}`}
                getText={async () => {
                  const res = await explain.mutateAsync({ focus: `Focus: reduce spend on ${pt.date} which totaled $${pt.totalUsd.toFixed(4)}.` });
                  return res.text;
                }}
              />
            )}
          />
        ) : <p>Loading…</p>}
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Provider / Model Breakdown (Month)</h2>
        {breakdown.data ? (
          <div className="text-sm space-y-2">
            {Object.entries(breakdown.data as any).map(([prov, info]: any) => (
              <div key={prov} className="border rounded p-2">
                <div className="font-medium flex items-center gap-2">
                  {prov} — ${info.totalUsd.toFixed(4)}
                  <ExplainHover
                    label="What drives this?"
                    cacheKey={`prov:${prov}:${(info as any).totalUsd}`}
                    getText={async () => {
                      const res = await explain.mutateAsync({ focus: `Focus provider ${prov} with spend $${info.totalUsd.toFixed(4)}. Suggest reductions.` });
                      return res.text;
                    }}
                  />
                </div>
                <ul className="pl-5 list-disc">
                  {Object.entries((info as any).models).map(([model, usd]: any) => (
                    <li key={model} className="flex items-center gap-2">
                      <span>{model}: ${usd.toFixed(4)}</span>
                      <ExplainHover
                        label="Explain"
                        cacheKey={`model:${prov}:${model}:${(usd as any).toFixed ? (usd as any).toFixed(4) : usd}`}
                        getText={async () => {
                          const res = await explain.mutateAsync({ focus: `Focus provider ${prov} model ${model} spend $${usd.toFixed(4)}. Provide concrete optimization steps.` });
                          return res.text;
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : <p>Loading…</p>}
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Limits</h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {([
            ['dailyUsdCap','Daily USD Cap'],
            ['monthlyUsdCap','Monthly USD Cap'],
            ['perMinute','Requests / minute'],
            ['perHour','Requests / hour'],
            ['perDay','Requests / day'],
          ] as const).map(([k,label]) => (
            <div key={k} className="flex items-center gap-2">
              <label className="w-40">{label}</label>
              <button className="border px-2" onClick={()=>bump(k, -1)}>-</button>
              <input className="border px-2 py-1 w-32" value={form[k] as any} onChange={e=>setForm({...form,[k]:Number(e.target.value)})} />
              <button className="border px-2" onClick={()=>bump(k, +1)}>+</button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <label className="w-40">Alert Email</label>
            <input className="border px-2 py-1 flex-1" value={form.alertEmail} onChange={e=>setForm({...form,alertEmail:e.target.value})} />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-40">Alert Threshold (%)</label>
            <input className="border px-2 py-1 w-32" value={form.alertThreshold} onChange={e=>setForm({...form,alertThreshold:Number(e.target.value)})} />
          </div>
        </div>
        <div>
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            onClick={() => setLimits.mutate({ ...form })}
            disabled={setLimits.isPending}
          >
            {setLimits.isPending ? 'Saving…' : 'Save Limits'}
          </button>
        </div>
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Gala Suggestions</h2>
        <p className="text-sm text-muted-foreground">Ask Gala to explain current usage and suggest ways to reduce tokens/costs.</p>
        <textarea
          value={focus}
          onChange={(e)=>setFocus(e.target.value)}
          placeholder="Optional focus (e.g., prioritize Anthropic reductions, keep latency low, etc.)"
          className="w-full border rounded p-2 min-h-[80px]"
        />
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
            onClick={async ()=>{
              setAnalysis("");
              try {
                const res = await explain.mutateAsync({ focus });
                setAnalysis(res.text || "");
              } catch (e:any) {
                setAnalysis(e?.message || 'Failed to generate analysis');
              }
            }}
            disabled={explain.isPending}
          >
            {explain.isPending ? 'Generating…' : 'Generate Suggestions'}
          </button>
        </div>
        {analysis ? (
          <pre className="whitespace-pre-wrap text-sm p-3 bg-gray-50 border rounded">{analysis}</pre>
        ) : null}
      </section>
    </div>
  );
}

function Sparkline({ points, renderPoint }: { points: { date: string; totalUsd: number }[]; renderPoint: (pt: { date: string; totalUsd: number }) => React.ReactNode }) {
  const width = 560; const height = 120; const pad = 8;
  const max = Math.max(1, ...points.map(p=>p.totalUsd));
  const poly = points.map((p,i)=>{
    const x = pad + (i*(width-2*pad))/(Math.max(1,points.length-1));
    const y = height - pad - (p.totalUsd/max)*(height-2*pad);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="relative inline-block">
      <svg width={width} height={height} className="bg-white border rounded">
        <polyline points={poly} fill="none" stroke="#0ea5e9" strokeWidth="2" />
        {points.map((p,i)=>{
          const x = pad + (i*(width-2*pad))/(Math.max(1,points.length-1));
          const y = height - pad - (p.totalUsd/max)*(height-2*pad);
          return (
            <g key={p.date}>
              <circle cx={x} cy={y} r={3} fill="#0ea5e9" />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 pointer-events-none">
        {points.map((p,i)=>{
          const x = pad + (i*(width-2*pad))/(Math.max(1,points.length-1));
          const y = height - pad - (p.totalUsd/max)*(height-2*pad);
          return (
            <div key={p.date} style={{ position: 'absolute', left: x-8, top: y-8 }} className="pointer-events-auto">
              {renderPoint(p)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const explainCache = new Map<string, string>();
function ExplainHover({ label, getText, cacheKey }: { label: string; getText: () => Promise<string>; cacheKey: string }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [text, setText] = React.useState<string>("");
  const timer = React.useRef<any>(null);
  const inFlight = React.useRef<Promise<string> | null>(null);

  const fetchText = React.useCallback(async () => {
    if (explainCache.has(cacheKey)) {
      return explainCache.get(cacheKey)!;
    }
    if (inFlight.current) return inFlight.current;
    const p = getText().then((t) => {
      explainCache.set(cacheKey, t);
      return t;
    });
    inFlight.current = p;
    const result = await p.finally(() => { inFlight.current = null; });
    return result;
  }, [cacheKey, getText]);

  return (
    <div
      onMouseEnter={() => {
        setOpen(true);
        if ((!text || text.length === 0) && !loading) {
          setLoading(true);
          timer.current = setTimeout(async () => {
            try { const t = await fetchText(); setText(t); } finally { setLoading(false); }
          }, 300);
        }
      }}
      onMouseLeave={() => { setOpen(false); if (timer.current) clearTimeout(timer.current); }}
      className="inline-flex items-center gap-1 cursor-help relative"
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 text-slate-600 text-[11px] hover:bg-slate-100" aria-label={label}>i</span>
      {open && (
        <div className="z-10 absolute mt-2 w-80 p-3 rounded border bg-white shadow-lg animate-in fade-in-0 zoom-in-95" style={{ transformOrigin: 'top left' }}>
          <div className="text-xs text-slate-700 whitespace-pre-wrap">
            {loading ? 'Analyzing…' : (text || 'No details')}
          </div>
        </div>
      )}
    </div>
  );
}
