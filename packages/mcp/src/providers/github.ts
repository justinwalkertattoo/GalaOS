import { Octokit } from '@octokit/rest';
import { GitHubResource, GitHubResourceType } from '../types';

/**
 * GitHub Provider
 * Integrates with GitHub for repositories, gists, and tools
 */
export class GitHubProvider {
  private octokit: Octokit;

  constructor(authToken?: string) {
    this.octokit = new Octokit({
      auth: authToken,
    });
  }

  /**
   * Search repositories
   */
  async searchRepositories(options: {
    query: string;
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }): Promise<GitHubResource[]> {
    try {
      const response = await this.octokit.search.repos({
        q: options.query,
        sort: options.sort,
        order: options.order,
        per_page: options.perPage || 30,
        page: options.page || 1,
      });

      return response.data.items.map((repo) => ({
        id: String(repo.id),
        name: repo.name,
        type: 'repository' as GitHubResourceType,
        owner: repo.owner?.login || 'unknown',
        description: repo.description || undefined,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || undefined,
        topics: repo.topics || [],
        private: repo.private,
      }));
    } catch (error) {
      console.error('Failed to search GitHub repositories:', error);
      throw error;
    }
  }

  /**
   * Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubResource> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });

      const data = response.data;
      return {
        id: String(data.id),
        name: data.name,
        type: 'repository' as GitHubResourceType,
        owner: data.owner.login,
        description: data.description || undefined,
        url: data.html_url,
        stars: data.stargazers_count,
        language: data.language || undefined,
        topics: data.topics || [],
        private: data.private,
      };
    } catch (error) {
      console.error('Failed to get GitHub repository:', error);
      throw error;
    }
  }

  /**
   * List user repositories
   */
  async listUserRepositories(username: string, options?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }): Promise<GitHubResource[]> {
    try {
      const response = await this.octokit.repos.listForUser({
        username,
        type: options?.type,
        sort: options?.sort,
        direction: options?.direction,
        per_page: options?.perPage || 30,
        page: options?.page || 1,
      });

      return response.data.map((repo) => ({
        id: String(repo.id),
        name: repo.name,
        type: 'repository' as GitHubResourceType,
        owner: repo.owner?.login || 'unknown',
        description: repo.description || undefined,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || undefined,
        topics: repo.topics || [],
        private: repo.private,
      }));
    } catch (error) {
      console.error('Failed to list user repositories:', error);
      throw error;
    }
  }

  /**
   * Get repository contents
   */
  async getContents(owner: string, repo: string, path: string = ''): Promise<any> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get repository contents:', error);
      throw error;
    }
  }

  /**
   * Read file contents from repository
   */
  async readFile(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      const data: any = response.data;
      if (data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return content;
    } catch (error) {
      console.error('Failed to read file from GitHub:', error);
      throw error;
    }
  }

  /**
   * Search code in repositories
   */
  async searchCode(options: {
    query: string;
    sort?: 'indexed';
    order?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }): Promise<any[]> {
    try {
      const response = await this.octokit.search.code({
        q: options.query,
        sort: options.sort,
        order: options.order,
        per_page: options.perPage || 30,
        page: options.page || 1,
      });

      return response.data.items;
    } catch (error) {
      console.error('Failed to search GitHub code:', error);
      throw error;
    }
  }

  /**
   * List gists for a user
   */
  async listGists(username?: string, options?: {
    since?: string;
    perPage?: number;
    page?: number;
  }): Promise<GitHubResource[]> {
    try {
      const response = username
        ? await this.octokit.gists.listForUser({
            username,
            since: options?.since,
            per_page: options?.perPage || 30,
            page: options?.page || 1,
          })
        : await this.octokit.gists.list({
            since: options?.since,
            per_page: options?.perPage || 30,
            page: options?.page || 1,
          });

      return response.data.map((gist) => ({
        id: gist.id,
        name: gist.description || 'Untitled',
        type: 'gist' as GitHubResourceType,
        owner: gist.owner?.login || 'anonymous',
        description: gist.description || undefined,
        url: gist.html_url,
        private: !gist.public,
      }));
    } catch (error) {
      console.error('Failed to list GitHub gists:', error);
      throw error;
    }
  }

  /**
   * Get gist details
   */
  async getGist(gistId: string): Promise<any> {
    try {
      const response = await this.octokit.gists.get({
        gist_id: gistId,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get GitHub gist:', error);
      throw error;
    }
  }

  /**
   * Search GitHub Actions
   */
  async searchActions(query: string): Promise<GitHubResource[]> {
    try {
      const response = await this.octokit.search.repos({
        q: `${query} topic:github-actions`,
        per_page: 30,
      });

      return response.data.items.map((repo) => ({
        id: String(repo.id),
        name: repo.name,
        type: 'action' as GitHubResourceType,
        owner: repo.owner?.login || 'unknown',
        description: repo.description || undefined,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || undefined,
        topics: repo.topics || [],
        private: repo.private,
      }));
    } catch (error) {
      console.error('Failed to search GitHub Actions:', error);
      throw error;
    }
  }

  /**
   * Clone repository (returns clone URL)
   */
  getCloneUrl(owner: string, repo: string, useSSH: boolean = false): string {
    return useSSH
      ? `git@github.com:${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;
  }

  /**
   * Get repository releases
   */
  async listReleases(owner: string, repo: string, options?: {
    perPage?: number;
    page?: number;
  }): Promise<any[]> {
    try {
      const response = await this.octokit.repos.listReleases({
        owner,
        repo,
        per_page: options?.perPage || 30,
        page: options?.page || 1,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to list GitHub releases:', error);
      throw error;
    }
  }

  /**
   * Get latest release
   */
  async getLatestRelease(owner: string, repo: string): Promise<any> {
    try {
      const response = await this.octokit.repos.getLatestRelease({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get latest GitHub release:', error);
      throw error;
    }
  }

  /**
   * Download release asset
   */
  async downloadReleaseAsset(owner: string, repo: string, assetId: number): Promise<ArrayBuffer> {
    try {
      const response = await this.octokit.repos.getReleaseAsset({
        owner,
        repo,
        asset_id: assetId,
        headers: {
          accept: 'application/octet-stream',
        },
      });

      return response.data as any;
    } catch (error) {
      console.error('Failed to download GitHub release asset:', error);
      throw error;
    }
  }

  /**
   * Get repository topics (tags)
   */
  async getTopics(owner: string, repo: string): Promise<string[]> {
    try {
      const response = await this.octokit.repos.getAllTopics({
        owner,
        repo,
      });

      return response.data.names;
    } catch (error) {
      console.error('Failed to get repository topics:', error);
      throw error;
    }
  }

  /**
   * Get repository languages
   */
  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await this.octokit.repos.listLanguages({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error('Failed to get repository languages:', error);
      throw error;
    }
  }
}
