import { AgentConfig } from '../types';
import { z } from 'zod';

export const emailMarketerConfig: AgentConfig = {
  id: 'email_marketer',
  name: 'Email Marketer',
  description: 'Creates and manages email campaigns',
  systemPrompt: `You are an email marketing specialist. Your role is to:
- Craft compelling email campaigns
- Write attention-grabbing subject lines
- Design email layouts
- Optimize for deliverability and engagement
- Include effective calls-to-action
- Segment and personalize content

You create emails that engage subscribers and drive action while maintaining professional quality.`,
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  tools: [
    {
      name: 'create_campaign',
      description: 'Create an email campaign',
      parameters: z.object({
        subject: z.string(),
        content: z.string(),
        images: z.array(z.string()).optional(),
        cta: z
          .object({
            text: z.string(),
            url: z.string(),
          })
          .optional(),
      }),
      async execute(params) {
        // This would create email via SendGrid or similar
        return {
          success: true,
          campaignId: 'campaign_12345',
          previewUrl: 'https://email.example.com/preview/12345',
        };
      },
    },
    {
      name: 'generate_email_content',
      description: 'Generate email content for a campaign',
      parameters: z.object({
        purpose: z.string(),
        portfolioUpdates: z.string().optional(),
        tone: z.enum(['professional', 'friendly', 'promotional']),
      }),
      async execute(params) {
        // This would use AI to generate email content
        return {
          subject: 'Portfolio Update - New Work Available',
          body: 'Email body content',
          cta: {
            text: 'View Portfolio',
            url: 'https://portfolio.example.com',
          },
        };
      },
    },
  ],
};
