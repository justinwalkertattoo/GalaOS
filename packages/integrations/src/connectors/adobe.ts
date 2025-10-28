import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class AdobeIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'adobe',
    name: 'Adobe Creative Cloud',
    description: 'Access Adobe Stock, Lightroom, and Creative Cloud assets',
    authType: 'oauth2',
    authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
    tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
    scopes: [
      'openid',
      'creative_sdk',
      'AdobeID',
      'address',
      'email',
      'profile',
    ],
    icon: '🔺',
  };

  async test(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://ims-na1.adobelogin.com/ims/profile/v1', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Adobe API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Adobe Stock API
  async searchStockAssets(data: {
    query: string;
    limit?: number;
    offset?: number;
    filters?: {
      contentType?: 'photo' | 'illustration' | 'vector' | 'video' | 'template';
      orientation?: 'horizontal' | 'vertical' | 'square';
      color?: string;
    };
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams({
      'search_parameters[words]': data.query,
      'search_parameters[limit]': (data.limit || 32).toString(),
      'search_parameters[offset]': (data.offset || 0).toString(),
    });

    if (data.filters?.contentType) {
      params.append(
        'search_parameters[filters][content_type:photo]',
        data.filters.contentType === 'photo' ? '1' : '0'
      );
    }

    const response = await fetch(
      `https://stock.adobe.io/Rest/Media/1/Search/Files?${params}`,
      {
        headers: {
          'X-Product': 'GalaOS/1.0',
          'X-API-Key': process.env.ADOBE_API_KEY || '',
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Adobe Stock API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async licenseStockAsset(data: {
    contentId: string;
    licenseState?: 'STANDARD' | 'EXTENDED';
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://stock.adobe.io/Rest/Libraries/1/Content/License`,
      {
        method: 'POST',
        headers: {
          'X-Product': 'GalaOS/1.0',
          'X-API-Key': process.env.ADOBE_API_KEY || '',
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: data.contentId,
          license_state: data.licenseState || 'STANDARD',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Adobe Stock API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  // Adobe Creative Cloud Libraries
  async listLibraries(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      'https://cc-libraries.adobe.io/api/v1/libraries',
      {
        headers: {
          'X-API-Key': process.env.ADOBE_API_KEY || '',
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Adobe Libraries API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getLibraryElements(libraryId: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://cc-libraries.adobe.io/api/v1/libraries/${libraryId}/elements`,
      {
        headers: {
          'X-API-Key': process.env.ADOBE_API_KEY || '',
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Adobe Libraries API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async createLibraryElement(data: {
    libraryId: string;
    name: string;
    type: 'image' | 'color' | 'characterstyle' | 'layerstyle';
    representation: any;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://cc-libraries.adobe.io/api/v1/libraries/${data.libraryId}/elements`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.ADOBE_API_KEY || '',
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          client: {
            deviceId: 'galaos',
          },
          representations: [data.representation],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Adobe Libraries API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }
}

// Adobe Actions
export const adobeSearchStockAction: IntegrationAction = {
  name: 'search_stock',
  description: 'Search Adobe Stock for images, videos, and templates',
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    filters: z
      .object({
        contentType: z.enum(['photo', 'illustration', 'vector', 'video', 'template']).optional(),
        orientation: z.enum(['horizontal', 'vertical', 'square']).optional(),
        color: z.string().optional(),
      })
      .optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new AdobeIntegration();
    integration.setCredentials(credentials);
    return await integration.searchStockAssets(input);
  },
};

export const adobeLicenseStockAction: IntegrationAction = {
  name: 'license_stock',
  description: 'License an Adobe Stock asset',
  inputSchema: z.object({
    contentId: z.string(),
    licenseState: z.enum(['STANDARD', 'EXTENDED']).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new AdobeIntegration();
    integration.setCredentials(credentials);
    return await integration.licenseStockAsset(input);
  },
};

export const adobeListLibrariesAction: IntegrationAction = {
  name: 'list_libraries',
  description: 'List all Creative Cloud libraries',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new AdobeIntegration();
    integration.setCredentials(credentials);
    return await integration.listLibraries();
  },
};

export const adobeGetLibraryElementsAction: IntegrationAction = {
  name: 'get_library_elements',
  description: 'Get elements from a Creative Cloud library',
  inputSchema: z.object({
    libraryId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new AdobeIntegration();
    integration.setCredentials(credentials);
    return await integration.getLibraryElements(input.libraryId);
  },
};

export const adobeCreateLibraryElementAction: IntegrationAction = {
  name: 'create_library_element',
  description: 'Create a new element in a Creative Cloud library',
  inputSchema: z.object({
    libraryId: z.string(),
    name: z.string(),
    type: z.enum(['image', 'color', 'characterstyle', 'layerstyle']),
    representation: z.any(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new AdobeIntegration();
    integration.setCredentials(credentials);
    return await integration.createLibraryElement(input);
  },
};
