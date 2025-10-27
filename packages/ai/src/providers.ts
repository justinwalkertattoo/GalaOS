import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIProvider, Message, AgentResponse, ToolDefinition } from './types';
import axios from 'axios';

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

export class OllamaProvider implements AIProviderClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'llama2') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<AgentResponse> {
    try {
      // Ollama uses OpenAI-compatible API format
      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
        model: options.model || this.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: false,
      });

      const choice = response.data.choices[0];

      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments),
        })),
        finishReason: choice.finish_reason,
      };
    } catch (error: any) {
      console.error('Ollama error:', error.message);
      throw new Error(`Ollama API error: ${error.message}`);
    }
  }

  // List available models from Ollama
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((m: any) => m.name);
    } catch (error: any) {
      console.error('Failed to list Ollama models:', error.message);
      return [];
    }
  }

  // Pull a new model
  async pullModel(modelName: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
        stream: false,
      });
    } catch (error: any) {
      throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
    }
  }

  // Check if Ollama is running
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch {
      return false;
    }
  }
}

export class DockerModelProvider implements AIProviderClient {
  private containerName: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(containerName: string, baseUrl: string = 'http://localhost:8000', defaultModel: string = 'custom-model') {
    this.containerName = containerName;
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<AgentResponse> {
    try {
      // Assumes Docker container exposes OpenAI-compatible API
      const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
        model: options.model || this.defaultModel,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: false,
      }, {
        timeout: 60000, // 60 second timeout for Docker models
      });

      const choice = response.data.choices[0];

      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments),
        })),
        finishReason: choice.finish_reason,
      };
    } catch (error: any) {
      console.error('Docker model error:', error.message);
      throw new Error(`Docker model API error: ${error.message}`);
    }
  }

  // Check container status
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // Get container info
  getContainerInfo() {
    return {
      name: this.containerName,
      baseUrl: this.baseUrl,
      model: this.defaultModel,
    };
  }
}

export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  containerName?: string;
}

export function createProvider(config: ProviderConfig): AIProviderClient {
  switch (config.provider) {
    case 'anthropic':
      if (!config.apiKey) throw new Error('Anthropic API key required');
      return new AnthropicProvider(config.apiKey);
    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI API key required');
      return new OpenAIProvider(config.apiKey);
    case 'ollama':
      return new OllamaProvider(config.baseUrl, config.model);
    case 'docker':
      if (!config.containerName) throw new Error('Docker container name required');
      return new DockerModelProvider(config.containerName, config.baseUrl, config.model);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
