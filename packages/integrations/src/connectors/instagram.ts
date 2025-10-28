import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

export class InstagramIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'instagram',
    name: 'Instagram',
    description: 'Post photos and videos to Instagram',
    authType: 'oauth2',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media'],
    icon: '📸',
  };

  async test(): Promise<boolean> {
    try {
      const result = await this.getProfile();
      return !!result.id;
    } catch {
      return false;
    }
  }

  async getProfile(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${creds.accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async createMediaPost(data: {
    imageUrl: string;
    caption: string;
    userId: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.instagram.com/${data.userId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: data.imageUrl,
          caption: data.caption,
          access_token: creds.accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      throw new Error(`Failed to create media container: ${containerResponse.statusText}`);
    }

    const { id: containerId } = await containerResponse.json() as any;

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.instagram.com/${data.userId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: creds.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      throw new Error(`Failed to publish media: ${publishResponse.statusText}`);
    }

    return await publishResponse.json();
  }

  async createCarouselPost(data: {
    images: string[];
    caption: string;
    userId: string;
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    // Create containers for each image
    const containerIds = await Promise.all(
      data.images.map(async (imageUrl) => {
        const response = await fetch(
          `https://graph.instagram.com/${data.userId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: imageUrl,
              is_carousel_item: true,
              access_token: creds.accessToken,
            }),
          }
        );

        const { id } = await response.json() as any;
        return id;
      })
    );

    // Create carousel container
    const carouselResponse = await fetch(
      `https://graph.instagram.com/${data.userId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: containerIds,
          caption: data.caption,
          access_token: creds.accessToken,
        }),
      }
    );

    const { id: carouselId } = await carouselResponse.json() as any;

    // Publish carousel
    const publishResponse = await fetch(
      `https://graph.instagram.com/${data.userId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: carouselId,
          access_token: creds.accessToken,
        }),
      }
    );

    return await publishResponse.json();
  }
}

// Instagram Actions
export const instagramCreatePostAction: IntegrationAction = {
  name: 'create_post',
  description: 'Create a single image post on Instagram',
  inputSchema: z.object({
    imageUrl: z.string().url(),
    caption: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    id: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new InstagramIntegration();
    integration.setCredentials(credentials);
    return await integration.createMediaPost(input);
  },
};

export const instagramCreateCarouselAction: IntegrationAction = {
  name: 'create_carousel',
  description: 'Create a carousel post with multiple images on Instagram',
  inputSchema: z.object({
    images: z.array(z.string().url()),
    caption: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    id: z.string(),
  }),
  async execute(input, credentials) {
    const integration = new InstagramIntegration();
    integration.setCredentials(credentials);
    return await integration.createCarouselPost(input);
  },
};
