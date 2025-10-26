'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Wrench, Code, Trash2, Edit, Power, Sparkles, Star, Award, Crown } from 'lucide-react';

type TierType = 'common' | 'rare' | 'epic' | 'legendary';

export default function ToolsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: tools, refetch } = trpc.tools.list.useQuery();
  const { data: stats } = trpc.tools.stats.useQuery();

  const categories = [
    { id: 'all', label: 'All Tools', icon: Wrench },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'data', label: 'Data', icon: '📊' },
    { id: 'api', label: 'API', icon: '🔌' },
    { id: 'file', label: 'File', icon: '📁' },
    { id: 'web', label: 'Web', icon: '🌐' },
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'other', label: 'Other', icon: '🔧' },
  ];

  const filteredTools = tools?.filter((tool) =>
    selectedCategory === 'all' ? true : tool.category === selectedCategory
  );

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Wrench className="w-8 h-8 mr-3 text-orange-500" />
              Tool Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your AI agent tools with RPG-style tiers
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Create Tool</span>
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mt-6">
            <StatCard icon={<Wrench className="w-6 h-6 text-gray-500" />} label="Total" value={stats.total} />
            <StatCard
              icon={<Sparkles className="w-6 h-6 text-gray-400" />}
              label="Common"
              value={stats.byTier?.common || 0}
              tierColor="text-gray-600"
            />
            <StatCard
              icon={<Star className="w-6 h-6 text-blue-400" />}
              label="Rare"
              value={stats.byTier?.rare || 0}
              tierColor="text-blue-600"
            />
            <StatCard
              icon={<Award className="w-6 h-6 text-purple-400" />}
              label="Epic"
              value={stats.byTier?.epic || 0}
              tierColor="text-purple-600"
            />
            <StatCard
              icon={<Crown className="w-6 h-6 text-yellow-400" />}
              label="Legendary"
              value={stats.byTier?.legendary || 0}
              tierColor="text-yellow-600"
            />
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => {
            const Icon = typeof cat.icon === 'string' ? null : cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {Icon ? <Icon className="w-4 h-4" /> : <span>{cat.icon}</span>}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTools?.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onEdit={() => {
                setEditingTool(tool);
                setShowCreateModal(true);
              }}
              onUpdate={() => refetch()}
            />
          ))}

          {filteredTools?.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <Wrench className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No tools in this category
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                Create your first tool to get started!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Create Tool
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <ToolModal
          tool={editingTool}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTool(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingTool(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tierColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tierColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold ${tierColor || 'text-gray-900 dark:text-white'}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onEdit, onUpdate }: { tool: any; onEdit: () => void; onUpdate: () => void }) {
  const deleteMutation = trpc.tools.delete.useMutation({
    onSuccess: () => onUpdate(),
  });

  const toggleMutation = trpc.tools.toggleActive.useMutation({
    onSuccess: () => onUpdate(),
  });

  const tierConfig: Record<TierType, { icon: React.ReactNode; color: string; bg: string; glow: string }> = {
    common: {
      icon: <Sparkles className="w-5 h-5" />,
      color: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-700',
      glow: 'shadow-gray-200 dark:shadow-gray-800',
    },
    rare: {
      icon: <Star className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      glow: 'shadow-blue-200 dark:shadow-blue-900',
    },
    epic: {
      icon: <Award className="w-5 h-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      glow: 'shadow-purple-200 dark:shadow-purple-900',
    },
    legendary: {
      icon: <Crown className="w-5 h-5" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      glow: 'shadow-yellow-200 dark:shadow-yellow-900 animate-pulse',
    },
  };

  const config = tierConfig[tool.tier as TierType] || tierConfig.common;

  const handleDelete = () => {
    if (confirm(`Delete ${tool.name}?`)) {
      deleteMutation.mutate({ id: tool.id });
    }
  };

  const handleToggle = () => {
    toggleMutation.mutate({ id: tool.id });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 p-5 ${config.glow}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`${config.bg} ${config.color} p-2 rounded-lg`}>{config.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{tool.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tool.description}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Function:</span>
          <code className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {tool.functionName}()
          </code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Category:</span>
          <span className="font-semibold text-gray-900 dark:text-white capitalize">{tool.category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Unlock Level:</span>
          <span className="font-semibold text-gray-900 dark:text-white">Level {tool.unlockLevel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span
            className={`font-semibold ${
              tool.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {tool.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        {tool.userId && (
          <>
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium flex items-center justify-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleToggle}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 ${
                tool.isActive
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{tool.isActive ? 'Disable' : 'Enable'}</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        {!tool.userId && (
          <div className="flex-1 text-center py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
            System Tool
          </div>
        )}
      </div>
    </div>
  );
}

function ToolModal({ tool, onClose, onSuccess }: { tool?: any; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    category: tool?.category || 'code',
    functionName: tool?.functionName || '',
    parameters: tool?.parameters || {},
    code: tool?.code || '',
    tier: tool?.tier || 'common',
    unlockLevel: tool?.unlockLevel || 1,
  });

  const createMutation = trpc.tools.create.useMutation({
    onSuccess: () => onSuccess(),
  });

  const updateMutation = trpc.tools.update.useMutation({
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tool) {
      updateMutation.mutate({ id: tool.id, data: formData });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
          <h2 className="text-2xl font-bold">{tool ? 'Edit Tool' : 'Create New Tool'}</h2>
          <p className="text-white/80 mt-1">Design a powerful tool for your AI agents</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tool Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Web Scraper"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Function Name
              </label>
              <input
                type="text"
                value={formData.functionName}
                onChange={(e) => setFormData({ ...formData, functionName: e.target.value })}
                placeholder="e.g., scrape_website"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this tool do?"
              required
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="code">Code</option>
                <option value="data">Data</option>
                <option value="api">API</option>
                <option value="file">File</option>
                <option value="web">Web</option>
                <option value="ai">AI</option>
                <option value="system">System</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="common">⚪ Common</option>
                <option value="rare">🔵 Rare</option>
                <option value="epic">🟣 Epic</option>
                <option value="legendary">🟡 Legendary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unlock Level
              </label>
              <input
                type="number"
                value={formData.unlockLevel}
                onChange={(e) => setFormData({ ...formData, unlockLevel: parseInt(e.target.value) })}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Implementation Code
            </label>
            <textarea
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="// Function implementation"
              required
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
              spellCheck={false}
            />
          </div>

          {(createMutation.error || updateMutation.error) && (
            <p className="text-red-600 text-sm">
              {createMutation.error?.message || updateMutation.error?.message}
            </p>
          )}

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
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50"
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? 'Saving...'
                : tool
                ? 'Update Tool'
                : 'Create Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
