import { PrismaClient } from '@galaos/db';
import axios from 'axios';

export interface OAuthProvider {
  id: string;
  name: string;
  type: 'oauth2' | 'api_key' | 'browser_automation';
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
  requiresBrowser?: boolean;
  status: 'available' | 'coming_soon' | 'experimental';
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  providerId: string;
  type: 'oauth2' | 'api_key' | 'browser_automation';
  tokens?: OAuthTokens;
  apiKey?: string;
  metadata?: any;
  status: 'active' | 'expired' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OAuth Integration Manager
 *
 * Manages OAuth connections to AI providers and other services.
 * Ready for when providers add OAuth support!
 */
export class OAuthIntegrationManager {
  private prisma: PrismaClient;
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
    this.registerProviders();
  }

  /**
   * Register all supported providers
   */
  private registerProviders(): void {
    // AI Providers (Coming Soon)
    this.providers.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      type: 'oauth2',
      status: 'coming_soon',
      // When Anthropic adds OAuth, these will be filled in:
      // authUrl: 'https://console.anthropic.com/oauth/authorize',
      // tokenUrl: 'https://console.anthropic.com/oauth/token',
      // scopes: ['api.read', 'api.write'],
    });

    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      type: 'oauth2',
      status: 'coming_soon',
      // When OpenAI adds OAuth:
      // authUrl: 'https://platform.openai.com/oauth/authorize',
      // tokenUrl: 'https://platform.openai.com/oauth/token',
      // scopes: ['api.read', 'api.write'],
    });

    this.providers.set('perplexity', {
      id: 'perplexity',
      name: 'Perplexity AI',
      type: 'oauth2',
      status: 'coming_soon',
    });

    // Providers with OAuth TODAY
    this.providers.set('google-ai', {
      id: 'google-ai',
      name: 'Google AI (Gemini)',
      type: 'oauth2',
      status: 'available',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
    });

    this.providers.set('microsoft-azure', {
      id: 'microsoft-azure',
      name: 'Microsoft Azure OpenAI',
      type: 'oauth2',
      status: 'available',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['https://cognitiveservices.azure.com/.default'],
    });

    this.providers.set('huggingface', {
      id: 'huggingface',
      name: 'Hugging Face',
      type: 'oauth2',
      status: 'available',
      authUrl: 'https://huggingface.co/oauth/authorize',
      tokenUrl: 'https://huggingface.co/oauth/token',
      scopes: ['inference-api'],
    });

    // Browser automation (experimental - use at own risk)
    this.providers.set('chatgpt-web', {
      id: 'chatgpt-web',
      name: 'ChatGPT Web (Experimental)',
      type: 'browser_automation',
      status: 'experimental',
      requiresBrowser: true,
    });

    this.providers.set('claude-web', {
      id: 'claude-web',
      name: 'Claude Web (Experimental)',
      type: 'browser_automation',
      status: 'experimental',
      requiresBrowser: true,
    });

    // Other integrations
    this.providers.set('slack', {
      id: 'slack',
      name: 'Slack',
      type: 'oauth2',
      status: 'available',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read'],
    });

    this.providers.set('notion', {
      id: 'notion',
      name: 'Notion',
      type: 'oauth2',
      status: 'available',
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: [],
    });
  }

  /**
   * Get all available providers
   */
  getProviders(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): OAuthProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(
    providerId: string,
    userId: string,
    redirectUri: string
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.authUrl) {
      throw new Error(`Provider ${providerId} does not support OAuth`);
    }

    if (provider.status === 'coming_soon') {
      throw new Error(`OAuth for ${provider.name} is coming soon! Currently only API keys are supported.`);
    }

    // Generate state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({ userId, providerId, timestamp: Date.now() })
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: provider.clientId || process.env[`${providerId.toUpperCase()}_CLIENT_ID`] || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes?.join(' ') || '',
      state,
    });

    return `${provider.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerId: string,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.tokenUrl) {
      throw new Error(`Provider ${providerId} does not support OAuth`);
    }

    const clientId = provider.clientId || process.env[`${providerId.toUpperCase()}_CLIENT_ID`];
    const clientSecret = provider.clientSecret || process.env[`${providerId.toUpperCase()}_CLIENT_SECRET`];

    const response = await axios.post(
      provider.tokenUrl,
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    providerId: string,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.tokenUrl) {
      throw new Error(`Provider ${providerId} does not support OAuth`);
    }

    const clientId = provider.clientId || process.env[`${providerId.toUpperCase()}_CLIENT_ID`];
    const clientSecret = provider.clientSecret || process.env[`${providerId.toUpperCase()}_CLIENT_SECRET`];

    const response = await axios.post(
      provider.tokenUrl,
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      scope: data.scope,
    };
  }

  /**
   * Save OAuth connection
   */
  async saveConnection(
    userId: string,
    providerId: string,
    tokens: OAuthTokens,
    metadata?: any
  ): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // Store in database (encrypted)
    const connection = await this.prisma.modelProvider.create({
      data: {
        userId,
        provider: providerId,
        name: `${provider.name} Connection`,
        apiKey: tokens.accessToken, // Will be encrypted by Prisma middleware
        isActive: true,
        metadata: {
          type: 'oauth2',
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt?.toISOString(),
          scope: tokens.scope,
          ...metadata,
        },
      },
    });

    return connection.id;
  }

  /**
   * Get active connection for user
   */
  async getConnection(
    userId: string,
    providerId: string
  ): Promise<IntegrationConnection | null> {
    const connection = await this.prisma.modelProvider.findFirst({
      where: {
        userId,
        provider: providerId,
        isActive: true,
      },
    });

    if (!connection) {
      return null;
    }

    const metadata = connection.metadata as any;

    return {
      id: connection.id,
      userId: connection.userId,
      providerId: connection.provider,
      type: metadata.type || 'oauth2',
      tokens: metadata.type === 'oauth2'
        ? {
            accessToken: connection.apiKey,
            refreshToken: metadata.refreshToken,
            expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
            scope: metadata.scope,
          }
        : undefined,
      apiKey: metadata.type === 'api_key' ? connection.apiKey : undefined,
      metadata,
      status: 'active',
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Get valid access token (refreshes if needed)
   */
  async getValidAccessToken(userId: string, providerId: string): Promise<string> {
    const connection = await this.getConnection(userId, providerId);
    if (!connection || !connection.tokens) {
      throw new Error('No active connection found');
    }

    // Check if token is expired
    if (connection.tokens.expiresAt && connection.tokens.expiresAt < new Date()) {
      // Refresh token
      if (!connection.tokens.refreshToken) {
        throw new Error('Token expired and no refresh token available');
      }

      const newTokens = await this.refreshAccessToken(
        providerId,
        connection.tokens.refreshToken
      );

      // Update stored tokens
      await this.prisma.modelProvider.update({
        where: { id: connection.id },
        data: {
          apiKey: newTokens.accessToken,
          metadata: {
            ...connection.metadata,
            refreshToken: newTokens.refreshToken,
            expiresAt: newTokens.expiresAt?.toISOString(),
          },
        },
      });

      return newTokens.accessToken;
    }

    return connection.tokens.accessToken;
  }

  /**
   * Revoke connection
   */
  async revokeConnection(userId: string, connectionId: string): Promise<void> {
    await this.prisma.modelProvider.update({
      where: {
        id: connectionId,
        userId, // Ensure user owns this connection
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * List all connections for user
   */
  async listConnections(userId: string): Promise<IntegrationConnection[]> {
    const connections = await this.prisma.modelProvider.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    return connections.map((conn: any) => {
      const metadata = conn.metadata as any;
      return {
        id: conn.id,
        userId: conn.userId,
        providerId: conn.provider,
        type: metadata.type || 'api_key',
        tokens: metadata.type === 'oauth2'
          ? {
              accessToken: conn.apiKey,
              refreshToken: metadata.refreshToken,
              expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
              scope: metadata.scope,
            }
          : undefined,
        apiKey: metadata.type === 'api_key' ? conn.apiKey : undefined,
        metadata,
        status: 'active',
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      };
    });
  }
}
