import { z } from 'zod';

export const createIntegrationSchema = z.object({
  provider: z.string(),
  accountName: z.string().optional(),
  credentials: z.any(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;

export type IntegrationProvider =
  | 'google'
  | 'gmail'
  | 'google-calendar'
  | 'google-drive'
  | 'slack'
  | 'github'
  | 'notion'
  | 'trello'
  | 'asana'
  | 'linear'
  | 'discord'
  | 'telegram'
  | 'twitter'
  | 'dropbox'
  | 'stripe'
  | 'shopify'
  | 'airtable'
  | 'hubspot'
  | 'salesforce';

export interface IntegrationConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: string;
  authType: 'oauth2' | 'apikey' | 'basic';
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  requiredFields?: string[];
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  provider: IntegrationProvider;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}
