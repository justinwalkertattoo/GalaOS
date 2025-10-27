import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(chatMessageSchema),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  stream: z.boolean().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export type AIProvider = 'anthropic' | 'openai' | 'cohere' | 'local';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: FunctionDefinition[];
  provider: AIProvider;
  model: string;
}

export interface ConversationContext {
  conversationId: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}
