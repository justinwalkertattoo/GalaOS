/**
 * Cost-Optimized Model Configuration
 *
 * Prioritizes local Ollama models for maximum cost savings
 * Reserves API calls only for tasks requiring premium quality
 */

import { ModelProviderFallback, ProviderConfig } from './model-provider-fallback';

export interface TaskType {
  name: string;
  description: string;
  recommendedModel: string;
  fallbackChain: string[];
  estimatedMonthlyCalls: number;
}

/**
 * Cost-Optimized Provider Configuration
 * Prioritizes local models, falls back to API only when necessary
 */
export class CostOptimizedModelProvider extends ModelProviderFallback {
  protected initializeProviders(): ProviderConfig[] {
    return [
      // ========================================
      // TIER 1: LOCAL MODELS (FREE) - PRIORITIZE THESE
      // ========================================

      // Code generation - Qwen 2.5 Coder (specialized for code)
      {
        name: 'local',
        priority: 1,
        type: 'local',
        model: 'qwen2.5-coder',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['code', 'programming', 'debugging'],
      },

      // General purpose - Llama 3.1 (strong general model)
      {
        name: 'local',
        priority: 2,
        type: 'local',
        model: 'llama3.1',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['general', 'chat', 'writing'],
      },

      // Code assistance - CodeLlama (alternative for code)
      {
        name: 'local',
        priority: 3,
        type: 'local',
        model: 'codellama',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['code', 'programming'],
      },

      // Reasoning tasks - DeepSeek R1 (specialized for reasoning)
      {
        name: 'local',
        priority: 4,
        type: 'local',
        model: 'deepseek-r1',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['reasoning', 'analysis', 'problem-solving'],
      },

      // Large complex tasks - GPT-OSS 20B (biggest local model)
      {
        name: 'local',
        priority: 5,
        type: 'local',
        model: 'gpt-oss:20b',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['complex', 'large-context'],
      },

      // Fast responses - Gemma 3 (lightweight and fast)
      {
        name: 'local',
        priority: 6,
        type: 'local',
        model: 'gemma3',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['fast', 'lightweight', 'chat'],
      },

      // Chinese/multilingual - Qwen 3 (multilingual support)
      {
        name: 'local',
        priority: 7,
        type: 'local',
        model: 'qwen3',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['multilingual', 'chinese'],
      },

      // Large general tasks - Mistral Small 3.1 (15GB, very capable)
      {
        name: 'local',
        priority: 8,
        type: 'local',
        model: 'mistral-small3.1',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['large', 'complex', 'general'],
      },

      // Vision/multimodal - LLaVA (images + text)
      {
        name: 'local',
        priority: 9,
        type: 'local',
        model: 'llava',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        cost: 0,
        tags: ['vision', 'image', 'multimodal'],
      },

      // ========================================
      // TIER 2: HUGGING FACE (FREE) - Secondary fallback
      // ========================================

      {
        name: 'huggingface',
        priority: 10,
        type: 'huggingface',
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        endpoint: 'https://api-inference.huggingface.co/models/',
        cost: 0,
      },

      // ========================================
      // TIER 3: PAID APIs - ONLY FOR CRITICAL TASKS
      // ========================================

      // Most cost-effective premium model
      {
        name: 'anthropic',
        priority: 11,
        type: 'api',
        model: 'claude-3-haiku-20240307',
        cost: 0.25,
        tags: ['fast', 'cheap', 'premium'],
      },

      // Affordable general purpose
      {
        name: 'openai',
        priority: 12,
        type: 'api',
        model: 'gpt-3.5-turbo',
        cost: 0.5,
        tags: ['affordable', 'general'],
      },

      // Premium quality (use sparingly!)
      {
        name: 'anthropic',
        priority: 13,
        type: 'api',
        model: 'claude-3-sonnet-20240229',
        cost: 3,
        tags: ['premium', 'quality'],
      },

      // Highest quality (emergency only!)
      {
        name: 'openai',
        priority: 14,
        type: 'api',
        model: 'gpt-4-turbo',
        cost: 10,
        tags: ['premium', 'emergency'],
      },
    ];
  }

  /**
   * Select model based on task type
   */
  async selectModelForTask(userId: string, taskType: string): Promise<ProviderConfig> {
    const taskMappings: Record<string, string[]> = {
      'code': ['qwen2.5-coder', 'codellama', 'llama3.1'],
      'chat': ['llama3.1', 'gemma3', 'mistral-small3.1'],
      'reasoning': ['deepseek-r1', 'gpt-oss:20b', 'llama3.1'],
      'complex': ['gpt-oss:20b', 'mistral-small3.1', 'llama3.1'],
      'fast': ['gemma3', 'llama3.1'],
      'vision': ['llava'],
      'multilingual': ['qwen3', 'llama3.1'],
    };

    const preferredModels = taskMappings[taskType] || ['llama3.1'];

    // Find first available local model for this task
    for (const modelName of preferredModels) {
      const provider = this.providers.find(
        (p) => p.model === modelName && p.type === 'local'
      );
      if (provider) {
        return provider;
      }
    }

    // Fall back to general recommendation
    return await this.getRecommendedProvider(userId);
  }

  /**
   * Get embeddings using local nomic-embed-text
   */
  async getEmbedding(text: string): Promise<number[]> {
    const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

    const response = await fetch(`${endpoint}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}

/**
 * Task definitions with cost optimization
 */
export const TASK_DEFINITIONS: TaskType[] = [
  {
    name: 'code_generation',
    description: 'Generate code, fix bugs, refactor',
    recommendedModel: 'qwen2.5-coder',
    fallbackChain: ['qwen2.5-coder', 'codellama', 'llama3.1', 'claude-3-haiku'],
    estimatedMonthlyCalls: 1000,
  },
  {
    name: 'general_chat',
    description: 'Conversational AI, Q&A, general assistance',
    recommendedModel: 'llama3.1',
    fallbackChain: ['llama3.1', 'gemma3', 'mistral-small3.1', 'claude-3-haiku'],
    estimatedMonthlyCalls: 2000,
  },
  {
    name: 'complex_reasoning',
    description: 'Mathematical reasoning, logic problems, analysis',
    recommendedModel: 'deepseek-r1',
    fallbackChain: ['deepseek-r1', 'gpt-oss:20b', 'llama3.1', 'claude-3-sonnet'],
    estimatedMonthlyCalls: 200,
  },
  {
    name: 'document_analysis',
    description: 'Analyze documents, summarize, extract information',
    recommendedModel: 'gpt-oss:20b',
    fallbackChain: ['gpt-oss:20b', 'mistral-small3.1', 'llama3.1', 'claude-3-haiku'],
    estimatedMonthlyCalls: 500,
  },
  {
    name: 'creative_writing',
    description: 'Write articles, stories, marketing copy',
    recommendedModel: 'mistral-small3.1',
    fallbackChain: ['mistral-small3.1', 'llama3.1', 'claude-3-sonnet'],
    estimatedMonthlyCalls: 300,
  },
  {
    name: 'quick_responses',
    description: 'Fast, simple queries requiring quick answers',
    recommendedModel: 'gemma3',
    fallbackChain: ['gemma3', 'llama3.1'],
    estimatedMonthlyCalls: 3000,
  },
  {
    name: 'image_understanding',
    description: 'Describe images, OCR, visual Q&A',
    recommendedModel: 'llava',
    fallbackChain: ['llava', 'gpt-4-turbo'], // GPT-4 Vision as fallback
    estimatedMonthlyCalls: 100,
  },
  {
    name: 'embeddings',
    description: 'Generate text embeddings for search/RAG',
    recommendedModel: 'nomic-embed-text',
    fallbackChain: ['nomic-embed-text'], // Always free
    estimatedMonthlyCalls: 5000,
  },
];

/**
 * Conservative API quotas to stay under $100-140/month
 */
export const CONSERVATIVE_QUOTAS = {
  // Daily limits (1/30th of monthly)
  daily: {
    openai: {
      dailyCostLimit: 3.5,           // ~$100/month
      dailyLimit: 50,                 // Max 50 requests/day
      dailyTokenLimit: 500000,        // 500k tokens/day
    },
    anthropic: {
      dailyCostLimit: 1.5,           // ~$40/month
      dailyLimit: 30,                 // Max 30 requests/day
      dailyTokenLimit: 300000,        // 300k tokens/day
    },
    gemini: {
      dailyCostLimit: 0.5,           // ~$15/month (backup)
      dailyLimit: 20,
      dailyTokenLimit: 200000,
    },
  },

  // Monthly limits (total budget: $100-140)
  monthly: {
    openai: {
      monthlyCostLimit: 100,         // Primary budget
      monthlyLimit: 1500,             // ~1500 calls
      monthlyTokenLimit: 15000000,    // 15M tokens
    },
    anthropic: {
      monthlyCostLimit: 40,          // Secondary budget
      monthlyLimit: 900,              // ~900 calls
      monthlyTokenLimit: 9000000,     // 9M tokens
    },
    gemini: {
      monthlyCostLimit: 15,          // Emergency backup
      monthlyLimit: 600,
      monthlyTokenLimit: 6000000,
    },
  },

  // Alert thresholds
  alertOnThreshold: 0.7, // Alert at 70% (early warning)
};

/**
 * Estimated monthly costs with this setup
 */
export const COST_ESTIMATE = {
  // If all requests used FREE local models
  bestCase: {
    local: 0,
    huggingface: 0,
    apis: 0,
    total: 0,
  },

  // If 90% local, 10% API (realistic)
  realistic: {
    local: 0,          // 6,300 calls (90%) - FREE
    huggingface: 0,    // Fallback - FREE
    apis: 15,          // 700 calls (10%) using Haiku/GPT-3.5
    total: 15,
  },

  // If 80% local, 20% API (heavy API usage)
  heavyAPI: {
    local: 0,          // 5,600 calls (80%) - FREE
    huggingface: 0,    // Fallback - FREE
    apis: 50,          // 1,400 calls (20%) using mix of APIs
    total: 50,
  },

  // Maximum (if hitting all quotas)
  maximum: {
    local: 0,
    huggingface: 0,
    apis: 140,         // All API quotas maxed
    total: 140,
  },
};

export default CostOptimizedModelProvider;
