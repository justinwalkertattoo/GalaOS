'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Play,
  Square,
  Terminal as TerminalIcon,
  FileCode,
  Trash2,
  Loader2,
  Code,
  Layout,
  Monitor,
} from 'lucide-react';

export default function SandboxPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSandbox, setSelectedSandbox] = useState<string | null>(null);

  const { data: sandboxes, refetch } = trpc.sandbox.list.useQuery();
  const { data: stats } = trpc.sandbox.stats.useQuery();

  const activeSandbox = sandboxes?.find((s) => s.id === selectedSandbox);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <TerminalIcon className="w-7 h-7 mr-3 text-green-500" />
              Code Sandbox
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Interactive coding environment with Docker
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {stats && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">{stats.running} Running</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stats.total} Total</div>
              </div>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold">New Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Sandbox List */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-3">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Your Sandboxes
            </h2>
            <div className="space-y-2">
              {sandboxes?.map((sandbox) => (
                <button
                  key={sandbox.id}
                  onClick={() => setSelectedSandbox(sandbox.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedSandbox === sandbox.id
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {sandbox.name}
                      </span>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        sandbox.status === 'running' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {sandbox.language}
                  </div>
                </button>
              ))}

              {sandboxes?.length === 0 && (
                <div className="text-center py-8">
                  <Code className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sandboxes yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        {selectedSandbox && activeSandbox ? (
          <SandboxEditor sandbox={activeSandbox} onUpdate={() => refetch()} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Layout className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No Sandbox Selected
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                Select a sandbox from the sidebar or create a new one
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create New Sandbox
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSandboxModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => {
            setShowCreateModal(false);
            setSelectedSandbox(id);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function SandboxEditor({ sandbox, onUpdate }: { sandbox: any; onUpdate: () => void }) {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [view, setView] = useState<'split' | 'code' | 'output'>('split');

  const executeMutation = trpc.sandbox.execute.useMutation();
  const startMutation = trpc.sandbox.start.useMutation();
  const stopMutation = trpc.sandbox.stop.useMutation();
  const deleteMutation = trpc.sandbox.delete.useMutation();

  const handleExecute = async () => {
    if (!code.trim()) return;

    setIsExecuting(true);
    setOutput('Executing...\n');

    try {
      const result = await executeMutation.mutateAsync({
        sandboxId: sandbox.id,
        code,
        language: sandbox.language,
      });

      setOutput(result.output || 'No output');
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStart = async () => {
    await startMutation.mutateAsync({ id: sandbox.id });
    onUpdate();
  };

  const handleStop = async () => {
    await stopMutation.mutateAsync({ id: sandbox.id });
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${sandbox.name}? This will remove the Docker container.`)) {
      await deleteMutation.mutateAsync({ id: sandbox.id });
      onUpdate();
    }
  };

  // Sample code templates
  useEffect(() => {
    const templates: Record<string, string> = {
      javascript: `console.log('Hello from GalaOS Sandbox!');\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('World'));`,
      typescript: `console.log('Hello from GalaOS Sandbox!');\n\ninterface Person {\n  name: string;\n}\n\nfunction greet(person: Person): string {\n  return \`Hello, \${person.name}!\`;\n}\n\nconsole.log(greet({ name: 'World' }));`,
      python: `print('Hello from GalaOS Sandbox!')\n\ndef greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('World'))`,
      bash: `#!/bin/bash\necho "Hello from GalaOS Sandbox!"\necho "Current directory: $(pwd)"\necho "Files: $(ls -la)"`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from GalaOS Sandbox!")\n}`,
      rust: `fn main() {\n    println!("Hello from GalaOS Sandbox!");\n}`,
    };

    if (!code) {
      setCode(templates[sandbox.language] || '// Start coding...');
    }
  }, [sandbox.language]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExecute}
            disabled={isExecuting || sandbox.status !== 'running'}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>

          {sandbox.status === 'running' ? (
            <button
              onClick={handleStop}
              className="flex items-center space-x-2 px-4 py-2 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center space-x-2 px-4 py-2 border border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
          )}

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">View:</span>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="split">Split</option>
              <option value="code">Code Only</option>
              <option value="output">Output Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {sandbox.language}
          </span>
          <div
            className={`px-2 py-1 text-xs rounded-full ${
              sandbox.status === 'running'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {sandbox.status}
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor and Output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        {(view === 'split' || view === 'code') && (
          <div className={`${view === 'split' ? 'flex-1' : 'w-full'} flex flex-col`}>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              Editor
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none focus:outline-none"
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Output Terminal */}
        {(view === 'split' || view === 'output') && (
          <div
            className={`${
              view === 'split' ? 'flex-1 border-l border-gray-200 dark:border-gray-700' : 'w-full'
            } flex flex-col`}
          >
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span>Output</span>
              <Monitor className="w-4 h-4" />
            </div>
            <div className="flex-1 p-4 bg-black text-green-400 font-mono text-sm overflow-auto whitespace-pre-wrap">
              {output || '> Ready to execute code...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateSandboxModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    language: 'javascript' as const,
  });

  const createMutation = trpc.sandbox.create.useMutation({
    onSuccess: (data) => onCreated(data.id),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const languages = [
    { value: 'javascript', label: 'JavaScript (Node.js)', icon: '📜' },
    { value: 'typescript', label: 'TypeScript', icon: '💙' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'bash', label: 'Bash/Shell', icon: '🐚' },
    { value: 'go', label: 'Go', icon: '🔷' },
    { value: 'rust', label: 'Rust', icon: '🦀' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Create New Sandbox</h2>
          <p className="text-white/80 mt-1">Choose your coding environment</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sandbox Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., My Node.js Project"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language / Runtime
            </label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, language: lang.value as any })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.language === lang.value
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{lang.icon}</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {lang.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {createMutation.error && (
            <p className="text-red-600 text-sm">{createMutation.error.message}</p>
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
              disabled={createMutation.isLoading}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Sandbox'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
