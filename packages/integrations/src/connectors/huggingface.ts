import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  APIKeyCredentials,
} from '../base';

export class HuggingFaceIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Access open-source models and datasets',
    authType: 'apikey',
    icon: '🤗',
  };

  private get apiKey(): string {
    const creds = this.credentials as APIKeyCredentials;
    if (!creds?.apiKey) throw new Error('Not authenticated');
    return creds.apiKey;
  }

  private get baseUrl(): string {
    return 'https://huggingface.co/api';
  }

  async test(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/whoami-v2`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Search for models on Hugging Face Hub
   */
  async searchModels(data: {
    query?: string;
    filter?: string; // task type: text-generation, text-classification, etc.
    sort?: string; // downloads, likes, updated
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams({
      search: data.query || '',
      filter: data.filter || '',
      sort: data.sort || 'downloads',
      limit: String(data.limit || 20),
    });

    const response = await fetch(`${this.baseUrl}/models?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get model details
   */
  async getModel(modelId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/models/${modelId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * List available datasets
   */
  async searchDatasets(data: {
    query?: string;
    filter?: string;
    sort?: string;
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams({
      search: data.query || '',
      filter: data.filter || '',
      sort: data.sort || 'downloads',
      limit: String(data.limit || 20),
    });

    const response = await fetch(`${this.baseUrl}/datasets?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get dataset details
   */
  async getDataset(datasetId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/datasets/${datasetId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Run inference on a model
   */
  async runInference(data: {
    modelId: string;
    inputs: any;
    parameters?: Record<string, any>;
  }): Promise<any> {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${data.modelId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: data.inputs,
          parameters: data.parameters,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face inference error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get model README
   */
  async getModelReadme(modelId: string): Promise<string> {
    const response = await fetch(
      `https://huggingface.co/${modelId}/raw/main/README.md`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Could not fetch README for ${modelId}`);
    }

    return await response.text();
  }

  /**
   * List model files
   */
  async listModelFiles(modelId: string): Promise<any[]> {
    const response = await fetch(
      `https://huggingface.co/api/models/${modelId}/tree/main`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get user info
   */
  async getUser(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/whoami-v2`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Hugging Face Actions
export const hfSearchModelsAction: IntegrationAction = {
  name: 'search_models',
  description: 'Search for models on Hugging Face Hub',
  inputSchema: z.object({
    query: z.string().optional(),
    filter: z.string().optional(),
    sort: z.enum(['downloads', 'likes', 'updated']).optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.searchModels(input);
  },
};

export const hfGetModelAction: IntegrationAction = {
  name: 'get_model',
  description: 'Get details for a specific model',
  inputSchema: z.object({
    modelId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.getModel(input.modelId);
  },
};

export const hfSearchDatasetsAction: IntegrationAction = {
  name: 'search_datasets',
  description: 'Search for datasets on Hugging Face Hub',
  inputSchema: z.object({
    query: z.string().optional(),
    filter: z.string().optional(),
    sort: z.enum(['downloads', 'likes', 'updated']).optional(),
    limit: z.number().optional(),
  }),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.searchDatasets(input);
  },
};

export const hfGetDatasetAction: IntegrationAction = {
  name: 'get_dataset',
  description: 'Get details for a specific dataset',
  inputSchema: z.object({
    datasetId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.getDataset(input.datasetId);
  },
};

export const hfRunInferenceAction: IntegrationAction = {
  name: 'run_inference',
  description: 'Run inference on a Hugging Face model',
  inputSchema: z.object({
    modelId: z.string(),
    inputs: z.any(),
    parameters: z.record(z.any()).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.runInference(input);
  },
};

export const hfGetModelReadmeAction: IntegrationAction = {
  name: 'get_model_readme',
  description: 'Get the README for a model',
  inputSchema: z.object({
    modelId: z.string(),
  }),
  outputSchema: z.string(),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.getModelReadme(input.modelId);
  },
};

export const hfListModelFilesAction: IntegrationAction = {
  name: 'list_model_files',
  description: 'List all files in a model repository',
  inputSchema: z.object({
    modelId: z.string(),
  }),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new HuggingFaceIntegration();
    integration.setCredentials(credentials);
    return await integration.listModelFiles(input.modelId);
  },
};
