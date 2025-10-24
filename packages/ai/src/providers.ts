import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIProvider, Message, AgentResponse, ToolDefinition } from './types';

export interface AIProviderClient {
  chat(messages: Message[], options?: ChatOptions): Promise<AgentResponse>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export class AnthropicProvider implements AIProviderClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<AgentResponse> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const tools = options.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.parameters),
    }));

    const response = await this.client.messages.create({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      system: systemMessages.map((m) => m.content).join('\n'),
      messages: conversationMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const toolUses = response.content.filter((c) => c.type === 'tool_use');

    return {
      content: textContent?.type === 'text' ? textContent.text : '',
      toolCalls: toolUses.map((t) =>
        t.type === 'tool_use'
          ? {
              id: t.id,
              name: t.name,
              parameters: t.input,
            }
          : null
      ).filter(Boolean) as any[],
      finishReason: response.stop_reason || undefined,
    };
  }

  private zodToJsonSchema(schema: any): any {
    // Simplified Zod to JSON Schema conversion
    // In production, use a proper library like zod-to-json-schema
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }
}

export class OpenAIProvider implements AIProviderClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<AgentResponse> {
    const tools = options.tools?.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.parameters),
      },
    }));

    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      parameters: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.message.content || '',
      toolCalls,
      finishReason: choice.finish_reason,
    };
  }

  private zodToJsonSchema(schema: any): any {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }
}

export function createProvider(provider: AIProvider, apiKey: string): AIProviderClient {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
