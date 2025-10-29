import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class BufferIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'buffer',
    name: 'Buffer',
    description: 'Schedule and publish social media posts',
    authType: 'oauth2',
    authUrl: 'https://bufferapp.com/oauth2/authorize',
    tokenUrl: 'https://api.bufferapp.com/1/oauth2/token.json',
    scopes: ['publish', 'analytics'],
    icon: '📅',
  };

  async test(): Promise<boolean> {
    try {
      const result = await this.getProfiles();
      return result.length >= 0;
    } catch {
      return false;
    }
  }

  async getProfiles(): Promise<any[]> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.bufferapp.com/1/profiles.json', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Buffer API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async createPost(data: {
    profileIds: string[];
    text: string;
    media?: { photo?: string; link?: string };
    scheduledAt?: Date;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const body: any = {
      profile_ids: data.profileIds,
      text: data.text,
      shorten: true,
    };

    if (data.media?.photo) {
      body.media = { photo: data.media.photo };
    }

    if (data.scheduledAt) {
      body.scheduled_at = Math.floor(data.scheduledAt.getTime() / 1000);
    } else {
      body.now = true;
    }

    const response = await fetch('https://api.bufferapp.com/1/updates/create.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Buffer API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }
}

// Buffer Actions
export const bufferCreatePostAction: IntegrationAction = {
  name: 'create_post',
  description: 'Create and schedule a post on Buffer',
  inputSchema: z.object({
    profileIds: z.array(z.string()),
    text: z.string(),
    media: z
      .object({
        photo: z.string().optional(),
        link: z.string().optional(),
      })
      .optional(),
    scheduledAt: z.date().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    id: z.string(),
    status: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new BufferIntegration();
    integration.setCredentials(credentials);
    return await integration.createPost(input);
  },
};

export const bufferGetProfilesAction: IntegrationAction = {
  name: 'get_profiles',
  description: 'Get all connected social media profiles',
  inputSchema: z.object({}),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new BufferIntegration();
    integration.setCredentials(credentials);
    return await integration.getProfiles();
  },
};
