import { HfInference } from '@huggingface/inference';
import { HuggingFaceResource, HuggingFaceResourceType } from '../types';

/**
 * HuggingFace Hub Provider
 * Integrates with HuggingFace for models, datasets, and spaces
 */
export class HuggingFaceProvider {
  private hf: HfInference;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.hf = new HfInference(apiKey);
  }

  /**
   * List models from HuggingFace Hub (via API)
   */
  async listModels(options?: {
    search?: string;
    author?: string;
    limit?: number;
  }): Promise<HuggingFaceResource[]> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.author) params.append('author', options.author);
      if (options?.limit) params.append('limit', options.limit.toString());

      const url = `https://huggingface.co/api/models?${params.toString()}`;
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json() as any[];

      return data.map((model: any) => ({
        id: model.id || model.modelId,
        name: model.id || model.modelId,
        type: 'model' as HuggingFaceResourceType,
        author: model.author,
        description: model.description,
        downloads: model.downloads,
        likes: model.likes,
        tags: model.tags || [],
        lastModified: model.lastModified,
        private: model.private || false,
      })).slice(0, options?.limit || 100);
    } catch (error) {
      console.error('Failed to list HuggingFace models:', error);
      throw error;
    }
  }

  /**
   * List datasets from HuggingFace Hub (via API)
   */
  async listDatasets(options?: {
    search?: string;
    author?: string;
    limit?: number;
  }): Promise<HuggingFaceResource[]> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.author) params.append('author', options.author);
      if (options?.limit) params.append('limit', options.limit.toString());

      const url = `https://huggingface.co/api/datasets?${params.toString()}`;
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json() as any[];

      return data.map((dataset: any) => ({
        id: dataset.id,
        name: dataset.id,
        type: 'dataset' as HuggingFaceResourceType,
        author: dataset.author,
        description: dataset.description,
        downloads: dataset.downloads,
        likes: dataset.likes,
        tags: dataset.tags || [],
        lastModified: dataset.lastModified,
        private: dataset.private || false,
      })).slice(0, options?.limit || 100);
    } catch (error) {
      console.error('Failed to list HuggingFace datasets:', error);
      throw error;
    }
  }

  /**
   * List spaces from HuggingFace Hub (via API)
   */
  async listSpaces(options?: {
    search?: string;
    author?: string;
    limit?: number;
  }): Promise<HuggingFaceResource[]> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.author) params.append('author', options.author);
      if (options?.limit) params.append('limit', options.limit.toString());

      const url = `https://huggingface.co/api/spaces?${params.toString()}`;
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json() as any[];

      return data.map((space: any) => ({
        id: space.id,
        name: space.id,
        type: 'space' as HuggingFaceResourceType,
        author: space.author,
        description: space.description,
        likes: space.likes,
        tags: space.tags || [],
        lastModified: space.lastModified,
        private: space.private || false,
      })).slice(0, options?.limit || 100);
    } catch (error) {
      console.error('Failed to list HuggingFace spaces:', error);
      throw error;
    }
  }

  /**
   * Download a model from HuggingFace Hub
   */
  async downloadModel(modelId: string): Promise<string> {
    // This would typically download the model to a local cache
    // For now, we'll return the model ID as reference
    return modelId;
  }

  /**
   * Run inference on a HuggingFace model
   */
  async textGeneration(options: {
    model: string;
    inputs: string;
    parameters?: {
      max_new_tokens?: number;
      temperature?: number;
      top_p?: number;
      do_sample?: boolean;
    };
  }): Promise<any> {
    try {
      const result = await this.hf.textGeneration({
        model: options.model,
        inputs: options.inputs,
        parameters: options.parameters,
      });

      return result;
    } catch (error) {
      console.error('HuggingFace text generation failed:', error);
      throw error;
    }
  }

  /**
   * Chat completion using HuggingFace models
   */
  async chatCompletion(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  }): Promise<any> {
    try {
      const result = await this.hf.chatCompletion({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        top_p: options.top_p,
      });

      return result;
    } catch (error) {
      console.error('HuggingFace chat completion failed:', error);
      throw error;
    }
  }

  /**
   * Text embedding using HuggingFace models
   */
  async featureExtraction(options: {
    model: string;
    inputs: string | string[];
  }): Promise<any> {
    try {
      const result = await this.hf.featureExtraction({
        model: options.model,
        inputs: options.inputs,
      });

      return result;
    } catch (error) {
      console.error('HuggingFace feature extraction failed:', error);
      throw error;
    }
  }

  /**
   * Image generation using HuggingFace models
   */
  async textToImage(options: {
    model: string;
    inputs: string;
    parameters?: {
      negative_prompt?: string;
      num_inference_steps?: number;
      guidance_scale?: number;
      width?: number;
      height?: number;
    };
  }): Promise<Blob> {
    try {
      const result = await this.hf.textToImage({
        model: options.model,
        inputs: options.inputs,
        parameters: options.parameters,
      });

      return result;
    } catch (error) {
      console.error('HuggingFace text-to-image failed:', error);
      throw error;
    }
  }

  /**
   * Search HuggingFace Hub
   */
  async search(query: string, type?: HuggingFaceResourceType, limit = 50): Promise<HuggingFaceResource[]> {
    const results: HuggingFaceResource[] = [];

    if (!type || type === 'model') {
      const models = await this.listModels({ search: query, limit });
      results.push(...models);
    }

    if (!type || type === 'dataset') {
      const datasets = await this.listDatasets({ search: query, limit });
      results.push(...datasets);
    }

    if (!type || type === 'space') {
      const spaces = await this.listSpaces({ search: query, limit });
      results.push(...spaces);
    }

    return results;
  }

  /**
   * Get model info
   */
  async getModelInfo(modelId: string): Promise<any> {
    try {
      const response = await fetch(`https://huggingface.co/api/models/${modelId}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch model info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get model info:', error);
      throw error;
    }
  }

  /**
   * Get dataset info
   */
  async getDatasetInfo(datasetId: string): Promise<any> {
    try {
      const response = await fetch(`https://huggingface.co/api/datasets/${datasetId}`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dataset info: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get dataset info:', error);
      throw error;
    }
  }
}
