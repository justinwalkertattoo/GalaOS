"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function UsageAdminPage() {
  const daily = trpc.usage.summary.useQuery({ range: "day" });
  const monthly = trpc.usage.summary.useQuery({ range: "month" });
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
            </ul>
          ) : (
            <p>Loading…</p>
          )}
        </div>
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

