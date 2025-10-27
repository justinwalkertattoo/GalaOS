import { z } from 'zod';

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  authType: 'oauth2' | 'apikey' | 'basic';
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  icon?: string;
}

export interface OAuth2Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface APIKeyCredentials {
  apiKey: string;
}

export type IntegrationCredentials = OAuth2Credentials | APIKeyCredentials;

export abstract class BaseIntegration {
  abstract config: IntegrationConfig;
  protected credentials?: IntegrationCredentials;

  setCredentials(credentials: IntegrationCredentials): void {
    this.credentials = credentials;
  }

  getCredentials(): IntegrationCredentials | undefined {
    return this.credentials;
  }

  async refreshAccessToken?(): Promise<void>;

  abstract test(): Promise<boolean>;
}

export interface IntegrationAction<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute: (input: TInput, credentials: IntegrationCredentials) => Promise<TOutput>;
}
