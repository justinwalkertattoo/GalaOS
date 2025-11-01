import { SDKEntry } from './types';

export const SDKS: SDKEntry[] = [
  // AI
  {
    id: 'anthropic-sdk',
    name: 'Anthropic SDK',
    category: 'ai',
    npm: '@anthropic-ai/sdk',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://docs.anthropic.com/',
    sourceUrl: 'https://github.com/anthropics/anthropic-sdk-typescript',
    description: 'Claude API client with messages and tools.',
    maturity: 'stable',
    tags: ['claude', 'tool-use']
  },
  {
    id: 'openai-sdk',
    name: 'OpenAI SDK',
    category: 'ai',
    npm: 'openai',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://platform.openai.com/docs',
    sourceUrl: 'https://github.com/openai/openai-node',
    description: 'Chat Completions, Assistants, and vector features.',
    maturity: 'stable',
    tags: ['gpt', 'functions']
  },
  {
    id: 'google-generative-ai',
    name: 'Google Generative AI',
    category: 'ai',
    npm: '@google/generative-ai',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://ai.google.dev/',
    sourceUrl: 'https://github.com/google/generative-ai-js',
    description: 'Gemini models with text, vision, and tools.',
    maturity: 'stable',
    tags: ['gemini']
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    category: 'ai',
    npm: '@azure/openai',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
    sourceUrl: 'https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/openai',
    description: 'Azure-hosted OpenAI with enterprise controls.',
    maturity: 'enterprise',
    tags: ['azure', 'enterprise']
  },
  {
    id: 'mistral-sdk',
    name: 'Mistral SDK',
    category: 'ai',
    npm: '@mistralai/mistralai',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://docs.mistral.ai/',
    sourceUrl: 'https://github.com/mistralai/client-js',
    description: 'Mistral models and endpoints.',
    maturity: 'stable'
  },
  {
    id: 'cohere-sdk',
    name: 'Cohere SDK',
    category: 'ai',
    npm: 'cohere-ai',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://docs.cohere.com/',
    sourceUrl: 'https://github.com/cohere-ai/cohere-js',
    description: 'Command models, embeddings, RAG tools.',
    maturity: 'stable'
  },

  // Vector / RAG
  {
    id: 'pinecone-js',
    name: 'Pinecone JS',
    category: 'vector',
    npm: '@pinecone-database/pinecone',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://docs.pinecone.io/',
    sourceUrl: 'https://github.com/pinecone-io/pinecone-ts-client',
    description: 'Managed vector DB service.',
    maturity: 'stable'
  },
  {
    id: 'qdrant-js',
    name: 'Qdrant JS',
    category: 'vector',
    npm: '@qdrant/js-client-rest',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://qdrant.tech/documentation/',
    sourceUrl: 'https://github.com/qdrant/qdrant-js',
    description: 'Open-source vector DB with REST/GRPC.',
    maturity: 'stable'
  },
  {
    id: 'pgvector-prisma',
    name: 'Prisma pgvector Extension',
    category: 'vector',
    npm: '@prisma/extension-pgvector',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://www.prisma.io/docs/orm/advanced/pgvector',
    sourceUrl: 'https://github.com/prisma/prisma-client-extensions',
    description: 'Vector embeddings in Postgres via pgvector.',
    maturity: 'stable'
  },

  // OAuth / Integrations
  {
    id: 'openid-client',
    name: 'openid-client',
    category: 'oauth',
    npm: 'openid-client',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://github.com/panva/node-openid-client',
    sourceUrl: 'https://github.com/panva/node-openid-client',
    description: 'Robust OAuth2/OIDC client for Node.',
    maturity: 'enterprise',
    tags: ['oauth2', 'oidc']
  },
  {
    id: 'googleapis',
    name: 'googleapis',
    category: 'integrations',
    npm: 'googleapis',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://github.com/googleapis/google-api-nodejs-client',
    sourceUrl: 'https://github.com/googleapis/google-api-nodejs-client',
    description: 'Gmail, Drive, Calendar, and more.',
    maturity: 'enterprise'
  },
  {
    id: 'slack-web-api',
    name: 'Slack Web API',
    category: 'integrations',
    npm: '@slack/web-api',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://api.slack.com/web',
    sourceUrl: 'https://github.com/slackapi/node-slack-sdk',
    description: 'Slack REST/RTM clients.',
    maturity: 'stable'
  },
  {
    id: 'notion-sdk',
    name: 'Notion SDK',
    category: 'integrations',
    npm: '@notionhq/client',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://developers.notion.com/',
    sourceUrl: 'https://github.com/makenotion/notion-sdk-js',
    description: 'Pages, databases, and search.',
    maturity: 'stable'
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'integrations',
    npm: 'airtable',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://airtable.com/api',
    sourceUrl: 'https://github.com/Airtable/airtable.js',
    description: 'Airtable API client.',
    maturity: 'stable'
  },

  // Storage
  {
    id: 'aws-sdk-s3',
    name: 'AWS SDK S3 Client',
    category: 'storage',
    npm: '@aws-sdk/client-s3',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/',
    sourceUrl: 'https://github.com/aws/aws-sdk-js-v3',
    description: 'S3-compatible object storage.',
    maturity: 'enterprise'
  },
  {
    id: 'minio',
    name: 'MinIO JS SDK',
    category: 'storage',
    npm: 'minio',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html',
    sourceUrl: 'https://github.com/minio/minio-js',
    description: 'Self-hosted S3-compatible storage.',
    maturity: 'stable'
  },

  // Observability
  {
    id: 'otel-instrumentations',
    name: 'OpenTelemetry Instrumentations',
    category: 'observability',
    npm: '@opentelemetry/instrumentation',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://opentelemetry.io/docs/instrumentation/js/',
    sourceUrl: 'https://github.com/open-telemetry/opentelemetry-js-contrib',
    description: 'HTTP, Express, ioredis, Prisma, etc.',
    maturity: 'stable'
  },

  // Media / PDF
  {
    id: 'sharp',
    name: 'sharp',
    category: 'media',
    npm: 'sharp',
    languages: ['TypeScript', 'JS'],
    license: 'Apache-2.0',
    docsUrl: 'https://sharp.pixelplumbing.com/',
    sourceUrl: 'https://github.com/lovell/sharp',
    description: 'Fast image processing.',
    maturity: 'stable'
  },
  {
    id: 'pdf-lib',
    name: 'pdf-lib',
    category: 'media',
    npm: 'pdf-lib',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://pdf-lib.js.org/',
    sourceUrl: 'https://github.com/Hopding/pdf-lib',
    description: 'Create/modify PDFs in Node/Browser.',
    maturity: 'stable'
  },

  // Email
  {
    id: 'sendgrid-mail',
    name: 'SendGrid Mail',
    category: 'email',
    npm: '@sendgrid/mail',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://docs.sendgrid.com/api-reference/',
    sourceUrl: 'https://github.com/sendgrid/sendgrid-nodejs',
    description: 'Transactional email API.',
    maturity: 'stable'
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'email',
    npm: 'resend',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://resend.com/docs',
    sourceUrl: 'https://github.com/resendlabs/resend-node',
    description: 'Email API with templates.',
    maturity: 'stable'
  },

  // Workflow / Jobs
  {
    id: 'temporalio',
    name: 'temporalio',
    category: 'workflow',
    npm: 'temporalio',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://docs.temporal.io/',
    sourceUrl: 'https://github.com/temporalio/sdk-typescript',
    description: 'Durable workflows, human-in-the-loop.',
    maturity: 'enterprise'
  },

  // Desktop
  {
    id: 'electron-updater',
    name: 'electron-updater',
    category: 'desktop',
    npm: 'electron-updater',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://www.electron.build/auto-update',
    sourceUrl: 'https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater',
    description: 'Auto-update for Electron apps.',
    maturity: 'stable'
  },

  // Realtime
  {
    id: 'ws',
    name: 'ws',
    category: 'realtime',
    npm: 'ws',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://github.com/websockets/ws',
    sourceUrl: 'https://github.com/websockets/ws',
    description: 'WebSocket server/client.',
    maturity: 'stable'
  },

  // Editors / UI
  {
    id: 'tiptap',
    name: 'Tiptap',
    category: 'editor',
    npm: '@tiptap/core',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://tiptap.dev/',
    sourceUrl: 'https://github.com/ueberdosis/tiptap',
    description: 'Rich-text editor for React.',
    maturity: 'stable'
  },
  {
    id: 'react-flow',
    name: 'React Flow',
    category: 'ui',
    npm: 'reactflow',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://reactflow.dev/',
    sourceUrl: 'https://github.com/wbkd/react-flow',
    description: 'Node-based graphs for workflow builders.',
    maturity: 'stable'
  },
  {
    id: 'radix-ui',
    name: 'Radix UI',
    category: 'ui',
    npm: '@radix-ui/react-primitive',
    languages: ['TypeScript', 'JS'],
    license: 'MIT',
    docsUrl: 'https://www.radix-ui.com/primitives',
    sourceUrl: 'https://github.com/radix-ui/primitives',
    description: 'Accessible, unstyled primitives.',
    maturity: 'stable'
  }
];

export function getSdkById(id: string) {
  return SDKS.find(s => s.id === id);
}

export function getSdkCategories(): string[] {
  return Array.from(new Set(SDKS.map(s => s.category)));
}

