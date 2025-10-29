'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Plus, Users, Code, Wrench, Sparkles, Zap, MessageSquare, FileCode, Globe, Database } from 'lucide-react';

export default function AssistantsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const { data: agents, refetch } = trpc.agents.list.useQuery({});
  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => refetch(),
  });

  // Pre-configured assistant templates
  const templates = [
    {
      id: 'code-assistant',
      name: 'Code Assistant',
      icon: <Code className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      description: 'Expert at writing, debugging, and explaining code across multiple languages',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an expert programming assistant. You help users write clean, efficient, and well-documented code. You can:
- Write code in multiple programming languages
- Debug and fix errors
- Explain complex code concepts
- Suggest best practices and optimizations
- Review code for improvements

Always provide clear explanations and prioritize code quality, readability, and maintainability.`,
      tools: ['code_executor', 'file_reader', 'syntax_checker'],
      skills: ['debugging', 'code_review', 'optimization'],
    },
    {
      id: 'data-analyst',
      name: 'Data Analyst',
      icon: <Database className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      description: 'Analyzes data, creates visualizations, and generates insights from datasets',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an expert data analyst. You help users analyze data, create visualizations, and extract meaningful insights. You can:
- Analyze datasets and identify patterns
- Create charts and visualizations
- Perform statistical analysis
- Generate reports and summaries
- Make data-driven recommendations

Always provide clear explanations of your analysis and actionable insights.`,
      tools: ['data_parser', 'chart_generator', 'statistical_analysis'],
      skills: ['data_visualization', 'statistical_modeling', 'reporting'],
    },
    {
      id: 'content-writer',
      name: 'Content Writer',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'from-orange-500 to-red-500',
      description: 'Creates engaging content including articles, social media posts, and marketing copy',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an expert content writer. You create engaging, well-structured content for various purposes. You can:
- Write blog articles and long-form content
- Create social media posts
- Craft marketing copy
- Edit and improve existing content
- Adapt tone and style for different audiences

Always prioritize clarity, engagement, and value for the reader.`,
      tools: ['grammar_checker', 'seo_optimizer', 'tone_analyzer'],
      skills: ['copywriting', 'seo', 'content_strategy'],
    },
    {
      id: 'web-developer',
      name: 'Web Developer',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-green-500 to-teal-500',
      description: 'Builds responsive websites and web applications with HTML, CSS, and JavaScript',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an expert web developer. You build modern, responsive websites and web applications. You can:
- Write HTML, CSS, and JavaScript
- Build responsive layouts
- Implement modern frameworks (React, Vue, etc.)
- Optimize performance
- Ensure accessibility

Always follow web standards and best practices for responsive, accessible design.`,
      tools: ['code_executor', 'css_optimizer', 'accessibility_checker'],
      skills: ['responsive_design', 'frontend_frameworks', 'web_performance'],
    },
    {
      id: 'research-assistant',
      name: 'Research Assistant',
      icon: <FileCode className="w-8 h-8" />,
      color: 'from-indigo-500 to-purple-500',
      description: 'Conducts research, summarizes information, and provides detailed explanations',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are an expert research assistant. You help users find, analyze, and synthesize information. You can:
- Conduct thorough research on topics
- Summarize complex information
- Provide detailed explanations
- Compare different perspectives
- Cite sources and verify facts

Always provide well-researched, balanced, and accurate information.`,
      tools: ['web_search', 'document_analyzer', 'citation_generator'],
      skills: ['information_synthesis', 'fact_checking', 'source_evaluation'],
    },
    {
      id: 'creative-brainstormer',
      name: 'Creative Brainstormer',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-yellow-500 to-orange-500',
      description: 'Generates creative ideas, concepts, and solutions for various projects',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: `You are a creative brainstorming partner. You help users generate innovative ideas and solutions. You can:
- Generate creative concepts
- Brainstorm solutions to problems
- Suggest unique approaches
- Combine ideas in novel ways
- Think outside the box

Always encourage creativity while considering practical constraints.`,
      tools: ['idea_generator', 'mind_mapper', 'trend_analyzer'],
      skills: ['creative_thinking', 'ideation', 'innovation'],
    },
  ];

  const handleCreateFromTemplate = (template: any) => {
    createMutation.mutate({
      name: template.name,
      description: template.description,
      provider: template.provider,
      model: template.model,
      systemPrompt: template.systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      tools: template.tools,
      skills: template.skills,
    });
    setSelectedTemplate(null);
  };

  // Filter for assistants (could be marked with a tag or have specific characteristics)
  const assistants = agents?.filter((a) =>
    templates.some((t) => a.name === t.name)
  ) || [];

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Users className="w-8 h-8 mr-3 text-pink-500" />
              AI Assistants
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Pre-configured specialized agents for common tasks
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-pink-50 dark:bg-pink-900/20 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium text-pink-700 dark:text-pink-300">
                {assistants.length} Active Assistants
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assistant Templates</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Choose a pre-configured assistant to add to your workspace
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const isActive = assistants.some((a) => a.name === template.name);

            return (
              <div
                key={template.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 overflow-hidden transition-all ${
                  isActive
                    ? 'border-green-500 dark:border-green-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-600'
                }`}
              >
                {/* Header with Gradient */}
                <div className={`bg-gradient-to-r ${template.color} p-6 text-white`}>
                  <div className="flex items-center justify-between mb-3">
                    {template.icon}
                    {isActive && (
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{template.name}</h3>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">TOOLS</p>
                      <div className="flex flex-wrap gap-1">
                        {template.tools.map((tool: string) => (
                          <span
                            key={tool}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">SKILLS</p>
                      <div className="flex flex-wrap gap-1">
                        {template.skills.map((skill: string) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {isActive ? (
                    <div className="flex items-center justify-center space-x-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                      <Zap className="w-4 h-4" />
                      <span className="font-semibold">Assistant Ready</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCreateFromTemplate(template)}
                      disabled={createMutation.isLoading}
                      className={`w-full py-3 bg-gradient-to-r ${template.color} text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2`}
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Assistant</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Assistant CTA */}
        <div className="mt-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl p-8 text-white text-center">
          <Wrench className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Need a Custom Assistant?</h3>
          <p className="text-white/90 mb-4">
            Create your own specialized assistant from scratch with custom tools and skills
          </p>
          <button
            onClick={() => (window.location.href = '/dashboard/agents')}
            className="px-6 py-3 bg-white text-pink-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Go to Agent Builder
          </button>
        </div>
      </div>
    </div>
  );
}
