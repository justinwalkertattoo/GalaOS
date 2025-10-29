'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Code, Trash2, Edit, Power, Sparkles, Star, Award, Crown, ArrowRight, Zap } from 'lucide-react';

type TierType = 'common' | 'rare' | 'epic' | 'legendary';

export default function SkillsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  const { data: skillTree, refetch } = trpc.skills.tree.useQuery({});
  const { data: skillList } = trpc.skills.list.useQuery({});
  const { data: stats } = trpc.skills.stats.useQuery({});

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Code className="w-8 h-8 mr-3 text-indigo-500" />
              Skill Tree
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Build your AI agent capabilities with skill progression
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="tree">Tree View</option>
              <option value="list">List View</option>
            </select>
            <button
              onClick={() => {
                setSelectedParent(null);
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">Create Skill</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-6 gap-4 mt-6">
            <StatCard icon={<Code className="w-6 h-6 text-indigo-500" />} label="Total Skills" value={stats.total} />
            <StatCard
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              label="Total XP Cost"
              value={stats.totalXpCost}
            />
            <StatCard
              icon={<Sparkles className="w-6 h-6 text-gray-400" />}
              label="Common"
              value={stats.byTier?.common || 0}
            />
            <StatCard icon={<Star className="w-6 h-6 text-blue-400" />} label="Rare" value={stats.byTier?.rare || 0} />
            <StatCard
              icon={<Award className="w-6 h-6 text-purple-400" />}
              label="Epic"
              value={stats.byTier?.epic || 0}
            />
            <StatCard
              icon={<Crown className="w-6 h-6 text-yellow-400" />}
              label="Legendary"
              value={stats.byTier?.legendary || 0}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'tree' ? (
          <div className="space-y-6">
            {skillTree?.map((rootSkill) => (
              <SkillTreeNode
                key={rootSkill.id}
                skill={rootSkill}
                level={0}
                onEdit={(skill) => {
                  setEditingSkill(skill);
                  setShowCreateModal(true);
                }}
                onAddChild={(parentId) => {
                  setSelectedParent(parentId);
                  setShowCreateModal(true);
                }}
                onUpdate={() => refetch()}
              />
            ))}

            {skillTree?.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Code className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No skills yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  Create your first skill to start building your skill tree!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Create Root Skill
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {skillList?.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onEdit={() => {
                  setEditingSkill(skill);
                  setShowCreateModal(true);
                }}
                onUpdate={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <SkillModal
          skill={editingSkill}
          parentId={selectedParent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSkill(null);
            setSelectedParent(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingSkill(null);
            setSelectedParent(null);
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

function SkillTreeNode({
  skill,
  level,
  onEdit,
  onAddChild,
  onUpdate,
}: {
  skill: any;
  level: number;
  onEdit: (skill: any) => void;
  onAddChild: (parentId: string) => void;
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const tierConfig: Record<TierType, { icon: React.ReactNode; color: string; bg: string }> = {
    common: { icon: <Sparkles className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-100' },
    rare: { icon: <Star className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    epic: { icon: <Award className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    legendary: { icon: <Crown className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  };

  const config = tierConfig[skill.tier as TierType] || tierConfig.common;

  const deleteMutation = trpc.skills.delete.useMutation({
    onSuccess: () => onUpdate(),
  });

  const handleDelete = () => {
    if (skill.children?.length > 0) {
      alert('Cannot delete skill with children. Delete children first.');
      return;
    }
    if (confirm(`Delete ${skill.name}?`)) {
      deleteMutation.mutate({ id: skill.id });
    }
  };

  return (
    <div className="relative">
      {/* Skill Node */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-4 transition-all hover:shadow-xl`}
        style={{ marginLeft: `${level * 40}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Tier Icon */}
            <div className={`${config.bg} ${config.color} p-2 rounded-lg`}>{config.icon}</div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{skill.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{skill.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>{skill.xpCost} XP</span>
                </span>
                <span className="capitalize">{skill.tier}</span>
                <span>{skill.category}</span>
              </div>
            </div>

            {/* Children Count */}
            {skill.children?.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
              >
                {skill.children.length} {skill.children.length === 1 ? 'child' : 'children'}
              </button>
            )}
          </div>

          {/* Actions */}
          {skill.userId && (
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onAddChild(skill.id)}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                title="Add child skill"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(skill)}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && skill.children?.length > 0 && (
        <div className="mt-4 space-y-4 relative">
          {/* Connection Line */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-300 to-purple-300 dark:from-indigo-700 dark:to-purple-700"
            style={{ left: `${level * 40 + 20}px` }}
          />

          {skill.children.map((child: any) => (
            <div key={child.id} className="relative">
              {/* Horizontal Connector */}
              <div
                className="absolute top-6 w-5 h-px bg-gradient-to-r from-indigo-300 to-purple-300 dark:from-indigo-700 dark:to-purple-700"
                style={{ left: `${level * 40 + 20}px` }}
              >
                <ArrowRight className="w-4 h-4 text-indigo-500 absolute -right-2 -top-2" />
              </div>

              <SkillTreeNode
                skill={child}
                level={level + 1}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onUpdate={onUpdate}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillCard({ skill, onEdit, onUpdate }: { skill: any; onEdit: () => void; onUpdate: () => void }) {
  const deleteMutation = trpc.skills.delete.useMutation({
    onSuccess: () => onUpdate(),
  });

  const tierConfig: Record<TierType, { icon: React.ReactNode; color: string; bg: string }> = {
    common: { icon: <Sparkles className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-100' },
    rare: { icon: <Star className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    epic: { icon: <Award className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    legendary: { icon: <Crown className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  };

  const config = tierConfig[skill.tier as TierType] || tierConfig.common;

  const handleDelete = () => {
    if (confirm(`Delete ${skill.name}?`)) {
      deleteMutation.mutate({ id: skill.id });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start space-x-3 mb-3">
        <div className={`${config.bg} ${config.color} p-2 rounded-lg`}>{config.icon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{skill.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{skill.description}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">XP Cost:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{skill.xpCost}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Category:</span>
          <span className="font-semibold text-gray-900 dark:text-white capitalize">{skill.category}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Tier:</span>
          <span className={`font-semibold capitalize ${config.color}`}>{skill.tier}</span>
        </div>
      </div>

      {skill.userId && (
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SkillModal({
  skill,
  parentId,
  onClose,
  onSuccess,
}: {
  skill?: any;
  parentId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: skill?.name || '',
    description: skill?.description || '',
    category: skill?.category || 'combat',
    parentId: skill?.parentId || parentId || null,
    effects: skill?.effects || {},
    tier: skill?.tier || 'common',
    xpCost: skill?.xpCost || 100,
  });

  const createMutation = trpc.skills.create.useMutation({
    onSuccess: () => onSuccess(),
  });

  const updateMutation = trpc.skills.update.useMutation({
    onSuccess: () => onSuccess(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (skill) {
      updateMutation.mutate({ id: skill.id, data: formData as any });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <h2 className="text-2xl font-bold">{skill ? 'Edit Skill' : 'Create New Skill'}</h2>
          <p className="text-white/80 mt-1">
            {parentId ? 'Add a child skill to the tree' : 'Design a new skill for your agents'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Skill Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Advanced Code Generation"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this skill enable?"
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., coding"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="common">⚪ Common</option>
                <option value="rare">🔵 Rare</option>
                <option value="epic">🟣 Epic</option>
                <option value="legendary">🟡 Legendary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                XP Cost
              </label>
              <input
                type="number"
                value={formData.xpCost}
                onChange={(e) => setFormData({ ...formData, xpCost: parseInt(e.target.value) })}
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
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
              className="flex-1 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? 'Saving...'
                : skill
                ? 'Update Skill'
                : 'Create Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
