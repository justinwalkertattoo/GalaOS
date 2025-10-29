/**
 * Model Provider Fallback System
 *
 * Automatically falls back to open-source models when API quotas are exceeded
 * Prioritizes cost-efficient alternatives while maintaining functionality
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ApiUsageTracker } from '@galaos/core/src/api-usage-tracker';

export interface ModelRequest {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  fallbackUsed?: boolean;
}

export interface ProviderConfig {
  name: string;
  priority: number; // Lower = higher priority
  type: 'api' | 'local' | 'huggingface';
  model: string;
  endpoint?: string;
  apiKey?: string;
  cost: number; // Cost per 1M tokens (0 for free models)
}

export class ModelProviderFallback {
  private usageTracker: ApiUsageTracker;
  private providers: ProviderConfig[];

  constructor(usageTracker?: ApiUsageTracker) {
    this.usageTracker = usageTracker || new ApiUsageTracker();
    this.providers = this.initializeProviders();
  }

  /**
   * Initialize provider configurations in priority order
   */
  private initializeProviders(): ProviderConfig[] {
    return [
      // Tier 1: Premium API models (highest quality, highest cost)
      {
        name: 'anthropic',
        priority: 1,
        type: 'api',
        model: 'claude-3-sonnet-20240229',
        cost: 3,
      },
      {
        name: 'openai',
        priority: 2,
        type: 'api',
        model: 'gpt-4-turbo',
        cost: 10,
      },

      // Tier 2: Mid-tier API models (good quality, moderate cost)
      {
        name: 'anthropic',
        priority: 3,
        type: 'api',
        model: 'claude-3-haiku-20240307',
        cost: 0.25,
      },
      {
        name: 'openai',
        priority: 4,
        type: 'api',
        model: 'gpt-3.5-turbo',
        cost: 0.5,
      },
      {
        name: 'gemini',
        priority: 5,
        type: 'api',
        model: 'gemini-pro',
        cost: 0.5,
      },

      // Tier 3: Free Hugging Face models (good quality, no cost)
      {
        name: 'huggingface',
        priority: 6,
        type: 'huggingface',
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        endpoint: 'https://api-inference.huggingface.co/models/',
        cost: 0,
      },
      {
        name: 'huggingface',
        priority: 7,
        type: 'huggingface',
        model: 'meta-llama/Llama-2-7b-chat-hf',
        endpoint: 'https://api-inference.huggingface.co/models/',
        cost: 0,
      },
      {
        name: 'huggingface',
        priority: 8,
        type: 'huggingface',
        model: 'google/flan-t5-xxl',
        endpoint: 'https://api-inference.huggingface.co/models/',
        cost: 0,
      },

      // Tier 4: Local models (for ultimate cost control)
      {
        name: 'local',
        priority: 9,
        type: 'local',
        model: 'ollama/llama2',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
      },
    ];
  }

  /**
   * Complete a chat request with automatic fallback
   */
  async complete(userId: string, request: ModelRequest): Promise<ModelResponse> {
    const errors: Array<{ provider: string; error: string }> = [];

    // Try each provider in priority order
    for (const provider of this.providers) {
      try {
        // Check quota for API providers
        if (provider.type === 'api') {
          const quotaCheck = await this.usageTracker.checkQuota(userId, provider.name);

          if (!quotaCheck.allowed) {
            console.log(`⚠️  ${provider.name} quota exceeded: ${quotaCheck.reason}`);
            errors.push({ provider: provider.name, error: quotaCheck.reason || 'Quota exceeded' });
            continue; // Try next provider
          }
        }

        // Attempt to complete with this provider
        const response = await this.completeWithProvider(provider, request);

        // Track usage for API providers
        if (provider.type === 'api' && response.usage) {
          await this.usageTracker.trackUsage(userId, {
            provider: provider.name,
            model: provider.model,
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
            totalTokens: response.usage.totalTokens,
          });
        }

        // Mark if we used a fallback
        response.fallbackUsed = provider.priority > 1;

        return response;
      } catch (error: any) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        errors.push({ provider: provider.name, error: error.message });
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(
      `All model providers failed:\n${errors.map((e) => `- ${e.provider}: ${e.error}`).join('\n')}`
    );
  }

  /**
   * Complete request with a specific provider
   */
  private async completeWithProvider(
    provider: ProviderConfig,
    request: ModelRequest
  ): Promise<ModelResponse> {
    switch (provider.type) {
      case 'api':
        return await this.completeWithAPI(provider, request);
      case 'huggingface':
        return await this.completeWithHuggingFace(provider, request);
      case 'local':
        return await this.completeWithLocal(provider, request);
      default:
        throw new Error(`Unknown provider type: ${provider.type}`);
    }
  }

  /**
   * Complete with API provider (OpenAI, Anthropic, etc.)
   */
  private async completeWithAPI(
    provider: ProviderConfig,
    request: ModelRequest
  ): Promise<ModelResponse> {
    if (provider.name === 'anthropic') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: provider.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        messages: request.messages as any,
      });

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        model: provider.model,
        provider: provider.name,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } else if (provider.name === 'openai') {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.chat.completions.create({
        model: provider.model,
        messages: request.messages as any,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 4096,
      });

      return {
        content: response.choices[0].message.content || '',
        model: provider.model,
        provider: provider.name,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    }

    throw new Error(`Unsupported API provider: ${provider.name}`);
  }

  /**
   * Complete with Hugging Face Inference API
   */
  private async completeWithHuggingFace(
    provider: ProviderConfig,
    request: ModelRequest
  ): Promise<ModelResponse> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY not configured');
    }

    // Convert messages to prompt
    const prompt = request.messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const response = await fetch(`${provider.endpoint}${provider.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: request.temperature || 0.7,
          max_new_tokens: request.maxTokens || 1024,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = Array.isArray(data) ? data[0].generated_text : data.generated_text;

    return {
      content,
      model: provider.model,
      provider: 'huggingface',
      cost: 0,
    };
  }

  /**
   * Complete with local Ollama model
   */
  private async completeWithLocal(
    provider: ProviderConfig,
    request: ModelRequest
  ): Promise<ModelResponse> {
    const response = await fetch(`${provider.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model.replace('ollama/', ''),
        messages: request.messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.message.content,
      model: provider.model,
      provider: 'local',
      cost: 0,
    };
  }

  /**
   * Get recommended provider based on quota and cost
   */
  async getRecommendedProvider(userId: string): Promise<ProviderConfig> {
    for (const provider of this.providers) {
      if (provider.type === 'api') {
        const quotaCheck = await this.usageTracker.checkQuota(userId, provider.name);
        if (quotaCheck.allowed) {
          return provider;
        }
      } else {
        // Local/HuggingFace always available
        return provider;
      }
    }

    // Return free tier as last resort
    return this.providers[this.providers.length - 1];
  }

  /**
   * Get estimated cost for a request
   */
  async estimateCost(provider: string, estimatedTokens: number): Promise<number> {
    const config = this.providers.find((p) => p.name === provider);
    if (!config) return 0;

    return (estimatedTokens / 1_000_000) * config.cost;
  }
}

export default ModelProviderFallback;
