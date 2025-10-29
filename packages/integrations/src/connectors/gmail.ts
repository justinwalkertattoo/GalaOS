import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class GmailIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and manage emails with Gmail',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    icon: '📧',
  };

  async test(): Promise<boolean> {
    try {
      const result = await this.getProfile();
      return !!result.emailAddress;
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async sendEmail(data: {
    to: string | string[];
    subject: string;
    body: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{ filename: string; content: string; mimeType: string }>;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // Construct email in RFC 2822 format
    const toList = Array.isArray(data.to) ? data.to.join(', ') : data.to;
    const ccList = data.cc ? (Array.isArray(data.cc) ? data.cc.join(', ') : data.cc) : '';
    const bccList = data.bcc ? (Array.isArray(data.bcc) ? data.bcc.join(', ') : data.bcc) : '';

    let email = [
      `To: ${toList}`,
      ccList ? `Cc: ${ccList}` : '',
      bccList ? `Bcc: ${bccList}` : '',
      `Subject: ${data.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      data.body,
    ]
      .filter(Boolean)
      .join('\r\n');

    // Encode to base64url
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${error}`);
    }

    return await response.json();
  }

  async listMessages(data?: {
    maxResults?: number;
    query?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams({
      maxResults: (data?.maxResults || 10).toString(),
      ...(data?.query ? { q: data.query } : {}),
    });

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getMessage(messageId: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async createDraft(data: {
    to: string | string[];
    subject: string;
    body: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const toList = Array.isArray(data.to) ? data.to.join(', ') : data.to;

    const email = [
      `To: ${toList}`,
      `Subject: ${data.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      data.body,
    ].join('\r\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: encodedEmail,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async addLabel(messageId: string, labelIds: string[]): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: labelIds,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Gmail Actions
export const gmailSendEmailAction: IntegrationAction = {
  name: 'send_email',
  description: 'Send an email via Gmail',
  inputSchema: z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string(),
    body: z.string(),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    threadId: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new GmailIntegration();
    integration.setCredentials(credentials);
    return await integration.sendEmail(input);
  },
};

export const gmailListMessagesAction: IntegrationAction = {
  name: 'list_messages',
  description: 'List Gmail messages with optional query',
  inputSchema: z.object({
    maxResults: z.number().optional(),
    query: z.string().optional(),
  }),
  outputSchema: z.object({
    messages: z.array(z.any()),
    resultSizeEstimate: z.number(),
  }),
  async execute(input, credentials) {
    const integration = new GmailIntegration();
    integration.setCredentials(credentials);
    return await integration.listMessages(input);
  },
};

export const gmailGetMessageAction: IntegrationAction = {
  name: 'get_message',
  description: 'Get a specific Gmail message by ID',
  inputSchema: z.object({
    messageId: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GmailIntegration();
    integration.setCredentials(credentials);
    return await integration.getMessage(input.messageId);
  },
};

export const gmailCreateDraftAction: IntegrationAction = {
  name: 'create_draft',
  description: 'Create an email draft in Gmail',
  inputSchema: z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    subject: z.string(),
    body: z.string(),
  }),
  outputSchema: z.object({
    id: z.string(),
    message: z.any(),
  }),
  async execute(input, credentials) {
    const integration = new GmailIntegration();
    integration.setCredentials(credentials);
    return await integration.createDraft(input);
  },
};

export const gmailAddLabelAction: IntegrationAction = {
  name: 'add_label',
  description: 'Add labels to a Gmail message',
  inputSchema: z.object({
    messageId: z.string(),
    labelIds: z.array(z.string()),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GmailIntegration();
    integration.setCredentials(credentials);
    return await integration.addLabel(input.messageId, input.labelIds);
  },
};
