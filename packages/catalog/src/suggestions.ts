import { SuggestionEntry } from './types';

export const SUGGESTIONS: SuggestionEntry[] = [
  {
    id: 'rag-vector-path',
    title: 'Vector Store Path: Qdrant (self-host) + pgvector fallback',
    rationale:
      'Qdrant offers solid open-source performance; pgvector provides low-ops fallback using existing Postgres. Good for phased rollout and portability.',
    relatedSdkIds: ['qdrant-js', 'pgvector-prisma'],
    whenToUse: 'When enabling search/RAG features incrementally.'
  },
  {
    id: 'oauth-foundation',
    title: 'Unify OAuth/OIDC via openid-client',
    rationale:
      'A robust OAuth/OIDC layer simplifies provider sprawl and reduces footguns vs. bespoke flows.',
    relatedSdkIds: ['openid-client'],
    relatedApiIds: ['slack', 'google-workspace', 'github'],
    whenToUse: 'As soon as multiple OAuth providers are needed.'
  },
  {
    id: 'observability-depth',
    title: 'Enrich OTEL with instrumentation for HTTP/Express/Redis/Prisma',
    rationale:
      'You already use NodeSDK; adding targeted instrumentations increases visibility with low friction.',
    relatedSdkIds: ['otel-instrumentations'],
    whenToUse: 'Before scaling traffic or adding more queues.'
  },
  {
    id: 'media-tooling',
    title: 'Image/PDF pipeline with sharp + pdf-lib',
    rationale:
      'Supports social/portfolio workflows: thumbnailing, compression, and PDF exports.',
    relatedSdkIds: ['sharp', 'pdf-lib'],
    whenToUse: 'When rolling out media-heavy automations.'
  },
  {
    id: 'email-transport',
    title: 'Add transactional email via SendGrid or Resend',
    rationale:
      'Notifications, approvals, and human-in-the-loop flows need reliable email delivery.',
    relatedSdkIds: ['sendgrid-mail', 'resend'],
    whenToUse: 'Alongside workflow approvals and status digests.'
  },
  {
    id: 'desktop-updates',
    title: 'Electron auto-updates for Desktop app',
    rationale:
      'Smooth distribution and updates reduce support overhead for desktop users.',
    relatedSdkIds: ['electron-updater'],
    whenToUse: 'Before public desktop distribution.'
  }
];

