import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class CanvaIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'canva',
    name: 'Canva',
    description: 'Create and manage designs programmatically',
    authType: 'oauth2',
    authUrl: 'https://www.canva.com/api/oauth/authorize',
    tokenUrl: 'https://api.canva.com/rest/v1/oauth/token',
    scopes: [
      'design:content:read',
      'design:content:write',
      'design:meta:read',
      'asset:read',
      'asset:write',
      'folder:read',
      'folder:write',
    ],
    icon: '🎨',
  };

  async test(): Promise<boolean> {
    try {
      await this.getUser();
      return true;
    } catch {
      return false;
    }
  }

  async getUser(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.canva.com/rest/v1/users/me', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Canva API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async createDesign(data: {
    designType: string;
    title?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: data.designType,
        title: data.title,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Canva API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async getDesign(designId: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.canva.com/rest/v1/designs/${designId}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Canva API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async listDesigns(data?: {
    query?: string;
    continuation?: string;
    limit?: number;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams();
    if (data?.query) params.append('query', data.query);
    if (data?.continuation) params.append('continuation', data.continuation);
    if (data?.limit) params.append('limit', data.limit.toString());

    const response = await fetch(
      `https://api.canva.com/rest/v1/designs?${params}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Canva API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async exportDesign(data: {
    designId: string;
    format: 'pdf' | 'png' | 'jpg' | 'pptx' | 'gif' | 'mp4';
    pages?: number[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      format: data.format,
    };

    if (data.pages) body.pages = data.pages;

    const response = await fetch(
      `https://api.canva.com/rest/v1/designs/${data.designId}/export`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Canva API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async uploadAsset(data: {
    name: string;
    url: string;
    type?: 'image' | 'video' | 'audio';
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.canva.com/rest/v1/assets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        url: data.url,
        type: data.type || 'image',
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Canva API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async createFolder(data: { name: string; parentId?: string }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = { name: data.name };
    if (data.parentId) body.parent_folder_id = data.parentId;

    const response = await fetch('https://api.canva.com/rest/v1/folders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Canva API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }
}

// Canva Actions
export const canvaCreateDesignAction: IntegrationAction = {
  name: 'create_design',
  description: 'Create a new design in Canva',
  inputSchema: z.object({
    designType: z.string(),
    title: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.createDesign(input);
  },
};

export const canvaGetDesignAction: IntegrationAction = {
  name: 'get_design',
  description: 'Get details of a Canva design',
  inputSchema: z.object({
    designId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.getDesign(input.designId);
  },
};

export const canvaListDesignsAction: IntegrationAction = {
  name: 'list_designs',
  description: 'List all designs in Canva',
  inputSchema: z.object({
    query: z.string().optional(),
    continuation: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({
    items: z.array(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.listDesigns(input);
  },
};

export const canvaExportDesignAction: IntegrationAction = {
  name: 'export_design',
  description: 'Export a Canva design to various formats',
  inputSchema: z.object({
    designId: z.string(),
    format: z.enum(['pdf', 'png', 'jpg', 'pptx', 'gif', 'mp4']),
    pages: z.array(z.number().int()).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.exportDesign(input);
  },
};

export const canvaUploadAssetAction: IntegrationAction = {
  name: 'upload_asset',
  description: 'Upload an asset to Canva',
  inputSchema: z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.enum(['image', 'video', 'audio']).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.uploadAsset(input);
  },
};

export const canvaCreateFolderAction: IntegrationAction = {
  name: 'create_folder',
  description: 'Create a folder in Canva',
  inputSchema: z.object({
    name: z.string(),
    parentId: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new CanvaIntegration();
    integration.setCredentials(credentials);
    return await integration.createFolder(input);
  },
};
