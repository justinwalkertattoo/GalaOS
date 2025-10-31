'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';

interface FilePreview {
  name: string;
  url: string;
  type: string;
  size: number;
}

export default function GalaPage() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; metadata?: any }>>([
    {
      role: 'assistant',
      content: "Hi! I'm Gala, your AI assistant. I can help you post to social media, update your portfolio, send emails, and more. Try saying something like:\n\n• \"Can you post these photos to Instagram?\" (with photos attached)\n• \"Update my portfolio with these images\"\n• \"Send an email campaign about my new work\"",
    },
  ]);
  const [orchestrationPlan, setOrchestrationPlan] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const galaMutation = trpc.orchestration.gala.useMutation({
    onSuccess: (data: any) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    },
  });

  const createPlanMutation = trpc.orchestration.createPlan.useMutation({
    onSuccess: (data: any) => {
      setOrchestrationPlan(data);
      const stepsText = data.steps
        .map((step: any, i: number) => {
          const icon = step.requiresHumanInput ? '⏸️' : '✓';
          return `${i + 1}. ${icon} ${step.action.replace(/_/g, ' ')}`;
        })
        .join('\n');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I've created a plan for you:\n\n${stepsText}\n\nWould you like me to proceed? Reply "yes" to start, or describe any changes you'd like.`,
          metadata: { plan: data },
        },
      ]);
    },
  });

  const executePlanMutation = trpc.orchestration.executePlan.useMutation({
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! I've started executing your workflow. Execution ID: ${data.executionId}\n\nI'll update you as each step completes.`,
        },
      ]);
      setOrchestrationPlan(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const previews: FilePreview[] = selectedFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...previews]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    const userMessage = {
      role: 'user',
      content: input || '[Files attached]',
      metadata: files.length > 0 ? { files } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    const attachedFiles = [...files];
    setFiles([]);

    // Check if user is confirming execution
    if (orchestrationPlan && messageText.toLowerCase() === 'yes') {
      executePlanMutation.mutate({
        planId: orchestrationPlan.taskId,
        plan: orchestrationPlan,
      });
      return;
    }

    // Create orchestration plan
    if (attachedFiles.length > 0) {
      createPlanMutation.mutate({
        message: messageText,
        context: {
          files: attachedFiles,
        },
      });
    } else {
      galaMutation.mutate({
        message: messageText,
      });
    }
  };

  const isLoading =
    galaMutation.isLoading || createPlanMutation.isLoading || executePlanMutation.isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ✨ Gala - AI Orchestrator
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Your intelligent assistant for managing life, work, and creativity
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-6 py-4 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.files && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.metadata.files.map((file: FilePreview, i: number) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-white/50"
                      >
                        {file.type.startsWith('image/') ? (
                          <Image
                            src={file.url}
                            alt={file.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                            <Paperclip className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <p className="text-gray-600 dark:text-gray-400">Gala is thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {/* File Previews */}
          {files.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="relative group w-24 h-24 rounded-lg overflow-hidden border-2 border-purple-500"
                >
                  {file.type.startsWith('image/') ? (
                    <Image src={file.url} alt={file.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <Paperclip className="w-6 h-6" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Ask Gala anything... Try 'post these photos' with images attached"
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
            />
            <button
              type="submit"
              disabled={(!input.trim() && files.length === 0) || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
