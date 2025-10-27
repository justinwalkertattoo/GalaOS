import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { EnhancedOAuthIntegrationManager } from '@galaos/core/src/oauth-integration-manager-enhanced';
import { BrowserIntegration, TOS_WARNING } from '@galaos/core/src/browser-integration';

// Singleton instances
let oauthManager: EnhancedOAuthIntegrationManager;
let browserIntegration: BrowserIntegration;

function getManagers() {
  if (!oauthManager) {
    oauthManager = new EnhancedOAuthIntegrationManager();
  }
  if (!browserIntegration) {
    browserIntegration = new BrowserIntegration();
  }
  return { oauthManager, browserIntegration };
}

/**
 * OAuth Integrations Router
 *
 * Connect your existing AI accounts instead of using API keys!
 * - Google AI (Gemini) - OAuth available now
 * - Microsoft Azure OpenAI - OAuth available now
 * - Hugging Face - OAuth available now
 * - ChatGPT, Claude, Perplexity - Coming soon (use browser automation as temporary solution)
 */
export const oauthIntegrationsRouter = router({
  /**
   * List all available integration providers
   */
  listProviders: publicProcedure.query(async () => {
    const { oauthManager } = getManagers();
    const providers = oauthManager.getProviders();

    return {
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        requiresBrowser: p.requiresBrowser,
        description: getProviderDescription(p.id),
      })),
    };
  }),

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        redirectUri: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { oauthManager } = getManagers();

      try {
        const authUrl = await oauthManager.getAuthorizationUrl(
          input.providerId,
          ctx.user.id,
          input.redirectUri
        );

        return {
          authUrl,
          providerId: input.providerId,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),

  /**
   * Complete OAuth flow (callback handler)
   */
  completeOAuth: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        code: z.string(),
        redirectUri: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { oauthManager } = getManagers();

      try {
        // Exchange code for tokens
        const tokens = await oauthManager.exchangeCodeForTokens(
          input.providerId,
          input.code,
          input.redirectUri
        );

        // Save connection
        const connectionId = await oauthManager.saveConnection(
          ctx.user.id,
          input.providerId,
          tokens
        );

        return {
          success: true,
          connectionId,
          message: 'Successfully connected!',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `OAuth failed: ${error.message}`,
        });
      }
    }),

  /**
   * List user's active connections
   */
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    const { oauthManager } = getManagers();

    const connections = await oauthManager.listConnections(ctx.user.id);

    return {
      connections: connections.map((conn) => ({
        id: conn.id,
        providerId: conn.providerId,
        providerName: oauthManager.getProvider(conn.providerId)?.name || conn.providerId,
        type: conn.type,
        status: conn.status,
        createdAt: conn.createdAt,
        expiresAt: conn.tokens?.expiresAt,
      })),
    };
  }),

  /**
   * Revoke connection
   */
  revokeConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { oauthManager } = getManagers();

      await oauthManager.revokeConnection(ctx.user.id, input.connectionId);

      return {
        success: true,
        message: 'Connection revoked',
      };
    }),

  /**
   * Initialize browser automation session
   * (For ChatGPT, Claude, etc. until they add OAuth)
   */
  initBrowserSession: protectedProcedure
    .input(
      z.object({
        providerId: z.enum(['chatgpt-web', 'claude-web']),
        acceptedRisks: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.acceptedRisks) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You must accept the risks to use browser automation',
        });
      }

      const { browserIntegration } = getManagers();

      try {
        let session;
        if (input.providerId === 'chatgpt-web') {
          session = await browserIntegration.initializeChatGPT(ctx.user.id);
        } else if (input.providerId === 'claude-web') {
          session = await browserIntegration.initializeClaude(ctx.user.id);
        } else {
          throw new Error('Unsupported provider');
        }

        return {
          success: true,
          sessionId: session.sessionId,
          loginUrl: session.loginUrl,
          message: 'Browser session initialized. Please complete login in the opened browser window.',
          warning: TOS_WARNING,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to initialize browser session: ${error.message}`,
        });
      }
    }),

  /**
   * Check browser session authentication status
   */
  checkBrowserAuth: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { browserIntegration } = getManagers();

      const session = browserIntegration.getSessionStatus(input.sessionId);

      if (!session) {
        return {
          authenticated: false,
          status: 'not_found',
        };
      }

      return {
        authenticated: session.status === 'authenticated' || session.status === 'ready',
        status: session.status,
      };
    }),

  /**
   * Close browser session
   */
  closeBrowserSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { browserIntegration } = getManagers();

      await browserIntegration.closeSession(input.sessionId);

      return {
        success: true,
        message: 'Session closed',
      };
    }),

  /**
   * Get provider integration instructions
   */
  getProviderInstructions: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const instructions = getProviderInstructions(input.providerId);
      return instructions;
    }),
});

/**
 * Get provider description
 */
function getProviderDescription(providerId: string): string {
  const descriptions: Record<string, string> = {
    'anthropic': 'Connect your Anthropic account (Coming Soon - OAuth not yet available)',
    'openai': 'Connect your OpenAI account (Coming Soon - OAuth not yet available)',
    'perplexity': 'Connect your Perplexity account (Coming Soon - OAuth not yet available)',
    'google-ai': 'Use your Google account to access Gemini models',
    'microsoft-azure': 'Connect your Azure account for Azure OpenAI',
    'huggingface': 'Connect your Hugging Face account for inference API',
    'chatgpt-web': 'Use your ChatGPT Plus subscription (Experimental - Browser Automation)',
    'claude-web': 'Use your Claude Pro subscription (Experimental - Browser Automation)',
    'slack': 'Connect GalaOS to your Slack workspace',
    'notion': 'Connect GalaOS to your Notion workspace',
  };

  return descriptions[providerId] || 'AI provider integration';
}

/**
 * Get detailed setup instructions for each provider
 */
function getProviderInstructions(providerId: string): any {
  const instructions: Record<string, any> = {
    'google-ai': {
      title: 'Connect Google AI (Gemini)',
      steps: [
        'Click "Connect" to start OAuth flow',
        'Sign in with your Google account',
        'Grant permissions for Generative AI access',
        'You\'ll be redirected back to GalaOS',
        'Start using Gemini models!',
      ],
      notes: [
        'Uses your existing Google account',
        'No API key needed',
        'Free tier available',
      ],
    },
    'microsoft-azure': {
      title: 'Connect Microsoft Azure OpenAI',
      steps: [
        'Ensure you have an Azure account with OpenAI enabled',
        'Click "Connect" to start OAuth flow',
        'Sign in with your Microsoft account',
        'Grant Azure Cognitive Services permissions',
        'Select your Azure OpenAI resource',
      ],
      notes: [
        'Requires Azure subscription',
        'Pay as you go pricing',
        'Enterprise-grade security',
      ],
    },
    'chatgpt-web': {
      title: 'Connect ChatGPT Web (Experimental)',
      steps: [
        'Read and accept the Terms of Service warning',
        'Click "Initialize Browser Session"',
        'A browser window will open',
        'Log in to chat.openai.com normally',
        'Once logged in, GalaOS will detect authentication',
        'Browser window can be closed',
        'GalaOS will use your ChatGPT Plus subscription',
      ],
      warnings: [
        '⚠️ This may violate OpenAI Terms of Service',
        '⚠️ Your account could be suspended',
        '⚠️ Only use with your own personal account',
        '⚠️ Features may break with UI updates',
      ],
      notes: [
        'Best for ChatGPT Plus subscribers',
        'Uses your existing subscription',
        'No additional API costs',
        'Less reliable than official API',
      ],
    },
    'claude-web': {
      title: 'Connect Claude Web (Experimental)',
      steps: [
        'Read and accept the Terms of Service warning',
        'Click "Initialize Browser Session"',
        'A browser window will open',
        'Log in to claude.ai normally',
        'Once logged in, GalaOS will detect authentication',
        'Browser window can be closed',
        'GalaOS will use your Claude Pro subscription',
      ],
      warnings: [
        '⚠️ This may violate Anthropic Terms of Service',
        '⚠️ Your account could be suspended',
        '⚠️ Only use with your own personal account',
        '⚠️ Features may break with UI updates',
      ],
      notes: [
        'Best for Claude Pro subscribers',
        'Uses your existing subscription',
        'No additional API costs',
        'Less reliable than official API',
      ],
    },
    'anthropic': {
      title: 'Connect Anthropic Account (Coming Soon)',
      status: 'Anthropic does not currently offer OAuth integration.',
      alternative: 'For now, use API keys or try the experimental browser automation.',
      futureAvailability: 'We\'ll add OAuth support as soon as Anthropic makes it available!',
    },
    'openai': {
      title: 'Connect OpenAI Account (Coming Soon)',
      status: 'OpenAI does not currently offer OAuth integration for ChatGPT.',
      alternative: 'For now, use API keys or try the experimental browser automation for ChatGPT Plus.',
      futureAvailability: 'We\'ll add OAuth support as soon as OpenAI makes it available!',
    },
  };

  return instructions[providerId] || {
    title: `Connect ${providerId}`,
    steps: ['OAuth flow coming soon'],
  };
}
