import { AgentConfig } from '../types';
import { z } from 'zod';

export const socialMediaManagerConfig: AgentConfig = {
  id: 'social_media_manager',
  name: 'Social Media Manager',
  description: 'Manages posting to social media platforms',
  systemPrompt: `You are a social media manager responsible for publishing content across multiple platforms. Your role is to:
- Coordinate posting across Instagram, Buffer, and other platforms
- Optimize posting times
- Ensure consistent branding
- Track post performance
- Suggest improvements

You work closely with content creators to ensure posts are published correctly and effectively.`,
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.5,
  tools: [
    {
      name: 'post_to_platforms',
      description: 'Post content to selected social media platforms',
      parameters: z.object({
        platforms: z.array(z.enum(['instagram', 'buffer', 'twitter'])),
        content: z.object({
          images: z.array(z.string()),
          caption: z.string(),
          hashtags: z.array(z.string()),
        }),
        schedule: z.date().optional(),
      }),
      async execute(params) {
        // This would call the integration APIs
        return {
          success: true,
          posted: params.platforms,
          postIds: params.platforms.map((p: string) => `${p}_12345`),
        };
      },
    },
    {
      name: 'get_optimal_posting_time',
      description: 'Get the optimal time to post based on audience engagement',
      parameters: z.object({
        platform: z.string(),
        timezone: z.string().default('UTC'),
      }),
      async execute(params) {
        // This would analyze historical data
        return {
          suggestedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          reason: 'Based on your audience activity patterns',
        };
      },
    },
  ],
};
