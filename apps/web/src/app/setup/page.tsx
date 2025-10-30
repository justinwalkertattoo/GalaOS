"use client";
import React from 'react';
import { trpc } from '@/lib/trpc';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc').replace(/\/$/, '');
const API_BASE = API_URL.replace(/\/trpc$/, '');

export default function SetupPage() {
  const [health, setHealth] = React.useState<string>('unknown');
  const [checking, setChecking] = React.useState(false);
  const [key, setKey] = React.useState('');
  const [provider, setProvider] = React.useState<'anthropic'|'openai'>('anthropic');
  const addKey = trpc.settings.addApiKey.useMutation();

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/healthz`);
      setHealth(res.ok ? 'ok' : `error:${res.status}`);
    } catch (e: any) {
      setHealth('error');
    } finally {
      setChecking(false);
    }
  };

  React.useEffect(() => { checkHealth(); }, []);

  const onSaveKey = async () => {
    if (!key) return;
    await addKey.mutateAsync({ provider, name: provider, apiKey: key });
    setKey('');
  };

  const isElectron = typeof (globalThis as any).electron !== 'undefined';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">GalaOS Setup</h1>
      <p className="text-slate-600">Follow these steps to get running locally.</p>

      <section className="border rounded p-4 space-y-2">
        <h2 className="font-medium">1) Start Services</h2>
        <p className="text-sm text-slate-600">Ensure Docker Desktop is running. Then start the stack.</p>
        {isElectron ? (
          <button className="px-3 py-1 rounded bg-black text-white" onClick={() => (window as any).electron.startServices?.()}>Start via Desktop</button>
        ) : (
          <pre className="text-xs bg-slate-50 p-2 rounded border">docker compose -f docker/docker-compose.yml up -d</pre>
        )}
      </section>

      <section className="border rounded p-4 space-y-2">
        <h2 className="font-medium">2) Check API Health</h2>
        <div className="text-sm">API base: <code>{API_BASE}</code></div>
        <button className="px-3 py-1 rounded border" onClick={checkHealth} disabled={checking}>{checking ? 'Checking…' : 'Re-check'}</button>
        <div className="text-sm">Health: <span className={health==='ok'? 'text-green-600':'text-red-600'}>{health}</span></div>
      </section>

      <section className="border rounded p-4 space-y-2">
        <h2 className="font-medium">3) Add API Key</h2>
        <div className="flex gap-2 items-center">
          <select value={provider} onChange={e=>setProvider(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
          </select>
          <input className="flex-1 border rounded px-2 py-1" placeholder="Paste API Key" value={key} onChange={e=>setKey(e.target.value)} />
          <button className="px-3 py-1 rounded bg-black text-white disabled:opacity-50" disabled={!key || addKey.isPending} onClick={onSaveKey}>{addKey.isPending? 'Saving…':'Save'}</button>
        </div>
        {addKey.error && <div className="text-xs text-red-600">{addKey.error.message}</div>}
      </section>

      <section className="border rounded p-4 space-y-2">
        <h2 className="font-medium">4) Finish</h2>
        <p className="text-sm text-slate-600">Once health is OK and keys are set, jump into the dashboard.</p>
        <a className="px-3 py-1 rounded bg-indigo-600 text-white" href="/dashboard">Go to Dashboard</a>
      </section>
    </div>
  );
}

