import Link from 'next/link';
import { ArrowRight, Workflow, MessageSquare, Database, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="mb-20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">GalaOS</h1>
            <div className="space-x-4">
              <Link
                href="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Your Personal AI
            <br />
            Operating System
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Unify your apps, automate workflows, and harness AI to manage your life, business, and
            growth—all in one powerful platform.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Start Building <ArrowRight className="ml-2" />
          </Link>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <FeatureCard
            icon={<Database className="w-12 h-12 text-blue-600" />}
            title="Workspace Management"
            description="Notion-like pages, databases, and content organization"
          />
          <FeatureCard
            icon={<Workflow className="w-12 h-12 text-purple-600" />}
            title="Workflow Automation"
            description="Visual workflow builder with 200+ integrations"
          />
          <FeatureCard
            icon={<MessageSquare className="w-12 h-12 text-green-600" />}
            title="AI Chat & Agents"
            description="Conversational AI with Claude, GPT-4, and more"
          />
          <FeatureCard
            icon={<Zap className="w-12 h-12 text-yellow-600" />}
            title="Extensible Platform"
            description="Build custom plugins and integrations"
          />
        </section>

        {/* CTA */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-lg">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to transform how you work?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Join the future of personal productivity and AI orchestration.
          </p>
          <Link
            href="/register"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold inline-block"
          >
            Get Started Free
          </Link>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
