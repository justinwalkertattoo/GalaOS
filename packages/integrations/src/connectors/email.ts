import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  APIKeyCredentials,
} from '../base';

export class SendGridIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send emails and manage email campaigns',
    authType: 'apikey',
    icon: '📧',
  };

  async test(): Promise<boolean> {
    try {
      // Test by fetching API key info
      const creds = this.credentials as APIKeyCredentials;
      const response = await fetch('https://api.sendgrid.com/v3/scopes', {
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async sendEmail(data: {
    to: string | string[];
    from: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<any> {
    const creds = this.credentials as APIKeyCredentials;
    if (!creds?.apiKey) throw new Error('Not authenticated');

    const recipients = Array.isArray(data.to)
      ? data.to.map((email) => ({ email }))
      : [{ email: data.to }];

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: recipients }],
        from: { email: data.from },
        subject: data.subject,
        content: [
          ...(data.html ? [{ type: 'text/html', value: data.html }] : []),
          ...(data.text ? [{ type: 'text/plain', value: data.text }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return { success: true, status: response.status };
  }

  async createCampaign(data: {
    title: string;
    subject: string;
    senderId: number;
    listIds: number[];
    htmlContent?: string;
  }): Promise<any> {
    const creds = this.credentials as APIKeyCredentials;
    if (!creds?.apiKey) throw new Error('Not authenticated');

    // Create campaign
    const campaignResponse = await fetch('https://api.sendgrid.com/v3/campaigns', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.title,
        subject: data.subject,
        sender_id: data.senderId,
        list_ids: data.listIds,
        html_content: data.htmlContent,
      }),
    });

    if (!campaignResponse.ok) {
      throw new Error(`Failed to create campaign: ${campaignResponse.statusText}`);
    }

    return await campaignResponse.json();
  }

  async sendCampaign(campaignId: number): Promise<any> {
    const creds = this.credentials as APIKeyCredentials;
    if (!creds?.apiKey) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.sendgrid.com/v3/campaigns/${campaignId}/schedules/now`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send campaign: ${response.statusText}`);
    }

    return { success: true, campaignId };
  }
}

// Email Actions
export const emailSendAction: IntegrationAction = {
  name: 'send_email',
  description: 'Send a single email',
  inputSchema: z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    from: z.string().email(),
    subject: z.string(),
    html: z.string().optional(),
    text: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.number(),
  }),
  async execute(input, credentials) {
    const integration = new SendGridIntegration();
    integration.setCredentials(credentials);
    return await integration.sendEmail(input);
  },
};

export const emailCreateCampaignAction: IntegrationAction = {
  name: 'create_campaign',
  description: 'Create an email campaign',
  inputSchema: z.object({
    title: z.string(),
    subject: z.string(),
    senderId: z.number(),
    listIds: z.array(z.number()),
    htmlContent: z.string().optional(),
  }),
  outputSchema: z.object({
    id: z.number(),
    title: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new SendGridIntegration();
    integration.setCredentials(credentials);
    return await integration.createCampaign(input);
  },
};
