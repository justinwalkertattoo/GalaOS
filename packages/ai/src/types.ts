import { z } from 'zod';

export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'docker';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  provider: AIProvider;
  model: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export interface TaskIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  suggestedWorkflow?: string;
  requiredTools: string[];
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  action: string;
  input: any;
  requiresHumanInput?: boolean;
  humanInputPrompt?: string;
}

export interface OrchestrationPlan {
  taskId: string;
  intent: TaskIntent;
  steps: WorkflowStep[];
  estimatedDuration?: number;
}
