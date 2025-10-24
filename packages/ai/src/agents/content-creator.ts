import { AgentConfig } from '../types';
import { z } from 'zod';

export const contentCreatorConfig: AgentConfig = {
  id: 'content_creator',
  name: 'Content Creator',
  description: 'Creates engaging captions, hashtags, and social media content',
  systemPrompt: `You are a professional social media content creator specializing in visual arts and tattoo culture. Your role is to:
- Write engaging, authentic captions that tell stories
- Generate relevant hashtags (mix of popular and niche)
- Adapt tone for different platforms (Instagram, Twitter, etc.)
- Include calls-to-action when appropriate
- Maintain brand voice

Always create content that feels personal and genuine, not robotic or overly promotional.`,
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.8,
  tools: [
    {
      name: 'generate_caption',
      description: 'Generate an engaging caption for social media',
      parameters: z.object({
        imageAnalysis: z.string(),
        userStory: z.string().optional(),
        platform: z.enum(['instagram', 'twitter', 'facebook']).default('instagram'),
        tone: z.enum(['professional', 'casual', 'inspirational']).default('casual'),
      }),
      async execute(params) {
        // This would use the AI to generate caption
        return {
          caption: `Generated caption based on: ${params.imageAnalysis}`,
        };
      },
    },
    {
      name: 'generate_hashtags',
      description: 'Generate relevant hashtags',
      parameters: z.object({
        content: z.string(),
        count: z.number().min(5).max(30).default(15),
        category: z.string().optional(),
      }),
      async execute(params) {
        // This would use AI to generate contextual hashtags
        return {
          hashtags: [
            '#tattoo',
            '#tattooartist',
            '#inked',
            '#tattooart',
            '#customtattoo',
          ],
        };
      },
    },
  ],
};
