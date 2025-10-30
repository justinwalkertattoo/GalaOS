"use client";
import React from "react";
import { trpc } from "@/lib/trpc";

export default function RateLimitAdminPage() {
  const limits = trpc.usage.getLimits.useQuery();
  const setLimits = trpc.usage.setLimits.useMutation({ onSuccess: () => limits.refetch() });
  const [form, setForm] = React.useState({
    perMinute: 60,
    perHour: 2000,
    perDay: 20000,
    dailyUsdCap: 0,
    monthlyUsdCap: 0,
    alertEmail: "",
    alertThreshold: 80,
  });

  React.useEffect(() => {
    if (limits.data) {
      setForm({
        perMinute: limits.data.perMinute ?? 60,
        perHour: limits.data.perHour ?? 2000,
        perDay: limits.data.perDay ?? 20000,
        dailyUsdCap: Number(limits.data.dailyUsdCap ?? 0),
        monthlyUsdCap: Number(limits.data.monthlyUsdCap ?? 0),
        alertEmail: limits.data.alertEmail ?? "",
        alertThreshold: limits.data.alertThreshold ?? 80,
      });
    }
  }, [limits.data]);

  const save = () => setLimits.mutate({ ...form });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Rate Limiting</h1>
      <p className="text-sm text-muted-foreground">Control per-user request rates and budget caps.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Requests" subtitle="Throttle burst and sustained usage">
          <NumberRow label="Per Minute" value={form.perMinute} onChange={(v)=>setForm(f=>({...f, perMinute: v}))} />
          <NumberRow label="Per Hour" value={form.perHour} onChange={(v)=>setForm(f=>({...f, perHour: v}))} />
          <NumberRow label="Per Day" value={form.perDay} onChange={(v)=>setForm(f=>({...f, perDay: v}))} />
        </Card>
        <Card title="Budgets" subtitle="Automatic alerts and caps">
          <NumberRow label="Daily USD Cap" value={form.dailyUsdCap} onChange={(v)=>setForm(f=>({...f, dailyUsdCap: v}))} step={1} />
          <NumberRow label="Monthly USD Cap" value={form.monthlyUsdCap} onChange={(v)=>setForm(f=>({...f, monthlyUsdCap: v}))} step={1} />
          <TextRow label="Alert Email" value={form.alertEmail} onChange={(v)=>setForm(f=>({...f, alertEmail: v}))} />
          <NumberRow label="Alert Threshold (%)" value={form.alertThreshold} onChange={(v)=>setForm(f=>({...f, alertThreshold: v}))} step={1} />
        </Card>
      </div>

      <div>
        <button
          onClick={save}
          className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
          disabled={setLimits.isPending}
        >{setLimits.isPending ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border rounded p-4 space-y-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function NumberRow({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-40">{label}</label>
      <button className="border px-2" onClick={()=>onChange(Math.max(0, Number(value) - step))}>-</button>
      <input className="border px-2 py-1 w-32" value={value} onChange={e=>onChange(Number(e.target.value))} />
      <button className="border px-2" onClick={()=>onChange(Number(value) + step)}>+</button>
    </div>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-40">{label}</label>
      <input className="border px-2 py-1 flex-1" value={value} onChange={e=>onChange(e.target.value)} />
    </div>
  );
}

