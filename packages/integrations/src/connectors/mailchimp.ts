import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class MailchimpIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing automation and audience management',
    authType: 'oauth2',
    authUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    scopes: [], // Mailchimp doesn't use scopes, access is based on account
    icon: '📬',
  };

  private apiEndpoint?: string;

  async test(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch {
      return false;
    }
  }

  private async getApiEndpoint(): Promise<string> {
    if (this.apiEndpoint) return this.apiEndpoint;

    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // Get metadata to find API endpoint
    const response = await fetch('https://login.mailchimp.com/oauth2/metadata', {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.statusText}`);
    }

    const metadata = await response.json() as any;
    this.apiEndpoint = metadata.api_endpoint;
    return this.apiEndpoint!;
  }

  async getAccount(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();
    const response = await fetch(`${endpoint}/3.0/`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async listAudiences(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();
    const response = await fetch(`${endpoint}/3.0/lists`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async addSubscriber(data: {
    audienceId: string;
    email: string;
    status: 'subscribed' | 'pending' | 'unsubscribed';
    firstName?: string;
    lastName?: string;
    tags?: string[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();

    const body: any = {
      email_address: data.email,
      status: data.status,
    };

    if (data.firstName || data.lastName) {
      body.merge_fields = {};
      if (data.firstName) body.merge_fields.FNAME = data.firstName;
      if (data.lastName) body.merge_fields.LNAME = data.lastName;
    }

    if (data.tags && data.tags.length > 0) {
      body.tags = data.tags;
    }

    const response = await fetch(
      `${endpoint}/3.0/lists/${data.audienceId}/members`,
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
      throw new Error(`Mailchimp API error: ${error.detail || response.statusText}`);
    }

    return await response.json();
  }

  async createCampaign(data: {
    type: 'regular' | 'plaintext' | 'rss' | 'variate';
    audienceId: string;
    subject: string;
    fromName: string;
    replyTo: string;
    title?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();

    const body = {
      type: data.type,
      recipients: {
        list_id: data.audienceId,
      },
      settings: {
        subject_line: data.subject,
        from_name: data.fromName,
        reply_to: data.replyTo,
        title: data.title || data.subject,
      },
    };

    const response = await fetch(`${endpoint}/3.0/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Mailchimp API error: ${error.detail || response.statusText}`);
    }

    return await response.json();
  }

  async setCampaignContent(data: {
    campaignId: string;
    html?: string;
    plainText?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();

    const body: any = {};
    if (data.html) body.html = data.html;
    if (data.plainText) body.plain_text = data.plainText;

    const response = await fetch(
      `${endpoint}/3.0/campaigns/${data.campaignId}/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Mailchimp API error: ${error.detail || response.statusText}`);
    }

    return await response.json();
  }

  async sendCampaign(campaignId: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const endpoint = await this.getApiEndpoint();

    const response = await fetch(
      `${endpoint}/3.0/campaigns/${campaignId}/actions/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Mailchimp API error: ${error.detail || response.statusText}`);
    }

    return { success: true };
  }
}

// Mailchimp Actions
export const mailchimpListAudiencesAction: IntegrationAction = {
  name: 'list_audiences',
  description: 'List all audience lists in Mailchimp',
  inputSchema: z.object({}),
  outputSchema: z.object({
    lists: z.array(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new MailchimpIntegration();
    integration.setCredentials(credentials);
    return await integration.listAudiences();
  },
};

export const mailchimpAddSubscriberAction: IntegrationAction = {
  name: 'add_subscriber',
  description: 'Add a new subscriber to an audience',
  inputSchema: z.object({
    audienceId: z.string(),
    email: z.string().email(),
    status: z.enum(['subscribed', 'pending', 'unsubscribed']),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new MailchimpIntegration();
    integration.setCredentials(credentials);
    return await integration.addSubscriber(input);
  },
};

export const mailchimpCreateCampaignAction: IntegrationAction = {
  name: 'create_campaign',
  description: 'Create a new email campaign',
  inputSchema: z.object({
    type: z.enum(['regular', 'plaintext', 'rss', 'variate']),
    audienceId: z.string(),
    subject: z.string(),
    fromName: z.string(),
    replyTo: z.string().email(),
    title: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new MailchimpIntegration();
    integration.setCredentials(credentials);
    return await integration.createCampaign(input);
  },
};

export const mailchimpSetCampaignContentAction: IntegrationAction = {
  name: 'set_campaign_content',
  description: 'Set the content for a campaign',
  inputSchema: z.object({
    campaignId: z.string(),
    html: z.string().optional(),
    plainText: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new MailchimpIntegration();
    integration.setCredentials(credentials);
    return await integration.setCampaignContent(input);
  },
};

export const mailchimpSendCampaignAction: IntegrationAction = {
  name: 'send_campaign',
  description: 'Send a campaign immediately',
  inputSchema: z.object({
    campaignId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  async execute(input, credentials) {
    const integration = new MailchimpIntegration();
    integration.setCredentials(credentials);
    return await integration.sendCampaign(input.campaignId);
  },
};
