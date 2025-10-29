import axios, { AxiosInstance } from 'axios';

/**
 * Google Gemini API Provider
 * Integrates with Google's Gemini AI models
 */
export class GoogleProvider {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://generativelanguage.googleapis.com/v1beta') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 60000,
    });
  }

  /**
   * Generate content with Gemini
   */
  async generateContent(options: {
    model?: string;
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    safetySettings?: Array<{
      category: string;
      threshold: string;
    }>;
  }): Promise<any> {
    try {
      const model = options.model || 'gemini-2.0-flash-exp';
      const contents = [];

      if (options.systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: options.systemInstruction }],
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood.' }],
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: options.prompt }],
      });

      const response = await this.client.post(
        `/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.9,
            topP: options.topP ?? 1,
            topK: options.topK ?? 1,
            maxOutputTokens: options.maxOutputTokens ?? 8192,
            stopSequences: options.stopSequences,
          },
          safetySettings: options.safetySettings || [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }
      );

      return response.data;
    } catch (error) {
      console.error('Google Gemini generation failed:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Google API error: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Chat with Gemini (multi-turn conversation)
   */
  async chat(options: {
    model?: string;
    messages: Array<{
      role: 'user' | 'model';
      content: string;
    }>;
    systemInstruction?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }): Promise<any> {
    try {
      const model = options.model || 'gemini-2.0-flash-exp';
      const contents = options.messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const requestBody: any = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.9,
          topP: options.topP ?? 1,
          topK: options.topK ?? 1,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      };

      if (options.systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const response = await this.client.post(
        `/models/${model}:generateContent?key=${this.apiKey}`,
        requestBody
      );

      return response.data;
    } catch (error) {
      console.error('Google Gemini chat failed:', error);
      throw error;
    }
  }

  /**
   * Stream generate content
   */
  async streamGenerateContent(
    options: {
      model?: string;
      prompt: string;
      systemInstruction?: string;
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
    },
    onChunk: (chunk: any) => void
  ): Promise<void> {
    try {
      const model = options.model || 'gemini-2.0-flash-exp';
      const contents = [];

      if (options.systemInstruction) {
        contents.push({
          role: 'user',
          parts: [{ text: options.systemInstruction }],
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood.' }],
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: options.prompt }],
      });

      const response = await this.client.post(
        `/models/${model}:streamGenerateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.9,
            topP: options.topP ?? 1,
            topK: options.topK ?? 1,
            maxOutputTokens: options.maxOutputTokens ?? 8192,
          },
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
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
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
      console.error('Google Gemini streaming failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async embedContent(options: {
    model?: string;
    content: string;
    taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
    title?: string;
  }): Promise<number[]> {
    try {
      const model = options.model || 'text-embedding-004';
      const response = await this.client.post(
        `/models/${model}:embedContent?key=${this.apiKey}`,
        {
          content: {
            parts: [{ text: options.content }],
          },
          taskType: options.taskType,
          title: options.title,
        }
      );

      return response.data.embedding.values;
    } catch (error) {
      console.error('Google Gemini embeddings failed:', error);
      throw error;
    }
  }

  /**
   * Batch embed content
   */
  async batchEmbedContents(options: {
    model?: string;
    requests: Array<{
      content: string;
      taskType?: string;
      title?: string;
    }>;
  }): Promise<number[][]> {
    try {
      const model = options.model || 'text-embedding-004';
      const response = await this.client.post(
        `/models/${model}:batchEmbedContents?key=${this.apiKey}`,
        {
          requests: options.requests.map((req) => ({
            model: `models/${model}`,
            content: {
              parts: [{ text: req.content }],
            },
            taskType: req.taskType,
            title: req.title,
          })),
        }
      );

      return response.data.embeddings.map((emb: any) => emb.values);
    } catch (error) {
      console.error('Google Gemini batch embeddings failed:', error);
      throw error;
    }
  }

  /**
   * Count tokens
   */
  async countTokens(options: {
    model?: string;
    contents: Array<{
      role: string;
      content: string;
    }>;
  }): Promise<number> {
    try {
      const model = options.model || 'gemini-2.0-flash-exp';
      const response = await this.client.post(
        `/models/${model}:countTokens?key=${this.apiKey}`,
        {
          contents: options.contents.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
          })),
        }
      );

      return response.data.totalTokens;
    } catch (error) {
      console.error('Google Gemini token counting failed:', error);
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<any[]> {
    try {
      const response = await this.client.get(`/models?key=${this.apiKey}`);
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list Google models:', error);
      throw error;
    }
  }

  /**
   * Get model info
   */
  async getModel(modelName: string): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelName}?key=${this.apiKey}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get Google model info:', error);
      throw error;
    }
  }

  /**
   * Get available models list
   */
  getAvailableModels(): string[] {
    return [
      // Latest models
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',

      // Gemini 1.5 models
      'gemini-1.5-pro',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-8b',

      // Embedding models
      'text-embedding-004',
      'embedding-001',

      // Legacy models
      'gemini-pro',
      'gemini-pro-vision',
    ];
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listModels();
      return true;
    } catch (error) {
      console.error('Google connection test failed:', error);
      return false;
    }
  }
}
