import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class NotionIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'notion',
    name: 'Notion',
    description: 'Manage pages, databases, and workspaces',
    authType: 'oauth2',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [], // Notion uses integration capabilities instead of scopes
    icon: '📝',
  };

  private readonly NOTION_VERSION = '2022-06-28';

  async test(): Promise<boolean> {
    try {
      await this.search({ query: '', pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async search(data: { query: string; pageSize?: number }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Notion-Version': this.NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: data.query,
        page_size: data.pageSize || 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async createPage(data: {
    parentId: string;
    title: string;
    content?: any[];
    icon?: { emoji: string } | { external: { url: string } };
    cover?: { external: { url: string } };
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      parent: { page_id: data.parentId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: data.title,
              },
            },
          ],
        },
      },
    };

    if (data.icon) body.icon = data.icon;
    if (data.cover) body.cover = data.cover;
    if (data.content) body.children = data.content;

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Notion-Version': this.NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async createDatabase(data: {
    parentId: string;
    title: string;
    properties: Record<string, any>;
    icon?: { emoji: string };
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      parent: { page_id: data.parentId },
      title: [
        {
          text: {
            content: data.title,
          },
        },
      ],
      properties: data.properties,
    };

    if (data.icon) body.icon = data.icon;

    const response = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Notion-Version': this.NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async queryDatabase(data: {
    databaseId: string;
    filter?: any;
    sorts?: any[];
    pageSize?: number;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      page_size: data.pageSize || 100,
    };

    if (data.filter) body.filter = data.filter;
    if (data.sorts) body.sorts = data.sorts;

    const response = await fetch(
      `https://api.notion.com/v1/databases/${data.databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Notion-Version': this.NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async addPageToDatabase(data: {
    databaseId: string;
    properties: Record<string, any>;
    content?: any[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      parent: { database_id: data.databaseId },
      properties: data.properties,
    };

    if (data.content) body.children = data.content;

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Notion-Version': this.NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  async appendBlockChildren(data: {
    blockId: string;
    children: any[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.notion.com/v1/blocks/${data.blockId}/children`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Notion-Version': this.NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ children: data.children }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Notion API error: ${error.message || response.statusText}`);
    }

    return await response.json();
  }
}

// Notion Actions
export const notionSearchAction: IntegrationAction = {
  name: 'search',
  description: 'Search for pages and databases in Notion',
  inputSchema: z.object({
    query: z.string(),
    pageSize: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.search(input);
  },
};

export const notionCreatePageAction: IntegrationAction = {
  name: 'create_page',
  description: 'Create a new page in Notion',
  inputSchema: z.object({
    parentId: z.string(),
    title: z.string(),
    content: z.array(z.any()).optional(),
    icon: z
      .union([
        z.object({ emoji: z.string() }),
        z.object({ external: z.object({ url: z.string() }) }),
      ])
      .optional(),
    cover: z.object({ external: z.object({ url: z.string() }) }).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.createPage(input);
  },
};

export const notionCreateDatabaseAction: IntegrationAction = {
  name: 'create_database',
  description: 'Create a new database in Notion',
  inputSchema: z.object({
    parentId: z.string(),
    title: z.string(),
    properties: z.record(z.any()),
    icon: z.object({ emoji: z.string() }).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.createDatabase(input);
  },
};

export const notionQueryDatabaseAction: IntegrationAction = {
  name: 'query_database',
  description: 'Query a Notion database',
  inputSchema: z.object({
    databaseId: z.string(),
    filter: z.any().optional(),
    sorts: z.array(z.any()).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.queryDatabase(input);
  },
};

export const notionAddPageToDatabaseAction: IntegrationAction = {
  name: 'add_page_to_database',
  description: 'Add a new page to a Notion database',
  inputSchema: z.object({
    databaseId: z.string(),
    properties: z.record(z.any()),
    content: z.array(z.any()).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.addPageToDatabase(input);
  },
};

export const notionAppendBlockChildrenAction: IntegrationAction = {
  name: 'append_block_children',
  description: 'Append content blocks to a page or block',
  inputSchema: z.object({
    blockId: z.string(),
    children: z.array(z.any()),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new NotionIntegration();
    integration.setCredentials(credentials);
    return await integration.appendBlockChildren(input);
  },
};
