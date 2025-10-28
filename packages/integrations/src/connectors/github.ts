import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class GitHubIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'github',
    name: 'GitHub',
    description: 'Code hosting and collaboration platform',
    authType: 'oauth2',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'workflow', 'admin:org', 'user', 'gist'],
    icon: '🐙',
  };

  async test(): Promise<boolean> {
    try {
      const result = await this.getUser();
      return !!result.login;
    } catch {
      return false;
    }
  }

  async getUser(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async createIssue(data: {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          labels: data.labels,
          assignees: data.assignees,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async createPullRequest(data: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          head: data.head,
          base: data.base,
          body: data.body,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async createGist(data: {
    description?: string;
    files: Record<string, { content: string }>;
    public?: boolean;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: data.description,
        files: data.files,
        public: data.public ?? false,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async listRepositories(data?: { type?: string; sort?: string }): Promise<any[]> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams({
      type: data?.type || 'owner',
      sort: data?.sort || 'updated',
    });

    const response = await fetch(`https://api.github.com/user/repos?${params}`, {
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json() as any;
  }

  async triggerWorkflow(data: {
    owner: string;
    repo: string;
    workflowId: string;
    ref: string;
    inputs?: Record<string, any>;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/actions/workflows/${data.workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: data.ref,
          inputs: data.inputs,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return { success: true, status: response.status };
  }
}

// GitHub Actions
export const githubCreateIssueAction: IntegrationAction = {
  name: 'create_issue',
  description: 'Create a new GitHub issue',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
    labels: z.array(z.string()).optional(),
    assignees: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.createIssue(input);
  },
};

export const githubCreatePRAction: IntegrationAction = {
  name: 'create_pull_request',
  description: 'Create a new pull request',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    head: z.string(),
    base: z.string(),
    body: z.string().optional(),
  }),
  outputSchema: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.createPullRequest(input);
  },
};

export const githubCreateGistAction: IntegrationAction = {
  name: 'create_gist',
  description: 'Create a new Gist (code snippet)',
  inputSchema: z.object({
    description: z.string().optional(),
    files: z.record(z.object({ content: z.string() })),
    public: z.boolean().optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    html_url: z.string(),
    files: z.record(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.createGist(input);
  },
};

export const githubListReposAction: IntegrationAction = {
  name: 'list_repositories',
  description: 'List user repositories',
  inputSchema: z.object({
    type: z.string().optional(),
    sort: z.string().optional(),
  }),
  outputSchema: z.array(z.any()),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.listRepositories(input);
  },
};

export const githubTriggerWorkflowAction: IntegrationAction = {
  name: 'trigger_workflow',
  description: 'Trigger a GitHub Actions workflow',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    workflowId: z.string(),
    ref: z.string(),
    inputs: z.record(z.any()).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.number(),
  }),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.triggerWorkflow(input);
  },
};
