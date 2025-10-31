'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageSquare,
  Sparkles,
  Bot,
  Wrench,
  Code,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
  Terminal,
  Users,
  FolderOpen,
  Server,
} from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { icon: Sparkles, label: 'Gala AI', path: '/dashboard/gala', color: 'text-purple-500' },
    { icon: MessageSquare, label: 'Chat', path: '/dashboard/chat', color: 'text-blue-500' },
    { icon: Terminal, label: 'Code Sandbox', path: '/dashboard/sandbox', color: 'text-green-500' },
    { icon: Bot, label: 'Agents', path: '/dashboard/agents', color: 'text-cyan-500' },
    { icon: Server, label: 'Models', path: '/dashboard/models', color: 'text-indigo-500' },
    { icon: Users, label: 'Assistants', path: '/dashboard/assistants', color: 'text-pink-500' },
    { icon: Wrench, label: 'Tools', path: '/dashboard/tools', color: 'text-orange-500' },
    { icon: Code, label: 'Skills', path: '/dashboard/skills', color: 'text-indigo-500' },
    { icon: Zap, label: 'Workflows', path: '/dashboard/workflows', color: 'text-yellow-500' },
    { icon: FolderOpen, label: 'Pages', path: '/dashboard/pages', color: 'text-gray-500' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings', color: 'text-gray-400' },
    // Admin utilities
    { icon: Settings, label: 'Admin: Rate Limit', path: '/admin/rate-limit', color: 'text-gray-400' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              GalaOS
            </h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : item.color}`}
                />
                {!collapsed && (
                  <span
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* New Button */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all">
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Agent</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
