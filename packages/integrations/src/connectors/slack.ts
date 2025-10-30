import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class SlackIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'slack',
    name: 'Slack',
    description: 'Team messaging and collaboration platform',
    authType: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read', 'files:write'],
    icon: '💬',
  };

  async test(): Promise<boolean> {
    try {
      const result = await this.authTest();
      return !!result.ok;
    } catch {
      return false;
    }
  }

  async authTest(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async postMessage(data: {
    channel: string;
    text: string;
    blocks?: any[];
    attachments?: any[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    if (!result.ok) {
      throw new Error(`Slack error: ${result.error}`);
    }

    return result;
  }

  async listChannels(): Promise<any[]> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    return result.channels || [];
  }

  async uploadFile(data: {
    channels: string[];
    file: Buffer | string;
    filename: string;
    title?: string;
    initialComment?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('channels', data.channels.join(','));
    const fileBlob = typeof data.file === 'string'
      ? new Blob([data.file])
      : new Blob([new Uint8Array(data.file)]);
    formData.append('file', fileBlob);
    formData.append('filename', data.filename);
    if (data.title) formData.append('title', data.title);
    if (data.initialComment) formData.append('initial_comment', data.initialComment);

    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    if (!result.ok) {
      throw new Error(`Slack error: ${result.error}`);
    }

    return result;
  }
}

// Slack Actions
export const slackPostMessageAction: IntegrationAction = {
  name: 'post_message',
  description: 'Post a message to a Slack channel',
  inputSchema: z.object({
    channel: z.string(),
    text: z.string(),
    blocks: z.array(z.any()).optional(),
    attachments: z.array(z.any()).optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    ts: z.string(),
    channel: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new SlackIntegration();
    integration.setCredentials(credentials);
    return await integration.postMessage(input);
  },
};

export const slackListChannelsAction: IntegrationAction = {
  name: 'list_channels',
  description: 'Get all Slack channels',
  inputSchema: z.object({}),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new SlackIntegration();
    integration.setCredentials(credentials);
    return await integration.listChannels();
  },
};

export const slackUploadFileAction: IntegrationAction = {
  name: 'upload_file',
  description: 'Upload a file to Slack channel(s)',
  inputSchema: z.object({
    channels: z.array(z.string()),
    file: z.any(),
    filename: z.string(),
    title: z.string().optional(),
    initialComment: z.string().optional(),
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    file: z.any(),
  }),
  async execute(input, credentials) {
    const integration = new SlackIntegration();
    integration.setCredentials(credentials);
    return await integration.uploadFile(input);
  },
};
