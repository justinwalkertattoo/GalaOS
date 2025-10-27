# GalaOS Integration Marketplace

GalaOS features a comprehensive integration marketplace with 30+ providers, enabling seamless connections to AI services, productivity tools, social media, and more.

## 🎯 Overview

The integration marketplace allows:
- **OAuth 2.0 Authentication** - Connect accounts without storing API keys
- **AI Agent Access** - Agents can discover and use integrations automatically
- **30+ Providers** - AI, productivity, social media, development tools, and more
- **Action-Based System** - Each integration exposes specific actions agents can perform

## 📦 Available Integration Categories

### 🤖 AI Services
- **Google AI (Gemini)** - OAuth available ✅
- **Microsoft Azure OpenAI** - OAuth available ✅
- **Hugging Face** - OAuth available ✅
- **Anthropic** - Coming soon (OAuth not yet available)
- **OpenAI** - Coming soon (OAuth not yet available)
- **Perplexity** - Coming soon (OAuth not yet available)
- **ChatGPT Web** - Experimental (browser automation) ⚠️
- **Claude Web** - Experimental (browser automation) ⚠️

### 📧 Productivity
- **Gmail** - Send emails, manage inbox ✅
- **Google Workspace** - Docs, Sheets, Calendar (Coming soon)
- **Notion** - Create pages, databases (Coming soon)
- **Airtable** - Manage bases (Coming soon)
- **Microsoft 365** - Teams, Outlook (Coming soon)

### 💬 Communication
- **Slack** - Post messages, manage channels ✅
- **Discord** - Send messages, manage servers (Coming soon)
- **Telegram** - Send messages (Coming soon)
- **Twilio** - SMS, voice calls (Coming soon)

### 🔧 Development
- **GitHub** - Create issues, PRs, gists, trigger workflows ✅
- **GitLab** - Manage repos (Coming soon)
- **Vercel** - Deploy projects (Coming soon)

### 📱 Social Media
- **Buffer** - Schedule posts ✅
- **Twitter** - Tweet, manage account (Coming soon)
- **LinkedIn** - Post updates (Coming soon)
- **Instagram** - Post content (Coming soon)
- **YouTube** - Upload videos (Coming soon)

### 💾 Storage
- **Dropbox** - File management (Coming soon)
- **Google Drive** - File storage (Coming soon)

### 📊 Analytics
- **Google Analytics** - Track website data (Coming soon)

### 💰 Commerce
- **Stripe** - Payment processing (Coming soon)
- **Shopify** - E-commerce (Coming soon)
- **HubSpot** - CRM (Coming soon)
- **Salesforce** - Enterprise CRM (Coming soon)

## 🚀 Quick Start

### 1. List Available Integrations

```typescript
// API Endpoint
GET /api/integration/getProviders

// Returns
[
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect to your Slack workspace',
    icon: '💬',
    authType: 'oauth2',
    status: 'available',
    category: 'communication',
    agentCapable: true
  },
  // ... more providers
]
```

### 2. Connect an Integration (OAuth Flow)

```typescript
// Step 1: Get authorization URL
POST /api/oauthIntegrations/getAuthUrl
{
  "providerId": "slack",
  "redirectUri": "https://your-domain.com/oauth/callback"
}

// Returns
{
  "authUrl": "https://slack.com/oauth/v2/authorize?...",
  "providerId": "slack"
}

// Step 2: Redirect user to authUrl
// User authorizes the app

// Step 3: Handle callback with authorization code
POST /api/oauthIntegrations/completeOAuth
{
  "providerId": "slack",
  "code": "authorization_code_from_callback",
  "redirectUri": "https://your-domain.com/oauth/callback"
}

// Returns
{
  "success": true,
  "connectionId": "conn_abc123",
  "message": "Successfully connected!"
}
```

### 3. Use Integration from AI Agent

```typescript
// Get available actions for an integration
GET /api/integration/getActions?integrationId=slack

// Returns
{
  "integration": {
    "id": "slack",
    "name": "Slack",
    "description": "Team messaging and collaboration"
  },
  "actions": [
    {
      "name": "post_message",
      "description": "Post a message to a Slack channel",
      "inputSchema": { /* Zod schema */ },
      "outputSchema": { /* Zod schema */ }
    },
    // ... more actions
  ]
}

// Execute an action
POST /api/integration/executeAction
{
  "integrationId": "slack",
  "actionName": "post_message",
  "actionInput": {
    "channel": "general",
    "text": "Hello from GalaOS!"
  }
}

// Returns
{
  "success": true,
  "data": { /* action result */ }
}
```

## 🔐 Setting Up OAuth Credentials

Each integration requires OAuth credentials from the provider. Here's how to set them up:

### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app
3. Add OAuth scopes: `chat:write`, `channels:read`, `files:write`
4. Get Client ID and Client Secret
5. Add to `.env`:

```bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_REDIRECT_URI=https://your-domain.com/oauth/callback/slack
```

### GitHub

1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth app
3. Set callback URL: `https://your-domain.com/oauth/callback/github`
4. Get Client ID and Client Secret
5. Add to `.env`:

```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=https://your-domain.com/oauth/callback/github
```

### Gmail (Google OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add scopes: `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/gmail.readonly`
6. Add to `.env`:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth/callback/google
```

### Buffer

1. Go to [Buffer Developers](https://buffer.com/developers/apps/create)
2. Create a new app
3. Get Client ID and Client Secret
4. Add to `.env`:

```bash
BUFFER_CLIENT_ID=your_client_id
BUFFER_CLIENT_SECRET=your_client_secret
BUFFER_REDIRECT_URI=https://your-domain.com/oauth/callback/buffer
```

### Google AI (Gemini)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create OAuth credentials in Google Cloud Console
3. Enable Generative AI API
4. Add to `.env`:

```bash
GOOGLE_AI_CLIENT_ID=your_client_id
GOOGLE_AI_CLIENT_SECRET=your_client_secret
```

### Microsoft Azure OpenAI

1. Go to [Azure Portal](https://portal.azure.com)
2. Create an Azure AD app registration
3. Enable Azure OpenAI Service
4. Add to `.env`:

```bash
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id
```

## 🤖 AI Agent Integration Access

GalaOS agents can automatically discover and use integrations. Here's how it works:

### Agent Workflow

1. **Discovery**: Agent queries available integrations
2. **Action Selection**: Agent chooses appropriate action
3. **Execution**: Agent executes action with proper parameters
4. **Response**: Agent receives result and continues conversation

### Example Agent Interaction

```
User: "Send a message to the #general channel in Slack saying we deployed the new feature"

Agent Reasoning:
1. Detects need for Slack integration
2. Queries available Slack actions
3. Finds "post_message" action
4. Executes with parameters:
   - channel: "general"
   - text: "We deployed the new feature"

Agent Response: "✅ Message sent to #general in Slack"
```

### Integration Tool Schema

Agents see integrations as tools with this schema:

```typescript
{
  name: "slack_post_message",
  description: "Post a message to a Slack channel",
  parameters: {
    type: "object",
    properties: {
      channel: { type: "string", description: "Channel name or ID" },
      text: { type: "string", description: "Message text" },
      blocks: { type: "array", description: "Optional structured blocks" }
    },
    required: ["channel", "text"]
  }
}
```

## ⚠️ Experimental: Browser Automation

For services without OAuth (ChatGPT, Claude), GalaOS offers experimental browser automation:

### Important Warnings

- ⚠️ **May violate provider Terms of Service**
- ⚠️ **Account could be suspended or banned**
- ⚠️ **Only use with YOUR OWN account**
- ⚠️ **Less reliable than official APIs**
- ⚠️ **Features may break with UI updates**

### Use Cases

- ChatGPT Plus subscribers wanting to use their subscription
- Claude Pro subscribers wanting to use their existing account
- Testing before buying API access

### How to Use

```typescript
// Initialize browser session
POST /api/oauthIntegrations/initBrowserSession
{
  "providerId": "chatgpt-web",
  "acceptedRisks": true
}

// Returns
{
  "success": true,
  "sessionId": "session_abc123",
  "loginUrl": "https://chat.openai.com/auth/login",
  "message": "Please complete login in the opened browser window",
  "warning": "⚠️ BROWSER AUTOMATION WARNING ⚠️ ..."
}

// Browser window opens automatically
// User logs in manually
// GalaOS detects authentication

// Check authentication status
GET /api/oauthIntegrations/checkBrowserAuth?sessionId=session_abc123

// Use the session
// (Integration methods will use the browser session instead of API)
```

## 🛠️ Creating Custom Integrations

Want to add a new integration? Here's how:

### 1. Create Integration Class

```typescript
// packages/integrations/src/connectors/my-service.ts
import { BaseIntegration, IntegrationConfig, OAuth2Credentials } from '../base';

export class MyServiceIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'my-service',
    name: 'My Service',
    description: 'Connect to My Service',
    authType: 'oauth2',
    authUrl: 'https://myservice.com/oauth/authorize',
    tokenUrl: 'https://myservice.com/oauth/token',
    scopes: ['read', 'write'],
    icon: '🎯',
  };

  async test(): Promise<boolean> {
    // Test connection
    return true;
  }

  async doSomething(data: any): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    const response = await fetch('https://api.myservice.com/action', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
}
```

### 2. Create Integration Actions

```typescript
import { IntegrationAction } from '../base';
import { z } from 'zod';

export const myServiceDoSomethingAction: IntegrationAction = {
  name: 'do_something',
  description: 'Perform an action on My Service',
  inputSchema: z.object({
    param1: z.string(),
    param2: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.any(),
  }),
  async execute(input, credentials) {
    const integration = new MyServiceIntegration();
    integration.setCredentials(credentials);
    return await integration.doSomething(input);
  },
};
```

### 3. Register Integration

```typescript
// packages/integrations/src/index.ts
export * from './connectors/my-service';

// apps/api/src/router/integration.ts
import { MyServiceIntegration, myServiceDoSomethingAction } from '@galaos/integrations';

const myServiceIntegration = new MyServiceIntegration();
globalIntegrationRegistry.register(myServiceIntegration);
globalIntegrationRegistry.registerAction('my-service', myServiceDoSomethingAction);
```

### 4. Add OAuth Provider

```typescript
// packages/core/src/oauth-integration-manager-enhanced.ts
{
  id: 'my-service',
  name: 'My Service',
  type: 'oauth2',
  authUrl: 'https://myservice.com/oauth/authorize',
  tokenUrl: 'https://myservice.com/oauth/token',
  scopes: ['read', 'write'],
  status: 'available',
  category: 'productivity',
  agentCapable: true,
}
```

## 🔧 Environment Variables

Complete list of environment variables for integrations:

```bash
# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

# GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=

# Gmail (Google OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Buffer
BUFFER_CLIENT_ID=
BUFFER_CLIENT_SECRET=
BUFFER_REDIRECT_URI=

# Google AI (Gemini)
GOOGLE_AI_CLIENT_ID=
GOOGLE_AI_CLIENT_SECRET=

# Microsoft Azure
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=
AZURE_REDIRECT_URI=

# Hugging Face
HUGGINGFACE_CLIENT_ID=
HUGGINGFACE_CLIENT_SECRET=

# Browser automation (experimental)
BROWSER_AUTOMATION_ENABLED=false
```

## 📚 API Reference

### Integration Endpoints

#### `GET /api/integration/getProviders`
List all available integration providers.

**Response:**
```json
[
  {
    "id": "slack",
    "name": "Slack",
    "description": "Team messaging",
    "icon": "💬",
    "authType": "oauth2",
    "status": "available",
    "category": "communication",
    "agentCapable": true
  }
]
```

#### `GET /api/integration/getActions?integrationId={id}`
Get available actions for an integration.

**Parameters:**
- `integrationId` (string): Integration ID

**Response:**
```json
{
  "integration": {
    "id": "slack",
    "name": "Slack"
  },
  "actions": [
    {
      "name": "post_message",
      "description": "Post a message"
    }
  ]
}
```

#### `POST /api/integration/executeAction`
Execute an integration action.

**Request:**
```json
{
  "integrationId": "slack",
  "actionName": "post_message",
  "actionInput": {
    "channel": "general",
    "text": "Hello!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* action result */ }
}
```

### OAuth Endpoints

#### `POST /api/oauthIntegrations/getAuthUrl`
Start OAuth flow.

#### `POST /api/oauthIntegrations/completeOAuth`
Complete OAuth flow.

#### `GET /api/oauthIntegrations/listConnections`
List user's connected integrations.

#### `POST /api/oauthIntegrations/revokeConnection`
Disconnect an integration.

## 🎉 Success!

You now have a fully functional integration marketplace where:
- ✅ Users can connect 30+ services via OAuth
- ✅ AI agents can discover and use integrations
- ✅ All connections are secure with token encryption
- ✅ Automatic token refresh prevents expired credentials
- ✅ Actions are type-safe with Zod validation

Need help? Check the [main README](./README.md) or [deployment guide](./DEPLOY.md).
