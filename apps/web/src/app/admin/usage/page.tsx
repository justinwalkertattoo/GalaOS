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

  const [form, setForm] = React.useState({
    dailyUsdCap: 0,
    monthlyUsdCap: 0,
    perMinute: 60,
    perHour: 2000,
    perDay: 20000,
    alertEmail: "",
    alertThreshold: 80,
  });

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
          <Sparkline data={series.data.map(p=>p.totalUsd)} labels={series.data.map(p=>p.date)} />
        ) : <p>Loading…</p>}
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Provider / Model Breakdown (Month)</h2>
        {breakdown.data ? (
          <div className="text-sm space-y-2">
            {Object.entries(breakdown.data).map(([prov, info]) => (
              <div key={prov} className="border rounded p-2">
                <div className="font-medium">{prov} — ${info.totalUsd.toFixed(4)}</div>
                <ul className="pl-5 list-disc">
                  {Object.entries(info.models).map(([model, usd]) => (
                    <li key={model}>{model}: ${usd.toFixed(4)}</li>
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
    </div>
  );
}

function Sparkline({ data, labels }: { data: number[]; labels?: string[] }) {
  const width = 500; const height = 100; const pad = 4;
  const max = Math.max(1, ...data);
  const pts = data.map((v,i)=>{
    const x = pad + (i*(width-2*pad))/(Math.max(1,data.length-1));
    const y = height - pad - (v/max)*(height-2*pad);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="bg-white border rounded">
      <polyline points={pts} fill="none" stroke="#0ea5e9" strokeWidth="2" />
    </svg>
  );
}
