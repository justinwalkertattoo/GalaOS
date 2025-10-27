import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class SquarespaceIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'squarespace',
    name: 'Squarespace',
    description: 'Manage websites, products, and orders',
    authType: 'oauth2',
    authUrl: 'https://login.squarespace.com/api/1/login/oauth/provider/authorize',
    tokenUrl: 'https://login.squarespace.com/api/1/login/oauth/provider/tokens',
    scopes: [
      'website.inventory',
      'website.orders',
      'website.products',
      'website.commerce',
    ],
    icon: '⬛',
  };

  async test(): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      return !!profile;
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.squarespace.com/1.0/profiles/me', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async listProducts(data?: {
    cursor?: string;
    limit?: number;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams();
    if (data?.cursor) params.append('cursor', data.cursor);
    if (data?.limit) params.append('limit', data.limit.toString());

    const response = await fetch(
      `https://api.squarespace.com/1.0/commerce/products?${params}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getProduct(productId: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.squarespace.com/1.0/commerce/products/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async listOrders(data?: {
    cursor?: string;
    limit?: number;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams();
    if (data?.cursor) params.append('cursor', data.cursor);
    if (data?.limit) params.append('limit', data.limit.toString());
    if (data?.modifiedAfter)
      params.append('modifiedAfter', data.modifiedAfter.toISOString());
    if (data?.modifiedBefore)
      params.append('modifiedBefore', data.modifiedBefore.toISOString());

    const response = await fetch(
      `https://api.squarespace.com/1.0/commerce/orders?${params}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async updateInventory(data: {
    productId: string;
    variantId: string;
    quantity: number;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.squarespace.com/1.0/commerce/inventory/${data.variantId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: data.quantity,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Squarespace Actions
export const squarespaceListProductsAction: IntegrationAction = {
  name: 'list_products',
  description: 'List all products in your Squarespace store',
  inputSchema: z.object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({
    products: z.array(z.any()),
    pagination: z.any(),
  }),
  async execute(input, credentials) {
    const integration = new SquarespaceIntegration();
    integration.setCredentials(credentials);
    return await integration.listProducts(input);
  },
};

export const squarespaceGetProductAction: IntegrationAction = {
  name: 'get_product',
  description: 'Get details of a specific product',
  inputSchema: z.object({
    productId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new SquarespaceIntegration();
    integration.setCredentials(credentials);
    return await integration.getProduct(input.productId);
  },
};

export const squarespaceListOrdersAction: IntegrationAction = {
  name: 'list_orders',
  description: 'List orders from your Squarespace store',
  inputSchema: z.object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    modifiedAfter: z.date().optional(),
    modifiedBefore: z.date().optional(),
  }),
  outputSchema: z.object({
    orders: z.array(z.any()),
    pagination: z.any(),
  }),
  async execute(input, credentials) {
    const integration = new SquarespaceIntegration();
    integration.setCredentials(credentials);
    return await integration.listOrders(input);
  },
};

export const squarespaceUpdateInventoryAction: IntegrationAction = {
  name: 'update_inventory',
  description: 'Update inventory quantity for a product variant',
  inputSchema: z.object({
    productId: z.string(),
    variantId: z.string(),
    quantity: z.number().int().min(0),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new SquarespaceIntegration();
    integration.setCredentials(credentials);
    return await integration.updateInventory(input);
  },
};
