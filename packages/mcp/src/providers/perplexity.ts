import axios, { AxiosInstance } from 'axios';

/**
 * Perplexity API Provider
 * Integrates with Perplexity AI for online search-enhanced responses
 */
export class PerplexityProvider {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = 'https://api.perplexity.ai') {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  /**
   * Chat completion with Perplexity
   */
  async chatCompletion(options: {
    model?: string;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stream?: boolean;
    search_domain_filter?: string[];
    return_images?: boolean;
    return_related_questions?: boolean;
    search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
    top_k?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  }): Promise<any> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || 'llama-3.1-sonar-large-128k-online',
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.9,
        max_tokens: options.max_tokens,
        stream: options.stream || false,
        search_domain_filter: options.search_domain_filter,
        return_images: options.return_images,
        return_related_questions: options.return_related_questions,
        search_recency_filter: options.search_recency_filter,
        top_k: options.top_k ?? 0,
        presence_penalty: options.presence_penalty ?? 0,
        frequency_penalty: options.frequency_penalty ?? 1,
      });

      return response.data;
    } catch (error) {
      console.error('Perplexity chat completion failed:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Perplexity API error: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Streaming chat completion
   */
  async streamChatCompletion(
    options: {
      model?: string;
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
      temperature?: number;
      top_p?: number;
      max_tokens?: number;
      search_domain_filter?: string[];
      return_images?: boolean;
      return_related_questions?: boolean;
      search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
    },
    onChunk: (chunk: any) => void
  ): Promise<void> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: options.model || 'llama-3.1-sonar-large-128k-online',
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
          top_p: options.top_p ?? 0.9,
          max_tokens: options.max_tokens,
          stream: true,
          search_domain_filter: options.search_domain_filter,
          return_images: options.return_images,
          return_related_questions: options.return_related_questions,
          search_recency_filter: options.search_recency_filter,
        },
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                onChunk(parsed);
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        });

        response.data.on('end', () => resolve());
        response.data.on('error', (error: Error) => reject(error));
      });
    } catch (error) {
      console.error('Perplexity streaming failed:', error);
      throw error;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      // Online models (with web search)
      'llama-3.1-sonar-small-128k-online',
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-huge-128k-online',

      // Chat models (without web search)
      'llama-3.1-sonar-small-128k-chat',
      'llama-3.1-sonar-large-128k-chat',

      // Reasoning models
      'llama-3.1-8b-instruct',
      'llama-3.1-70b-instruct',
    ];
  }

  /**
   * Search with online context
   */
  async search(options: {
    query: string;
    search_domain_filter?: string[];
    search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
    return_images?: boolean;
    return_related_questions?: boolean;
    max_tokens?: number;
  }): Promise<any> {
    return this.chatCompletion({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'user',
          content: options.query,
        },
      ],
      search_domain_filter: options.search_domain_filter,
      search_recency_filter: options.search_recency_filter,
      return_images: options.return_images ?? true,
      return_related_questions: options.return_related_questions ?? true,
      max_tokens: options.max_tokens,
    });
  }

  /**
   * Generate with citations
   */
  async generateWithCitations(options: {
    prompt: string;
    system?: string;
    search_domain_filter?: string[];
    search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
    max_tokens?: number;
  }): Promise<{
    content: string;
    citations: string[];
    images?: string[];
    related_questions?: string[];
  }> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

    if (options.system) {
      messages.push({
        role: 'system',
        content: options.system,
      });
    }

    messages.push({
      role: 'user',
      content: options.prompt,
    });

    const response = await this.chatCompletion({
      model: 'llama-3.1-sonar-large-128k-online',
      messages,
      search_domain_filter: options.search_domain_filter,
      search_recency_filter: options.search_recency_filter,
      return_images: true,
      return_related_questions: true,
      max_tokens: options.max_tokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      citations: response.citations || [],
      images: response.images,
      related_questions: response.related_questions,
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return true;
    } catch (error) {
      console.error('Perplexity connection test failed:', error);
      return false;
    }
  }
}
