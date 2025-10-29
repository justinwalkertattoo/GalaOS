import axios, { AxiosInstance } from 'axios';
import { OllamaModel } from '../types';

/**
 * Ollama Provider
 * Enhanced integration with Ollama for local model management
 */
export class OllamaProvider {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes for model operations
    });
  }

  /**
   * List all available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      throw error;
    }
  }

  /**
   * Show model information
   */
  async showModel(name: string): Promise<any> {
    try {
      const response = await this.client.post('/api/show', {
        name,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to show Ollama model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Pull a model from Ollama library
   */
  async pullModel(name: string, onProgress?: (progress: any) => void): Promise<void> {
    try {
      const response = await this.client.post(
        '/api/pull',
        { name },
        {
          responseType: 'stream',
          timeout: 0, // No timeout for pulling
        }
      );

      // Process streaming response
      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (onProgress) {
                  onProgress(data);
                }
                if (data.status === 'success') {
                  resolve();
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete lines
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve();
        });

        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`Failed to pull Ollama model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(name: string): Promise<void> {
    try {
      await this.client.delete('/api/delete', {
        data: { name },
      });
    } catch (error) {
      console.error(`Failed to delete Ollama model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Copy a model
   */
  async copyModel(source: string, destination: string): Promise<void> {
    try {
      await this.client.post('/api/copy', {
        source,
        destination,
      });
    } catch (error) {
      console.error(`Failed to copy Ollama model ${source} to ${destination}:`, error);
      throw error;
    }
  }

  /**
   * Generate text completion
   */
  async generate(options: {
    model: string;
    prompt: string;
    system?: string;
    template?: string;
    context?: number[];
    stream?: boolean;
    raw?: boolean;
    format?: 'json';
    options?: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      num_predict?: number;
      seed?: number;
    };
  }): Promise<any> {
    try {
      const response = await this.client.post('/api/generate', {
        model: options.model,
        prompt: options.prompt,
        system: options.system,
        template: options.template,
        context: options.context,
        stream: options.stream || false,
        raw: options.raw,
        format: options.format,
        options: options.options,
      });

      return response.data;
    } catch (error) {
      console.error('Ollama generation failed:', error);
      throw error;
    }
  }

  /**
   * Chat completion
   */
  async chat(options: {
    model: string;
    messages: Array<{ role: string; content: string; images?: string[] }>;
    stream?: boolean;
    format?: 'json';
    options?: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      num_predict?: number;
      seed?: number;
    };
  }): Promise<any> {
    try {
      const response = await this.client.post('/api/chat', {
        model: options.model,
        messages: options.messages,
        stream: options.stream || false,
        format: options.format,
        options: options.options,
      });

      return response.data;
    } catch (error) {
      console.error('Ollama chat failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async embeddings(options: {
    model: string;
    prompt: string | string[];
    options?: {
      num_thread?: number;
    };
  }): Promise<number[] | number[][]> {
    try {
      const response = await this.client.post('/api/embeddings', {
        model: options.model,
        prompt: options.prompt,
        options: options.options,
      });

      return response.data.embedding;
    } catch (error) {
      console.error('Ollama embeddings failed:', error);
      throw error;
    }
  }

  /**
   * Create a custom model from Modelfile
   */
  async createModel(options: {
    name: string;
    modelfile: string;
    stream?: boolean;
  }): Promise<void> {
    try {
      const response = await this.client.post(
        '/api/create',
        {
          name: options.name,
          modelfile: options.modelfile,
          stream: options.stream || false,
        },
        {
          responseType: options.stream ? 'stream' : 'json',
          timeout: 0,
        }
      );

      if (options.stream) {
        return new Promise((resolve, reject) => {
          response.data.on('end', () => resolve());
          response.data.on('error', (error: Error) => reject(error));
        });
      }
    } catch (error) {
      console.error('Failed to create Ollama model:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Ollama version
   */
  async getVersion(): Promise<string> {
    try {
      const response = await this.client.get('/api/version');
      return response.data.version;
    } catch (error) {
      console.error('Failed to get Ollama version:', error);
      throw error;
    }
  }

  /**
   * Check if a model is available
   */
  async hasModel(name: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.some((model) => model.name === name || model.model === name);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get model size in bytes
   */
  async getModelSize(name: string): Promise<number> {
    try {
      const models = await this.listModels();
      const model = models.find((m) => m.name === name || m.model === name);
      return model?.size || 0;
    } catch (error) {
      console.error('Failed to get model size:', error);
      throw error;
    }
  }

  /**
   * Search available models in Ollama library
   */
  async searchLibrary(query: string): Promise<any[]> {
    // Note: Ollama doesn't have a built-in search API
    // This would need to query the Ollama library website or use a third-party index
    // For now, we'll return an empty array
    console.warn('Ollama library search not implemented yet');
    return [];
  }

  /**
   * Get running models (if supported by Ollama version)
   */
  async getRunningModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/ps');
      return response.data.models || [];
    } catch (error) {
      // This endpoint might not be available in all Ollama versions
      console.warn('Failed to get running models:', error);
      return [];
    }
  }
}
