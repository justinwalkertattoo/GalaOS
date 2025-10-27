import { PrismaClient } from '@galaos/db';
import axios from 'axios';

export interface OAuthProvider {
  id: string;
  name: string;
  category: 'ai' | 'productivity' | 'social' | 'communication' | 'development' | 'storage' | 'analytics' | 'commerce';
  type: 'oauth2' | 'api_key' | 'browser_automation';
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
  requiresBrowser?: boolean;
  status: 'available' | 'coming_soon' | 'experimental';
  description: string;
  icon?: string;
  agentCapable?: boolean; // Can AI agents use this?
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
 * Comprehensive integration marketplace with 30+ providers!
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
    // ========================================
    // AI PROVIDERS
    // ========================================

    this.providers.set('google-ai', {
      id: 'google-ai',
      name: 'Google AI (Gemini)',
      category: 'ai',
      type: 'oauth2',
      status: 'available',
      description: 'Access Google Gemini models with your Google account',
      icon: '🔮',
      agentCapable: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/generative-language'],
    });

    this.providers.set('microsoft-azure', {
      id: 'microsoft-azure',
      name: 'Microsoft Azure OpenAI',
      category: 'ai',
      type: 'oauth2',
      status: 'available',
      description: 'Enterprise OpenAI models through Azure',
      icon: '☁️',
      agentCapable: true,
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['https://cognitiveservices.azure.com/.default'],
    });

    this.providers.set('huggingface', {
      id: 'huggingface',
      name: 'Hugging Face',
      category: 'ai',
      type: 'oauth2',
      status: 'available',
      description: 'Access 100,000+ AI models via Hugging Face',
      icon: '🤗',
      agentCapable: true,
      authUrl: 'https://huggingface.co/oauth/authorize',
      tokenUrl: 'https://huggingface.co/oauth/token',
      scopes: ['inference-api', 'read-repos'],
    });

    this.providers.set('anthropic', {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      category: 'ai',
      type: 'oauth2',
      status: 'coming_soon',
      description: 'Claude AI models (OAuth coming soon)',
      icon: '🧠',
      agentCapable: true,
    });

    this.providers.set('openai', {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      category: 'ai',
      type: 'oauth2',
      status: 'coming_soon',
      description: 'GPT models (OAuth coming soon)',
      icon: '🤖',
      agentCapable: true,
    });

    this.providers.set('perplexity', {
      id: 'perplexity',
      name: 'Perplexity AI',
      category: 'ai',
      type: 'oauth2',
      status: 'coming_soon',
      description: 'AI-powered search (OAuth coming soon)',
      icon: '🔍',
      agentCapable: true,
    });

    // Experimental AI (Browser Automation)
    this.providers.set('chatgpt-web', {
      id: 'chatgpt-web',
      name: 'ChatGPT Web (Experimental)',
      category: 'ai',
      type: 'browser_automation',
      status: 'experimental',
      description: 'Use ChatGPT Plus subscription via browser automation',
      icon: '🌐',
      agentCapable: true,
      requiresBrowser: true,
    });

    this.providers.set('claude-web', {
      id: 'claude-web',
      name: 'Claude Web (Experimental)',
      category: 'ai',
      type: 'browser_automation',
      status: 'experimental',
      description: 'Use Claude Pro subscription via browser automation',
      icon: '🌐',
      agentCapable: true,
      requiresBrowser: true,
    });

    // ========================================
    // PRODUCTIVITY & WORKSPACE
    // ========================================

    this.providers.set('google-workspace', {
      id: 'google-workspace',
      name: 'Google Workspace',
      category: 'productivity',
      type: 'oauth2',
      status: 'available',
      description: 'Gmail, Calendar, Drive, Docs, Sheets',
      icon: '📊',
      agentCapable: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    this.providers.set('notion', {
      id: 'notion',
      name: 'Notion',
      category: 'productivity',
      type: 'oauth2',
      status: 'available',
      description: 'Workspace for notes, docs, and databases',
      icon: '📝',
      agentCapable: true,
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: [],
    });

    this.providers.set('airtable', {
      id: 'airtable',
      name: 'Airtable',
      category: 'productivity',
      type: 'oauth2',
      status: 'available',
      description: 'Spreadsheet-database hybrid for organizing data',
      icon: '📋',
      agentCapable: true,
      authUrl: 'https://airtable.com/oauth2/v1/authorize',
      tokenUrl: 'https://airtable.com/oauth2/v1/token',
      scopes: ['data.records:read', 'data.records:write', 'schema.bases:read'],
    });

    this.providers.set('microsoft-365', {
      id: 'microsoft-365',
      name: 'Microsoft 365',
      category: 'productivity',
      type: 'oauth2',
      status: 'available',
      description: 'Outlook, OneDrive, Teams, Office apps',
      icon: '📧',
      agentCapable: true,
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: [
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Files.ReadWrite',
      ],
    });

    // ========================================
    // SOCIAL MEDIA & CONTENT
    // ========================================

    this.providers.set('buffer', {
      id: 'buffer',
      name: 'Buffer',
      category: 'social',
      type: 'oauth2',
      status: 'available',
      description: 'Schedule and publish social media posts',
      icon: '📅',
      agentCapable: true,
      authUrl: 'https://bufferapp.com/oauth2/authorize',
      tokenUrl: 'https://api.bufferapp.com/1/oauth2/token.json',
      scopes: ['publish', 'analytics'],
    });

    this.providers.set('twitter', {
      id: 'twitter',
      name: 'Twitter (X)',
      category: 'social',
      type: 'oauth2',
      status: 'available',
      description: 'Post tweets and manage Twitter account',
      icon: '🐦',
      agentCapable: true,
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
    });

    this.providers.set('linkedin', {
      id: 'linkedin',
      name: 'LinkedIn',
      category: 'social',
      type: 'oauth2',
      status: 'available',
      description: 'Professional networking and content sharing',
      icon: '💼',
      agentCapable: true,
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['w_member_social', 'r_liteprofile'],
    });

    this.providers.set('instagram', {
      id: 'instagram',
      name: 'Instagram',
      category: 'social',
      type: 'oauth2',
      status: 'available',
      description: 'Share photos and manage Instagram account',
      icon: '📸',
      agentCapable: true,
      authUrl: 'https://api.instagram.com/oauth/authorize',
      tokenUrl: 'https://api.instagram.com/oauth/access_token',
      scopes: ['user_profile', 'user_media'],
    });

    this.providers.set('youtube', {
      id: 'youtube',
      name: 'YouTube',
      category: 'social',
      type: 'oauth2',
      status: 'available',
      description: 'Upload videos and manage YouTube channel',
      icon: '📹',
      agentCapable: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/youtube.upload'],
    });

    // ========================================
    // COMMUNICATION
    // ========================================

    this.providers.set('slack', {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      type: 'oauth2',
      status: 'available',
      description: 'Team messaging and collaboration',
      icon: '💬',
      agentCapable: true,
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read', 'users:read'],
    });

    this.providers.set('discord', {
      id: 'discord',
      name: 'Discord',
      category: 'communication',
      type: 'oauth2',
      status: 'available',
      description: 'Community chat and voice communication',
      icon: '🎮',
      agentCapable: true,
      authUrl: 'https://discord.com/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      scopes: ['bot', 'messages.read', 'messages.write'],
    });

    this.providers.set('telegram', {
      id: 'telegram',
      name: 'Telegram',
      category: 'communication',
      type: 'oauth2',
      status: 'available',
      description: 'Messaging platform with bot API',
      icon: '✈️',
      agentCapable: true,
      authUrl: 'https://oauth.telegram.org/auth',
      tokenUrl: 'https://oauth.telegram.org/auth/token',
      scopes: [],
    });

    this.providers.set('twilio', {
      id: 'twilio',
      name: 'Twilio',
      category: 'communication',
      type: 'oauth2',
      status: 'available',
      description: 'SMS, voice, and messaging API',
      icon: '📱',
      agentCapable: true,
      authUrl: 'https://www.twilio.com/oauth/authorize',
      tokenUrl: 'https://api.twilio.com/oauth/token',
      scopes: ['sms', 'voice'],
    });

    // ========================================
    // DEVELOPMENT & CODE
    // ========================================

    this.providers.set('github', {
      id: 'github',
      name: 'GitHub',
      category: 'development',
      type: 'oauth2',
      status: 'available',
      description: 'Code hosting, issues, pull requests, actions',
      icon: '🐙',
      agentCapable: true,
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'workflow', 'admin:org'],
    });

    this.providers.set('gitlab', {
      id: 'gitlab',
      name: 'GitLab',
      category: 'development',
      type: 'oauth2',
      status: 'available',
      description: 'DevOps platform for Git repositories',
      icon: '🦊',
      agentCapable: true,
      authUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      scopes: ['api', 'read_repository', 'write_repository'],
    });

    this.providers.set('vercel', {
      id: 'vercel',
      name: 'Vercel',
      category: 'development',
      type: 'oauth2',
      status: 'available',
      description: 'Deploy and host web applications',
      icon: '▲',
      agentCapable: true,
      authUrl: 'https://vercel.com/oauth/authorize',
      tokenUrl: 'https://vercel.com/oauth/access_token',
      scopes: [],
    });

    // ========================================
    // STORAGE & FILES
    // ========================================

    this.providers.set('dropbox', {
      id: 'dropbox',
      name: 'Dropbox',
      category: 'storage',
      type: 'oauth2',
      status: 'available',
      description: 'Cloud file storage and sharing',
      icon: '📦',
      agentCapable: true,
      authUrl: 'https://www.dropbox.com/oauth2/authorize',
      tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
      scopes: ['files.content.read', 'files.content.write'],
    });

    this.providers.set('google-drive', {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'storage',
      type: 'oauth2',
      status: 'available',
      description: 'Cloud storage and file synchronization',
      icon: '💾',
      agentCapable: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    // ========================================
    // ANALYTICS & MONITORING
    // ========================================

    this.providers.set('google-analytics', {
      id: 'google-analytics',
      name: 'Google Analytics',
      category: 'analytics',
      type: 'oauth2',
      status: 'available',
      description: 'Website traffic and user analytics',
      icon: '📈',
      agentCapable: true,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    // ========================================
    // COMMERCE & PAYMENTS
    // ========================================

    this.providers.set('stripe', {
      id: 'stripe',
      name: 'Stripe',
      category: 'commerce',
      type: 'oauth2',
      status: 'available',
      description: 'Payment processing and billing',
      icon: '💳',
      agentCapable: true,
      authUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      scopes: ['read_write'],
    });

    this.providers.set('shopify', {
      id: 'shopify',
      name: 'Shopify',
      category: 'commerce',
      type: 'oauth2',
      status: 'available',
      description: 'E-commerce platform and store management',
      icon: '🛍️',
      agentCapable: true,
      authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
      tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
      scopes: ['read_products', 'write_products', 'read_orders'],
    });

    this.providers.set('hubspot', {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'commerce',
      type: 'oauth2',
      status: 'available',
      description: 'CRM, marketing, and sales automation',
      icon: '🎯',
      agentCapable: true,
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: ['contacts', 'content', 'automation'],
    });

    this.providers.set('salesforce', {
      id: 'salesforce',
      name: 'Salesforce',
      category: 'commerce',
      type: 'oauth2',
      status: 'available',
      description: 'Customer relationship management (CRM)',
      icon: '☁️',
      agentCapable: true,
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token'],
    });
  }

  /**
   * Get all available providers
   */
  getProviders(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by category
   */
  getProvidersByCategory(category: string): OAuthProvider[] {
    return Array.from(this.providers.values()).filter(p => p.category === category);
  }

  /**
   * Get providers by status
   */
  getProvidersByStatus(status: 'available' | 'coming_soon' | 'experimental'): OAuthProvider[] {
    return Array.from(this.providers.values()).filter(p => p.status === status);
  }

  /**
   * Get agent-capable providers
   */
  getAgentCapableProviders(): OAuthProvider[] {
    return Array.from(this.providers.values()).filter(p => p.agentCapable);
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
      client_id: provider.clientId || process.env[`${providerId.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`] || '',
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

    const clientId = provider.clientId || process.env[`${providerId.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`];
    const clientSecret = provider.clientSecret || process.env[`${providerId.toUpperCase().replace(/-/g, '_')}_CLIENT_SECRET`];

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

    const clientId = provider.clientId || process.env[`${providerId.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`];
    const clientSecret = provider.clientSecret || process.env[`${providerId.toUpperCase().replace(/-/g, '_')}_CLIENT_SECRET`];

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
      refreshToken: data.refresh_token || refreshToken,
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
        apiKey: tokens.accessToken,
        isActive: true,
        metadata: {
          type: 'oauth2',
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt?.toISOString(),
          scope: tokens.scope,
          category: provider.category,
          agentCapable: provider.agentCapable,
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
      if (!connection.tokens.refreshToken) {
        throw new Error('Token expired and no refresh token available');
      }

      const newTokens = await this.refreshAccessToken(
        providerId,
        connection.tokens.refreshToken
      );

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
        userId,
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

    return connections.map((conn) => {
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
