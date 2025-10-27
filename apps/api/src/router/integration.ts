import { router, protectedProcedure, publicProcedure } from '../trpc';
import { createIntegrationSchema } from '@galaos/types';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  globalIntegrationRegistry,
  BufferIntegration,
  SlackIntegration,
  GitHubIntegration,
  GmailIntegration,
  SquarespaceIntegration,
  MailchimpIntegration,
  NotionIntegration,
  CanvaIntegration,
  AdobeIntegration,
  RobinhoodIntegration,
  CapCutIntegration,
  bufferCreatePostAction,
  bufferGetProfilesAction,
  slackPostMessageAction,
  slackListChannelsAction,
  slackUploadFileAction,
  githubCreateIssueAction,
  githubCreatePullRequestAction,
  githubCreateGistAction,
  githubListRepositoriesAction,
  githubTriggerWorkflowAction,
  gmailSendEmailAction,
  gmailListMessagesAction,
  gmailGetMessageAction,
  gmailCreateDraftAction,
  gmailAddLabelAction,
  squarespaceListProductsAction,
  squarespaceGetProductAction,
  squarespaceListOrdersAction,
  squarespaceUpdateInventoryAction,
  mailchimpListAudiencesAction,
  mailchimpAddSubscriberAction,
  mailchimpCreateCampaignAction,
  mailchimpSetCampaignContentAction,
  mailchimpSendCampaignAction,
  notionSearchAction,
  notionCreatePageAction,
  notionCreateDatabaseAction,
  notionQueryDatabaseAction,
  notionAddPageToDatabaseAction,
  notionAppendBlockChildrenAction,
  canvaCreateDesignAction,
  canvaGetDesignAction,
  canvaListDesignsAction,
  canvaExportDesignAction,
  canvaUploadAssetAction,
  canvaCreateFolderAction,
  adobeSearchStockAction,
  adobeLicenseStockAction,
  adobeListLibrariesAction,
  adobeGetLibraryElementsAction,
  adobeCreateLibraryElementAction,
  robinhoodGetPortfolioAction,
  robinhoodGetPositionsAction,
  robinhoodGetOrdersAction,
  robinhoodSearchInstrumentsAction,
  robinhoodGetQuoteAction,
  robinhoodGetHistoricalsAction,
  capcutUploadVideoAction,
  capcutListProjectsAction,
  capcutExportVideoAction,
} from '@galaos/integrations';
import { EnhancedOAuthIntegrationManager } from '@galaos/core';

// Initialize integrations
const bufferIntegration = new BufferIntegration();
const slackIntegration = new SlackIntegration();
const githubIntegration = new GitHubIntegration();
const gmailIntegration = new GmailIntegration();
const squarespaceIntegration = new SquarespaceIntegration();
const mailchimpIntegration = new MailchimpIntegration();
const notionIntegration = new NotionIntegration();
const canvaIntegration = new CanvaIntegration();
const adobeIntegration = new AdobeIntegration();
const robinhoodIntegration = new RobinhoodIntegration();
const capcutIntegration = new CapCutIntegration();

// Register integrations
globalIntegrationRegistry.register(bufferIntegration);
globalIntegrationRegistry.register(slackIntegration);
globalIntegrationRegistry.register(githubIntegration);
globalIntegrationRegistry.register(gmailIntegration);
globalIntegrationRegistry.register(squarespaceIntegration);
globalIntegrationRegistry.register(mailchimpIntegration);
globalIntegrationRegistry.register(notionIntegration);
globalIntegrationRegistry.register(canvaIntegration);
globalIntegrationRegistry.register(adobeIntegration);
globalIntegrationRegistry.register(robinhoodIntegration);
globalIntegrationRegistry.register(capcutIntegration);

// Register Buffer actions
globalIntegrationRegistry.registerAction('buffer', bufferCreatePostAction);
globalIntegrationRegistry.registerAction('buffer', bufferGetProfilesAction);

// Register Slack actions
globalIntegrationRegistry.registerAction('slack', slackPostMessageAction);
globalIntegrationRegistry.registerAction('slack', slackListChannelsAction);
globalIntegrationRegistry.registerAction('slack', slackUploadFileAction);

// Register GitHub actions
globalIntegrationRegistry.registerAction('github', githubCreateIssueAction);
globalIntegrationRegistry.registerAction('github', githubCreatePullRequestAction);
globalIntegrationRegistry.registerAction('github', githubCreateGistAction);
globalIntegrationRegistry.registerAction('github', githubListRepositoriesAction);
globalIntegrationRegistry.registerAction('github', githubTriggerWorkflowAction);

// Register Gmail actions
globalIntegrationRegistry.registerAction('gmail', gmailSendEmailAction);
globalIntegrationRegistry.registerAction('gmail', gmailListMessagesAction);
globalIntegrationRegistry.registerAction('gmail', gmailGetMessageAction);
globalIntegrationRegistry.registerAction('gmail', gmailCreateDraftAction);
globalIntegrationRegistry.registerAction('gmail', gmailAddLabelAction);

// Register Squarespace actions
globalIntegrationRegistry.registerAction('squarespace', squarespaceListProductsAction);
globalIntegrationRegistry.registerAction('squarespace', squarespaceGetProductAction);
globalIntegrationRegistry.registerAction('squarespace', squarespaceListOrdersAction);
globalIntegrationRegistry.registerAction('squarespace', squarespaceUpdateInventoryAction);

// Register Mailchimp actions
globalIntegrationRegistry.registerAction('mailchimp', mailchimpListAudiencesAction);
globalIntegrationRegistry.registerAction('mailchimp', mailchimpAddSubscriberAction);
globalIntegrationRegistry.registerAction('mailchimp', mailchimpCreateCampaignAction);
globalIntegrationRegistry.registerAction('mailchimp', mailchimpSetCampaignContentAction);
globalIntegrationRegistry.registerAction('mailchimp', mailchimpSendCampaignAction);

// Register Notion actions
globalIntegrationRegistry.registerAction('notion', notionSearchAction);
globalIntegrationRegistry.registerAction('notion', notionCreatePageAction);
globalIntegrationRegistry.registerAction('notion', notionCreateDatabaseAction);
globalIntegrationRegistry.registerAction('notion', notionQueryDatabaseAction);
globalIntegrationRegistry.registerAction('notion', notionAddPageToDatabaseAction);
globalIntegrationRegistry.registerAction('notion', notionAppendBlockChildrenAction);

// Register Canva actions
globalIntegrationRegistry.registerAction('canva', canvaCreateDesignAction);
globalIntegrationRegistry.registerAction('canva', canvaGetDesignAction);
globalIntegrationRegistry.registerAction('canva', canvaListDesignsAction);
globalIntegrationRegistry.registerAction('canva', canvaExportDesignAction);
globalIntegrationRegistry.registerAction('canva', canvaUploadAssetAction);
globalIntegrationRegistry.registerAction('canva', canvaCreateFolderAction);

// Register Adobe actions
globalIntegrationRegistry.registerAction('adobe', adobeSearchStockAction);
globalIntegrationRegistry.registerAction('adobe', adobeLicenseStockAction);
globalIntegrationRegistry.registerAction('adobe', adobeListLibrariesAction);
globalIntegrationRegistry.registerAction('adobe', adobeGetLibraryElementsAction);
globalIntegrationRegistry.registerAction('adobe', adobeCreateLibraryElementAction);

// Register Robinhood actions (READ-ONLY for safety)
globalIntegrationRegistry.registerAction('robinhood', robinhoodGetPortfolioAction);
globalIntegrationRegistry.registerAction('robinhood', robinhoodGetPositionsAction);
globalIntegrationRegistry.registerAction('robinhood', robinhoodGetOrdersAction);
globalIntegrationRegistry.registerAction('robinhood', robinhoodSearchInstrumentsAction);
globalIntegrationRegistry.registerAction('robinhood', robinhoodGetQuoteAction);
globalIntegrationRegistry.registerAction('robinhood', robinhoodGetHistoricalsAction);

// Register CapCut actions (Experimental/Placeholder)
globalIntegrationRegistry.registerAction('capcut', capcutUploadVideoAction);
globalIntegrationRegistry.registerAction('capcut', capcutListProjectsAction);
globalIntegrationRegistry.registerAction('capcut', capcutExportVideoAction);

// OAuth manager singleton
let oauthManager: EnhancedOAuthIntegrationManager;
function getOAuthManager() {
  if (!oauthManager) {
    oauthManager = new EnhancedOAuthIntegrationManager();
  }
  return oauthManager;
}

export const integrationRouter = router({
  create: protectedProcedure.input(createIntegrationSchema).mutation(async ({ ctx, input }) => {
    // Use OAuth manager for connection
    const manager = getOAuthManager();

    // This should be called after OAuth flow completes
    const integration = await ctx.prisma.integration.create({
      data: {
        userId: ctx.user.id,
        provider: input.provider,
        accountName: input.accountName,
        accessToken: 'use-oauth-manager', // Managed by OAuth system
        refreshToken: 'use-oauth-manager',
      },
    });

    return integration;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.prisma.integration.findMany({
      where: {
        userId: ctx.user.id,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        accountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't return tokens
      },
    });

    return integrations;
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const integration = await ctx.prisma.integration.findFirst({
      where: {
        id: input.id,
        userId: ctx.user.id,
      },
      select: {
        id: true,
        provider: true,
        accountName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Integration not found' });
    }

    return integration;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const integration = await ctx.prisma.integration.delete({
      where: {
        id: input.id,
      },
    });

    return integration;
  }),

  // Get available integration providers from registry
  getProviders: publicProcedure.query(async () => {
    const registeredIntegrations = globalIntegrationRegistry.list();
    const manager = getOAuthManager();
    const oauthProviders = manager.getProviders();

    // Combine both sources
    const providers = [
      // Registered integrations (ready to use)
      ...registeredIntegrations.map((integration) => ({
        id: integration.id,
        name: integration.name,
        description: integration.description,
        icon: integration.icon,
        authType: integration.authType,
        status: 'available',
        category: 'integrations',
        agentCapable: true,
      })),
      // OAuth providers (from enhanced manager)
      ...oauthProviders.map((provider) => ({
        id: provider.id,
        name: provider.name,
        description: `Connect your ${provider.name} account`,
        authType: provider.type,
        status: provider.status,
        category: getCategoryForProvider(provider.id),
        agentCapable: provider.agentCapable || false,
        requiresBrowser: provider.requiresBrowser,
      })),
    ];

    // Deduplicate by id
    const uniqueProviders = Array.from(
      new Map(providers.map((p) => [p.id, p])).values()
    );

    return uniqueProviders;
  }),

  // Get integration actions available to AI agents
  getActions: publicProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(async ({ input }) => {
      const integration = globalIntegrationRegistry.get(input.integrationId);
      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        });
      }

      const actions = globalIntegrationRegistry.getActions(input.integrationId);
      return {
        integration: {
          id: integration.id,
          name: integration.name,
          description: integration.description,
        },
        actions: actions.map((action) => ({
          name: action.name,
          description: action.description,
          inputSchema: action.inputSchema,
          outputSchema: action.outputSchema,
        })),
      };
    }),

  // Execute integration action (for AI agents)
  executeAction: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        actionName: z.string(),
        actionInput: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getOAuthManager();

      // Get valid access token
      const accessToken = await manager.getValidAccessToken(
        ctx.user.id,
        input.integrationId
      );

      if (!accessToken) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Not connected to ${input.integrationId}. Please connect first.`,
        });
      }

      // Get integration and action
      const integration = globalIntegrationRegistry.get(input.integrationId);
      if (!integration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Integration not found',
        });
      }

      const actions = globalIntegrationRegistry.getActions(input.integrationId);
      const action = actions.find((a) => a.name === input.actionName);
      if (!action) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Action ${input.actionName} not found`,
        });
      }

      // Execute action
      try {
        const result = await action.execute(input.actionInput, {
          accessToken,
          refreshToken: '', // Managed by OAuth system
          expiresAt: undefined,
        });

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Action failed: ${error.message}`,
        });
      }
    }),
});

function getCategoryForProvider(providerId: string): string {
  const categories: Record<string, string> = {
    'google-ai': 'ai',
    'anthropic': 'ai',
    'openai': 'ai',
    'perplexity': 'ai',
    'microsoft-azure': 'ai',
    'huggingface': 'ai',
    'slack': 'communication',
    'discord': 'communication',
    'telegram': 'communication',
    'twilio': 'communication',
    'mailchimp': 'communication',
    'github': 'development',
    'gitlab': 'development',
    'vercel': 'development',
    'gmail': 'productivity',
    'google-workspace': 'productivity',
    'notion': 'productivity',
    'airtable': 'productivity',
    'microsoft-365': 'productivity',
    'buffer': 'social',
    'twitter': 'social',
    'linkedin': 'social',
    'instagram': 'social',
    'youtube': 'social',
    'dropbox': 'storage',
    'google-drive': 'storage',
    'google-analytics': 'analytics',
    'stripe': 'commerce',
    'shopify': 'commerce',
    'hubspot': 'commerce',
    'salesforce': 'commerce',
    'squarespace': 'commerce',
    'canva': 'creative',
    'adobe': 'creative',
    'capcut': 'creative',
    'robinhood': 'finance',
  };

  return categories[providerId] || 'other';
}
