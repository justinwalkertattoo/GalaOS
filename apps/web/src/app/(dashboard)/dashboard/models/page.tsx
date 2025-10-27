'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Server, Cloud, Container, CheckCircle2, XCircle, Loader2, Trash2, Play, Square } from 'lucide-react';

type ProviderType = 'cloud' | 'ollama' | 'docker';

export default function ModelsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ProviderType>('ollama');

  const { data: providers, refetch } = trpc.models.list.useQuery();
  const { data: stats } = trpc.models.stats.useQuery();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Server className="w-8 h-8 mr-3 text-indigo-500" />
              Model Providers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage cloud, Ollama, and Docker AI model providers
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Provider</span>
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <StatCard
              icon={<Server className="w-6 h-6 text-indigo-500" />}
              label="Total Providers"
              value={stats.total}
            />
            <StatCard
              icon={<Cloud className="w-6 h-6 text-blue-500" />}
              label="Cloud"
              value={stats.byType.cloud || 0}
            />
            <StatCard
              icon={<Server className="w-6 h-6 text-green-500" />}
              label="Ollama"
              value={stats.byType.ollama || 0}
            />
            <StatCard
              icon={<Container className="w-6 h-6 text-purple-500" />}
              label="Docker"
              value={stats.byType.docker || 0}
            />
          </div>
        )}
      </div>

      {/* Provider Types Tabs */}
      <div className="p-6">
        <div className="flex space-x-2 mb-6">
          <TabButton
            active={selectedType === 'cloud'}
            onClick={() => setSelectedType('cloud')}
            icon={<Cloud className="w-4 h-4" />}
            label="Cloud Models"
          />
          <TabButton
            active={selectedType === 'ollama'}
            onClick={() => setSelectedType('ollama')}
            icon={<Server className="w-4 h-4" />}
            label="Ollama"
          />
          <TabButton
            active={selectedType === 'docker'}
            onClick={() => setSelectedType('docker')}
            icon={<Container className="w-4 h-4" />}
            label="Docker"
          />
        </div>

        {/* Providers List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {providers
            ?.filter((p) => p.type === selectedType)
            .map((provider) => (
              <ProviderCard key={provider.id} provider={provider} onUpdate={() => refetch()} />
            ))}

          {providers?.filter((p) => p.type === selectedType).length === 0 && (
            <div className="col-span-2 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Server className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No {selectedType} providers yet
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                Add a {selectedType} provider to get started!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Provider
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAddModal && (
        <AddProviderModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            refetch();
          }}
          initialType={selectedType}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProviderCard({ provider, onUpdate }: { provider: any; onUpdate: () => void }) {
  const deleteMutation = trpc.models.delete.useMutation({
    onSuccess: () => onUpdate(),
  });

  const testOllamaMutation = trpc.models.testOllama.useMutation();
  const testDockerMutation = trpc.models.testDockerModel.useMutation();

  const handleTest = async () => {
    if (provider.type === 'ollama') {
      await testOllamaMutation.mutateAsync({
        baseUrl: provider.baseUrl || 'http://localhost:11434',
      });
    } else if (provider.type === 'docker') {
      await testDockerMutation.mutateAsync({
        containerName: provider.containerName,
        baseUrl: provider.baseUrl || 'http://localhost:8000',
      });
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${provider.name}?`)) {
      deleteMutation.mutate({ id: provider.id });
    }
  };

  const statusIcon = {
    online: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    offline: <XCircle className="w-5 h-5 text-red-500" />,
    unknown: <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />,
  }[provider.status] || <XCircle className="w-5 h-5 text-gray-400" />;

  const typeIcon = {
    cloud: <Cloud className="w-5 h-5 text-blue-500" />,
    ollama: <Server className="w-5 h-5 text-green-500" />,
    docker: <Container className="w-5 h-5 text-purple-500" />,
  }[provider.type];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {typeIcon}
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{provider.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {provider.provider} • {provider.type}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {statusIcon}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {provider.baseUrl && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Base URL:</span>
            <span className="font-mono text-gray-900 dark:text-white">{provider.baseUrl}</span>
          </div>
        )}
        {provider.containerName && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Container:</span>
            <span className="font-mono text-gray-900 dark:text-white">{provider.containerName}</span>
          </div>
        )}
        {provider.model && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Default Model:</span>
            <span className="font-mono text-gray-900 dark:text-white">{provider.model}</span>
          </div>
        )}
        {Array.isArray(provider.models) && provider.models.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Available Models:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{provider.models.length}</span>
          </div>
        )}
      </div>

      {/* Test Result */}
      {(testOllamaMutation.data || testDockerMutation.data) && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            (testOllamaMutation.data?.success || testDockerMutation.data?.success)
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}
        >
          {testOllamaMutation.data?.message || testDockerMutation.data?.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 mt-4">
        {provider.type !== 'cloud' && (
          <button
            onClick={handleTest}
            disabled={testOllamaMutation.isLoading || testDockerMutation.isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {testOllamaMutation.isLoading || testDockerMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Test Connection</span>
              </>
            )}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isLoading}
          className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AddProviderModal({
  onClose,
  onCreated,
  initialType,
}: {
  onClose: () => void;
  onCreated: () => void;
  initialType: ProviderType;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: initialType,
    provider: 'ollama' as const,
    baseUrl: 'http://localhost:11434',
    containerName: '',
    model: '',
  });

  const createMutation = trpc.models.create.useMutation({
    onSuccess: () => onCreated(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Add Model Provider</h2>
          <p className="text-white/80 mt-1">Connect a new AI model provider</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Local Ollama, Production Claude"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as ProviderType,
                  provider: e.target.value === 'ollama' ? 'ollama' : e.target.value === 'docker' ? 'docker' : 'anthropic',
                  baseUrl: e.target.value === 'ollama' ? 'http://localhost:11434' : e.target.value === 'docker' ? 'http://localhost:8000' : '',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="cloud">Cloud (Anthropic/OpenAI)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="docker">Docker Container</option>
            </select>
          </div>

          {formData.type === 'cloud' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cloud Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT-4)</option>
              </select>
            </div>
          )}

          {(formData.type === 'ollama' || formData.type === 'docker') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder={formData.type === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8000'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          {formData.type === 'docker' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Container Name
              </label>
              <input
                type="text"
                value={formData.containerName}
                onChange={(e) => setFormData({ ...formData, containerName: e.target.value })}
                placeholder="e.g., my-ai-model"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Model (Optional)
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder={
                formData.type === 'ollama'
                  ? 'llama2, codellama, mistral'
                  : formData.type === 'docker'
                  ? 'custom-model'
                  : 'claude-3-5-sonnet-20241022'
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          {createMutation.error && (
            <p className="text-red-600 text-sm">{createMutation.error.message}</p>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Adding...' : 'Add Provider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
