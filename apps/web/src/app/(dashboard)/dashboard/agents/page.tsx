'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Sparkles, Zap, Trophy, Star, TrendingUp } from 'lucide-react';

export default function AgentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: agents, refetch } = trpc.agents.list.useQuery({});
  const { data: stats } = trpc.agents.stats.useQuery();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Bot className="w-8 h-8 mr-3 text-purple-500" />
              AI Agents
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage your AI agents
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Create Agent</span>
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <StatCard
              icon={<Bot className="w-6 h-6 text-purple-500" />}
              label="Total Agents"
              value={stats.total}
            />
            <StatCard
              icon={<Star className="w-6 h-6 text-yellow-500" />}
              label="Total XP"
              value={stats.totalXP.toLocaleString()}
            />
            <StatCard
              icon={<Trophy className="w-6 h-6 text-orange-500" />}
              label="Max Level"
              value={stats.maxLevel}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-green-500" />}
              label="Total Uses"
              value={stats.totalUsage}
            />
          </div>
        )}
      </div>

      {/* Agents Grid */}
      <div className="p-6">
        {agents?.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No agents yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              Create your first AI agent to get started!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents?.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onUpdate={() => refetch()} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAgentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refetch();
          }}
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

function AgentCard({ agent, onUpdate }: { agent: any; onUpdate: () => void }) {
  const xpForNextLevel = (agent.level + 1) * 1000;
  const xpProgress = (agent.xp % 1000) / 1000;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with level */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{agent.name}</h3>
          <div className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">Lv {agent.level}</span>
          </div>
        </div>
        <p className="text-sm text-white/80 mt-1">{agent.provider} • {agent.model}</p>
      </div>

      {/* XP Bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>XP: {agent.xp}</span>
          <span>Next: {xpForNextLevel}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${xpProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {agent.usageCount} uses
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">
              {agent.badges.length} badges
            </span>
          </div>
        </div>

        {agent.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Badges */}
        {agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.badges.slice(0, 3).map((badge: string, i: number) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
              >
                {badge}
              </span>
            ))}
            {agent.badges.length > 3 && (
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                +{agent.badges.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex space-x-2">
        <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
          Chat
        </button>
        <button className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
          Edit
        </button>
      </div>
    </div>
  );
}

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
  });

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => onCreated(),
  });

  const handleSubmit = () => {
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Create New Agent</h2>
          <p className="text-white/80 mt-1">Build your custom AI assistant</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center space-x-2 p-4 border-b border-gray-200 dark:border-gray-700">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s <= step ? 'bg-purple-500 w-16' : 'bg-gray-300 dark:bg-gray-600 w-8'
              }`}
            />
          ))}
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Code Wizard, Content Creator"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this agent do?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT-4)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="docker">Docker Model</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  System Prompt
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature: {formData.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <div className="space-x-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!formData.name}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Creating...' : 'Create Agent'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bot({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
