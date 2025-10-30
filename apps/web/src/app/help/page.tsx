"use client";
import React from 'react';
import { trpc } from '@/lib/trpc';
import Hint from '@/components/Hint';

export default function HelpPage() {
  const [q, setQ] = React.useState('');
  const search = trpc.help.search.useQuery(
    { q: q || 'help' },
    { enabled: false, refetchOnWindowFocus: false }
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    await search.refetch();
  };

  const hits = search.data?.hits || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">Help & Quick Start</h1>
      <p className="text-slate-600 mb-6">Search the local manual and find common setup answers.</p>

      <Hint id="help-first-time" title="Tip">
        You can also click the floating “?” button on any page to ask Gala. Answers use the local manual and, if configured, your AI provider.
      </Hint>

      <form onSubmit={onSubmit} className="mt-4 mb-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the manual (e.g., ‘connect OpenAI’, ‘prometheus’, ‘sentry’)"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={!q || search.isFetching}
        >
          {search.isFetching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {hits.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Results</h2>
          <div className="space-y-3">
            {hits.map((h: any, i: number) => (
              <div key={i} className="border rounded p-3 bg-white">
                <div className="font-medium mb-1">{h.heading}</div>
                <pre className="whitespace-pre-wrap text-sm text-slate-700">{h.snippet}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <QuickCard title="Connect API Keys">
          - Go to Dashboard → Settings → Providers.
          {'\n'}- Add keys (OpenAI, Anthropic, etc.).
          {'\n'}- Save and test with the Chat or Assistants page.
        </QuickCard>
        <QuickCard title="Enable Observability">
          - API exposes Prometheus at <code>/metrics</code>.
          {'\n'}- Import Grafana dashboard from <code>dashboards/grafana-galaos.json</code>.
          {'\n'}- See <code>docs/OBSERVABILITY.md</code> for full steps.
        </QuickCard>
        <QuickCard title="Set Up Sentry">
          - Set <code>SENTRY_DSN</code> in the API env.
          {'\n'}- Restart the API; errors are captured automatically.
        </QuickCard>
        <QuickCard title="OpenTelemetry (OTEL)">
          - Set <code>OTEL_EXPORTER_OTLP_ENDPOINT</code> (e.g., http://otel-collector:4318).
          {'\n'}- Traces export via OTLP/HTTP. Verify in your backend.
        </QuickCard>
      </div>
    </div>
  );
}

function QuickCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded p-4 bg-white">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-slate-700 whitespace-pre-wrap">{children}</div>
    </div>
  );
}
