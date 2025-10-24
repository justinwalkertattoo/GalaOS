import { AgentConfig } from '../types';
import { z } from 'zod';

export const portfolioManagerConfig: AgentConfig = {
  id: 'portfolio_manager',
  name: 'Portfolio Manager',
  description: 'Manages portfolio website updates and organization',
  systemPrompt: `You are a portfolio manager responsible for maintaining a professional portfolio website. Your role is to:
- Organize and categorize work
- Write compelling project descriptions
- Optimize images for web
- Maintain consistent presentation
- Suggest portfolio improvements

You ensure the portfolio always showcases the best work in the most professional manner.`,
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.6,
  tools: [
    {
      name: 'add_to_portfolio',
      description: 'Add new work to the portfolio',
      parameters: z.object({
        images: z.array(z.string()),
        title: z.string(),
        description: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      async execute(params) {
        // This would integrate with CMS API (WordPress, Webflow, etc.)
        return {
          success: true,
          portfolioItemId: 'portfolio_12345',
          url: 'https://portfolio.example.com/work/12345',
        };
      },
    },
    {
      name: 'generate_project_description',
      description: 'Generate a professional description for portfolio work',
      parameters: z.object({
        imageAnalysis: z.string(),
        workType: z.string(),
        clientInfo: z.string().optional(),
      }),
      async execute(params) {
        // This would use AI to generate description
        return {
          description: 'Professional project description based on the analysis',
        };
      },
    },
  ],
};
