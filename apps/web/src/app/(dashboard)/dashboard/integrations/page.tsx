'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

export default function IntegrationsPage() {
  const { data: providerData, refetch: refetchProviders } = trpc.oauthIntegrations.listProviders.useQuery();
  const { data: connectionsData, refetch: refetchConnections } = trpc.oauthIntegrations.listConnections.useQuery();

  const [apiKeyProvider, setApiKeyProvider] = useState<string>('');
  const [apiKeyValue, setApiKeyValue] = useState<string>('');
  const [connectingProvider, setConnectingProvider] = useState<string>('');

  const connectApiKeyMutation = trpc.settings.addApiKey.useMutation({
    onSuccess: () => {
      setApiKeyValue('');
      setApiKeyProvider('');
      refetchConnections();
    },
  });

  const getAuthUrlMutation = trpc.oauthIntegrations.getAuthUrl.useMutation();
  const revokeConnectionMutation = trpc.oauthIntegrations.revokeConnection.useMutation({
    onSuccess: () => {
      refetchConnections();
    },
  });

  const providers = providerData?.providers || [];
  const connections = useMemo(() => connectionsData?.connections || [], [connectionsData?.connections]);

  const connectedByProvider = useMemo(() => {
    const map = new Map<string, boolean>();
    connections.forEach((c: any) => map.set(c.providerId, true));
    return map;
  }, [connections]);

  const handleOAuthConnect = async (providerId: string) => {
    try {
      setConnectingProvider(providerId);
      const redirectUri = window.location.origin + '/api/oauth/callback';
      const res = await getAuthUrlMutation.mutateAsync({ providerId, redirectUri });
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      }
    } finally {
      setConnectingProvider('');
    }
  };

  const handleApiKeyConnect = async () => {
    if (!apiKeyProvider || !apiKeyValue) return;
    const p = apiKeyProvider.toLowerCase();
    const known = ['anthropic','openai','buffer','instagram','sendgrid','stripe'] as const;
    const type = (known as readonly string[]).includes(p) ? (p as any) : ('other' as any);
    await connectApiKeyMutation.mutateAsync({ name: apiKeyProvider, type, key: apiKeyValue });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Connect your accounts and API keys</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Available Providers */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Available Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p: any) => (
              <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{p.type} • {p.status}</div>
                </div>
                {p.type === 'api_key' ? (
                  <button
                    onClick={() => setApiKeyProvider(p.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {connectedByProvider.get(p.id) ? 'Update Key' : 'Connect Key'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleOAuthConnect(p.id)}
                    disabled={connectingProvider === p.id}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connectedByProvider.get(p.id) ? 'Reconnect' : connectingProvider === p.id ? 'Opening…' : 'Connect'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* API Key Connect Modal (inline simple) */}
        {apiKeyProvider && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Connect API Key</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Provider: {apiKeyProvider}</div>
            <div className="flex items-center space-x-2">
              <input
                type="password"
                placeholder="Enter API key"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
              />
              <button
                onClick={handleApiKeyConnect}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => { setApiKeyProvider(''); setApiKeyValue(''); }}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Active Connections */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Active Connections</h2>
          <div className="space-y-3">
            {connections.length === 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">No active connections yet.</div>
            )}
            {connections.map((c: any) => (
              <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{c.providerName}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{c.providerId} • {c.type} • {c.status}</div>
                </div>
                <button
                  onClick={() => revokeConnectionMutation.mutate({ connectionId: c.id })}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
