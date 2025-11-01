export type SdkCategory =
  | 'ai'
  | 'oauth'
  | 'integrations'
  | 'vector'
  | 'storage'
  | 'observability'
  | 'media'
  | 'email'
  | 'workflow'
  | 'desktop'
  | 'realtime'
  | 'testing'
  | 'editor'
  | 'ui';

export interface SDKEntry {
  id: string; // kebab-case unique id
  name: string;
  category: SdkCategory;
  npm?: string; // package name when applicable
  languages?: string[];
  license?: string; // SPDX if known
  docsUrl?: string;
  sourceUrl?: string;
  description: string;
  maturity?: 'incubating' | 'stable' | 'enterprise';
  tags?: string[];
}

export interface LicenseEntry {
  spdx: string;
  name: string;
  osiApproved: boolean;
  copyleft: boolean;
  permissive: boolean;
  link: string;
  summary: string;
  notes?: string;
  compatibility?: string[]; // e.g., ["MIT", "Apache-2.0"]
}

export type ApiCategory =
  | 'ai'
  | 'communication'
  | 'productivity'
  | 'development'
  | 'social'
  | 'storage'
  | 'commerce'
  | 'analytics';

export interface ApiAuth {
  type: 'oauth2' | 'apiKey' | 'none';
  docsUrl?: string;
  scopesExample?: string[];
}

export interface ApiSdkRef { id: string; note?: string }

export interface APIProviderEntry {
  id: string; // kebab-case
  name: string;
  category: ApiCategory;
  description: string;
  baseUrl?: string;
  docsUrl: string;
  auth: ApiAuth;
  sdks?: ApiSdkRef[]; // reference into SDKS by id
  dataAccess: Array<'rest' | 'graphql' | 'webhooks' | 'events' | 'realtime'>;
  rateLimits?: string; // human-readable summary
  notes?: string;
}

export interface SuggestionEntry {
  id: string;
  title: string;
  rationale: string;
  relatedSdkIds?: string[];
  relatedApiIds?: string[];
  whenToUse?: string; // short guideline
}

