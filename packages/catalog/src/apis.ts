import { APIProviderEntry } from './types';

export const APIS: APIProviderEntry[] = [
  // AI
  {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'ai',
    description: 'Claude API for text, tool use, and vision.',
    docsUrl: 'https://docs.anthropic.com/claude/reference',
    auth: { type: 'apiKey' },
    dataAccess: ['rest'],
    sdks: [{ id: 'anthropic-sdk' }],
    rateLimits: 'Tiered; see account limits.'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    description: 'GPT models, Assistants, embeddings, and more.',
    docsUrl: 'https://platform.openai.com/docs',
    auth: { type: 'apiKey' },
    dataAccess: ['rest'],
    sdks: [{ id: 'openai-sdk' }],
    rateLimits: 'RPM/TPM quotas by model; account-tier based.'
  },
  {
    id: 'google-ai',
    name: 'Google AI (Gemini)',
    category: 'ai',
    description: 'Gemini APIs for multimodal and text.',
    docsUrl: 'https://ai.google.dev/',
    auth: { type: 'apiKey' },
    dataAccess: ['rest'],
    sdks: [{ id: 'google-generative-ai' }]
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    category: 'ai',
    description: 'Azure-hosted OpenAI with enterprise controls.',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
    auth: { type: 'oauth2' },
    dataAccess: ['rest'],
    sdks: [{ id: 'azure-openai' }]
  },

  // Communication
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Messaging and collaboration platform.',
    docsUrl: 'https://api.slack.com/',
    auth: { type: 'oauth2', scopesExample: ['chat:write', 'channels:read'] },
    dataAccess: ['rest', 'webhooks', 'events'],
    sdks: [{ id: 'slack-web-api' }],
    rateLimits: 'Generally 1 rps per method per workspace token.'
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    description: 'Communities and real-time chat.',
    docsUrl: 'https://discord.com/developers/docs/intro',
    auth: { type: 'oauth2' },
    dataAccess: ['rest', 'webhooks', 'events'],
    rateLimits: 'Per-route; global and bucketed.'
  },

  // Productivity
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    category: 'productivity',
    description: 'Gmail, Drive, Calendar, Docs APIs.',
    docsUrl: 'https://developers.google.com/',
    auth: { type: 'oauth2', scopesExample: ['gmail.send', 'drive.file'] },
    dataAccess: ['rest', 'webhooks'],
    sdks: [{ id: 'googleapis' }]
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    description: 'Pages, databases, search.',
    docsUrl: 'https://developers.notion.com/',
    auth: { type: 'oauth2' },
    dataAccess: ['rest'],
    sdks: [{ id: 'notion-sdk' }]
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'productivity',
    description: 'Low-code database and automations.',
    docsUrl: 'https://airtable.com/api',
    auth: { type: 'apiKey' },
    dataAccess: ['rest'],
    sdks: [{ id: 'airtable' }]
  },

  // Development
  {
    id: 'github',
    name: 'GitHub',
    category: 'development',
    description: 'Repos, issues, PRs, webhooks.',
    docsUrl: 'https://docs.github.com/en/rest',
    auth: { type: 'oauth2', scopesExample: ['repo', 'workflow'] },
    dataAccess: ['rest', 'graphql', 'webhooks'],
    rateLimits: '5,000 requests/hour per user token.'
  },

  // Social
  {
    id: 'buffer',
    name: 'Buffer',
    category: 'social',
    description: 'Social scheduling and publishing.',
    docsUrl: 'https://buffer.com/developers/api',
    auth: { type: 'oauth2' },
    dataAccess: ['rest', 'webhooks']
  },
  {
    id: 'twitter-x',
    name: 'X (Twitter)',
    category: 'social',
    description: 'Tweets, threads, media, and more.',
    docsUrl: 'https://developer.x.com/en/docs',
    auth: { type: 'oauth2' },
    dataAccess: ['rest', 'webhooks']
  },
  {
    id: 'instagram',
    name: 'Instagram Graph API',
    category: 'social',
    description: 'Publish, insights (Business/Creator).',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    auth: { type: 'oauth2' },
    dataAccess: ['rest', 'webhooks']
  },

  // Storage
  {
    id: 'aws-s3',
    name: 'Amazon S3',
    category: 'storage',
    description: 'Object storage with versioning and events.',
    docsUrl: 'https://docs.aws.amazon.com/s3/',
    auth: { type: 'apiKey' },
    dataAccess: ['rest', 'events'],
    sdks: [{ id: 'aws-sdk-s3' }]
  },
  {
    id: 'minio',
    name: 'MinIO',
    category: 'storage',
    description: 'Self-hosted S3-compatible object storage.',
    docsUrl: 'https://min.io/docs/',
    auth: { type: 'apiKey' },
    dataAccess: ['rest', 'events'],
    sdks: [{ id: 'minio' }]
  },

  // Commerce
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'commerce',
    description: 'Payments, billing, and checkout.',
    docsUrl: 'https://stripe.com/docs/api',
    auth: { type: 'apiKey' },
    dataAccess: ['rest', 'webhooks'],
    rateLimits: 'Automatic; generally generous.'
  },

  // Analytics
  {
    id: 'google-analytics',
    name: 'Google Analytics Data API',
    category: 'analytics',
    description: 'GA4 reporting API.',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    auth: { type: 'oauth2' },
    dataAccess: ['rest']
  }
];

export function findApiById(id: string) {
  return APIS.find(a => a.id === id);
}

export function getApisByCategory(category: string) {
  return APIS.filter(a => a.category === category);
}

