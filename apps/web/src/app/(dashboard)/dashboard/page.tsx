'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { LayoutDashboard, Workflow, MessageSquare, Database, Settings, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GalaOS</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user.name || 'there'}!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            What would you like to work on today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <QuickActionCard
            icon={<Sparkles className="w-8 h-8 text-purple-600" />}
            title="✨ Gala"
            description="AI assistant with orchestration"
            onClick={() => router.push('/dashboard/gala')}
            highlight={true}
          />
          <QuickActionCard
            icon={<LayoutDashboard className="w-8 h-8" />}
            title="New Page"
            description="Create a new workspace page"
            onClick={() => router.push('/dashboard/pages/new')}
          />
          <QuickActionCard
            icon={<Workflow className="w-8 h-8" />}
            title="Workflows"
            description="Build automation workflows"
            onClick={() => router.push('/dashboard/workflows')}
          />
          <QuickActionCard
            icon={<Settings className="w-8 h-8" />}
            title="Settings"
            description="Manage API keys & integrations"
            onClick={() => router.push('/dashboard/settings')}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <p className="text-gray-500 dark:text-gray-400">No recent activity yet.</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg shadow p-6 hover:shadow-lg transition-all text-left w-full ${
        highlight
          ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
          : 'bg-white dark:bg-gray-800'
      }`}
    >
      <div className={highlight ? 'mb-3' : 'text-blue-600 dark:text-blue-400 mb-3'}>{icon}</div>
      <h3 className={`text-lg font-semibold mb-1 ${highlight ? '' : 'text-gray-900 dark:text-white'}`}>{title}</h3>
      <p className={`text-sm ${highlight ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>{description}</p>
    </button>
  );
}
