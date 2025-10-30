'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Trash2, CheckCircle2, XCircle, Loader2, Key, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    name: '',
    type: 'anthropic' as const,
    key: '',
  });
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys, refetch } = trpc.settings.listApiKeys.useQuery({});

  const addKeyMutation = trpc.settings.addApiKey.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddForm(false);
      setNewKey({ name: '', type: 'anthropic', key: '' });
    },
  });

  const testKeyMutation = trpc.settings.testApiKey.useMutation();

  const deleteKeyMutation = trpc.settings.deleteApiKey.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    addKeyMutation.mutate(newKey);
  };

  const handleTestKey = (id: string) => {
    testKeyMutation.mutate({ id });
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Are you sure you want to delete this API key?')) {
      deleteKeyMutation.mutate({ id });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your API keys and integrations
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* API Keys Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Key className="w-6 h-6 mr-2 text-blue-600" />
                API Keys
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Securely stored and encrypted. Never share your keys!
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Key</span>
            </button>
          </div>

          {/* Add Key Form */}
          {showAddForm && (
            <form onSubmit={handleAddKey} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Add New API Key
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    placeholder="e.g., Anthropic API, Buffer, SendGrid"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Type
                  </label>
                  <select
                    value={newKey.type}
                    onChange={(e) => setNewKey({ ...newKey, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="buffer">Buffer</option>
                    <option value="instagram">Instagram</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={newKey.key}
                      onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                      placeholder="sk-ant-... or your API key"
                      required
                      className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={addKeyMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addKeyMutation.isLoading ? 'Adding...' : 'Add Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
                {addKeyMutation.error && (
                  <p className="text-red-600 text-sm">{addKeyMutation.error.message}</p>
                )}
              </div>
            </form>
          )}

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys?.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No API keys yet. Add one to get started!
              </p>
            )}

            {apiKeys?.map((key: any) => {
              const testResult = testKeyMutation.data;
              const isTestingThis = testKeyMutation.isLoading;

              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{key.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {key.keyPreview}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Added {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt &&
                        ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestKey(key.id)}
                      disabled={isTestingThis}
                      className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 flex items-center space-x-1"
                    >
                      {isTestingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{isTestingThis ? 'Testing...' : 'Test'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      disabled={deleteKeyMutation.isLoading}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Result */}
          {testKeyMutation.data && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                testKeyMutation.data.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {testKeyMutation.data.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{testKeyMutation.data.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            🔒 Security Note
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-400">
            Your API keys are encrypted before being stored in the database. GalaOS uses them only
            to make requests on your behalf and never shares them with third parties.
          </p>
        </div>

        {/* Guide */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Where to get API keys
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Anthropic (Claude)</h3>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                https://console.anthropic.com/settings/keys
              </a>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">OpenAI (GPT-4)</h3>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                https://platform.openai.com/api-keys
              </a>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Buffer</h3>
              <a
                href="https://buffer.com/developers/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                https://buffer.com/developers/api
              </a>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">SendGrid</h3>
              <a
                href="https://app.sendgrid.com/settings/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                https://app.sendgrid.com/settings/api_keys
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
