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

  /**
   * Search for AI model repositories
   */
  async searchModelRepos(data: {
    query: string;
    sort?: 'stars' | 'updated' | 'forks';
    order?: 'asc' | 'desc';
    perPage?: number;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // Build search query with AI/ML related terms
    const searchTerms = [
      data.query,
      'machine-learning OR deep-learning OR artificial-intelligence OR neural-network',
      'language:Python OR language:Jupyter-Notebook',
    ].join(' ');

    const params = new URLSearchParams({
      q: searchTerms,
      sort: data.sort || 'stars',
      order: data.order || 'desc',
      per_page: String(data.perPage || 30),
    });

    const response = await fetch(
      `https://api.github.com/search/repositories?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get repository details including README
   */
  async getRepoDetails(data: { owner: string; repo: string }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const [repo, readme] = await Promise.all([
      fetch(`https://api.github.com/repos/${data.owner}/${data.repo}`, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.github.com/repos/${data.owner}/${data.repo}/readme`, {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      }).then((r) => (r.ok ? r.text() : null)),
    ]);

    return {
      ...repo,
      readme,
    };
  }

  /**
   * Get repository contents
   */
  async getContents(data: {
    owner: string;
    repo: string;
    path?: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const path = data.path ? `/${data.path}` : '';
    const response = await fetch(
      `https://api.github.com/repos/${data.owner}/${data.repo}/contents${path}`,
      {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Clone repository locally
   */
  async cloneRepo(data: {
    owner: string;
    repo: string;
    targetPath: string;
  }): Promise<{ success: boolean; path: string }> {
    // This would typically be handled by a worker or background job
    // For now, return the clone URL
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    return {
      success: true,
      path: `https://github.com/${data.owner}/${data.repo}.git`,
    };
  }

  /**
   * Get trending repositories (AI/ML focus)
   */
  async getTrendingModelRepos(data?: {
    language?: string;
    since?: 'daily' | 'weekly' | 'monthly';
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // GitHub doesn't have a trending API, so we search for recently starred AI repos
    const dateRange = this.getDateRange(data?.since || 'weekly');
    const query = `stars:>100 created:>${dateRange} topic:machine-learning OR topic:deep-learning OR topic:artificial-intelligence`;

    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: '30',
    });

    const response = await fetch(
      `https://api.github.com/search/repositories?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private getDateRange(period: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
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

export const githubSearchModelReposAction: IntegrationAction = {
  name: 'search_model_repos',
  description: 'Search for AI/ML model repositories on GitHub',
  inputSchema: z.object({
    query: z.string(),
    sort: z.enum(['stars', 'updated', 'forks']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    perPage: z.number().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.searchModelRepos(input);
  },
};

export const githubGetRepoDetailsAction: IntegrationAction = {
  name: 'get_repo_details',
  description: 'Get detailed information about a repository including README',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.getRepoDetails(input);
  },
};

export const githubGetContentsAction: IntegrationAction = {
  name: 'get_contents',
  description: 'Get contents of a file or directory in a repository',
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
    path: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.getContents(input);
  },
};

export const githubGetTrendingModelReposAction: IntegrationAction = {
  name: 'get_trending_model_repos',
  description: 'Get trending AI/ML repositories',
  inputSchema: z.object({
    language: z.string().optional(),
    since: z.enum(['daily', 'weekly', 'monthly']).optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new GitHubIntegration();
    integration.setCredentials(credentials);
    return await integration.getTrendingModelRepos(input);
  },
};
