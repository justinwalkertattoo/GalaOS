# Cost Optimization Guide

GalaOS includes comprehensive cost management and optimization features to help you control AI API expenses while maintaining functionality through intelligent fallbacks.

## Table of Contents

- [API Usage Quotas](#api-usage-quotas)
- [Cost Tracking](#cost-tracking)
- [Budget Alerts](#budget-alerts)
- [Model Provider Fallback](#model-provider-fallback)
- [Open Source Models](#open-source-models)
- [Best Practices](#best-practices)

## API Usage Quotas

### Setting Up Quotas

Control spending by setting daily and monthly limits for each AI provider:

```typescript
import { ApiUsageTracker } from '@galaos/core/src/api-usage-tracker';

const tracker = new ApiUsageTracker();

// Set quota for OpenAI
await tracker.setQuota(userId, 'openai', {
  dailyLimit: 1000,              // Max 1000 requests/day
  monthlyLimit: 20000,            // Max 20k requests/month
  dailyCostLimit: 50,             // Max $50/day
  monthlyCostLimit: 1000,         // Max $1000/month
  dailyTokenLimit: 1000000,       // Max 1M tokens/day
  monthlyTokenLimit: 20000000,    // Max 20M tokens/month
  alertOnThreshold: 0.8,          // Alert at 80% usage
});

// Set quota for Anthropic
await tracker.setQuota(userId, 'anthropic', {
  dailyCostLimit: 30,
  monthlyCostLimit: 500,
});
```

### Checking Quota Status

```typescript
// Check if user can make a request
const quota = await tracker.checkQuota(userId, 'openai');

if (!quota.allowed) {
  console.log(quota.reason); // "Daily cost limit reached ($50)"
  console.log(quota.currentUsage); // Current usage stats
  console.log(quota.limits); // Configured limits
}
```

### Quota Types

1. **Request Limits**: Maximum number of API calls per period
2. **Cost Limits**: Maximum dollar amount spent per period
3. **Token Limits**: Maximum tokens consumed per period

All limits support daily and monthly tracking with automatic resets.

## Cost Tracking

### Automatic Usage Logging

Every API call is automatically tracked with detailed metrics:

```typescript
// Usage is tracked automatically after each request
await tracker.trackUsage(userId, {
  provider: 'anthropic',
  model: 'claude-3-sonnet',
  promptTokens: 500,
  completionTokens: 1000,
  totalTokens: 1500,
  endpoint: 'messages',
  duration: 2500,
  statusCode: 200,
  agentId: 'agent-123',
  workflowId: 'workflow-456',
});
```

### Viewing Usage Statistics

```typescript
// Get detailed usage stats
const stats = await tracker.getUsageStats(userId, 'anthropic');

console.log(stats.quotas);      // Current quota status
console.log(stats.recentLogs);  // Last 100 API calls
console.log(stats.alerts);      // Active cost alerts
```

### Cost Breakdown

Built-in pricing for major providers (updated as of 2024):

| Provider | Model | Input Cost | Output Cost |
|----------|-------|------------|-------------|
| OpenAI | GPT-4 Turbo | $10/1M | $30/1M |
| OpenAI | GPT-3.5 Turbo | $0.50/1M | $1.50/1M |
| Anthropic | Claude 3 Opus | $15/1M | $75/1M |
| Anthropic | Claude 3 Sonnet | $3/1M | $15/1M |
| Anthropic | Claude 3 Haiku | $0.25/1M | $1.25/1M |
| Gemini | Gemini Pro | $0.50/1M | $1.50/1M |
| Hugging Face | Most models | $0 | $0 |

## Budget Alerts

### Automatic Alert Generation

Alerts are automatically created when usage approaches limits:

```typescript
// Alerts created at 80% (warning) and 95% (critical) thresholds
// View active alerts
const stats = await tracker.getUsageStats(userId);

stats.alerts.forEach(alert => {
  console.log(alert.severity);   // 'warning' or 'critical'
  console.log(alert.provider);   // 'openai', 'anthropic', etc.
  console.log(alert.alertType);  // 'daily_cost', 'monthly_limit', etc.
  console.log(alert.message);    // Human-readable message
  console.log(alert.currentValue); // Current usage/cost
});
```

### Alert Types

- **daily_limit**: Daily request limit approaching
- **monthly_limit**: Monthly request limit approaching
- **daily_cost**: Daily cost limit approaching
- **monthly_cost**: Monthly cost limit approaching
- **daily_tokens**: Daily token limit approaching
- **monthly_tokens**: Monthly token limit approaching

### Webhook Notifications (Coming Soon)

```typescript
// Configure webhook for real-time alerts
await alertManager.setWebhook(userId, {
  url: 'https://your-app.com/webhooks/cost-alerts',
  events: ['cost_alert', 'quota_exceeded'],
});
```

## Model Provider Fallback

### Automatic Fallback Chain

When API quotas are exceeded, GalaOS automatically falls back to more cost-effective alternatives:

**Fallback Priority:**
1. **Claude 3 Sonnet** ($3/1M) - Premium quality
2. **GPT-4 Turbo** ($10/1M) - Alternative premium
3. **Claude 3 Haiku** ($0.25/1M) - Fast & affordable
4. **GPT-3.5 Turbo** ($0.50/1M) - Good balance
5. **Gemini Pro** ($0.50/1M) - Google alternative
6. **Mistral 7B** (FREE) - Hugging Face hosted
7. **Llama 2 7B** (FREE) - Hugging Face hosted
8. **Local Ollama** (FREE) - Self-hosted

### Using Fallback System

```typescript
import { ModelProviderFallback } from '@galaos/ai/src/model-provider-fallback';

const fallback = new ModelProviderFallback();

// Automatically selects best available provider
const response = await fallback.complete(userId, {
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(response.content);       // AI response
console.log(response.provider);      // 'anthropic', 'huggingface', etc.
console.log(response.model);         // Specific model used
console.log(response.fallbackUsed);  // true if fallback was triggered
console.log(response.cost);          // Estimated cost
```

### Fallback Benefits

✅ **Never fails** - Always finds a working model
✅ **Cost control** - Falls back to free alternatives when needed
✅ **Quality maintained** - Prioritizes best models when quota available
✅ **Transparent** - Tells you which provider/model was used

## Open Source Models

### Hugging Face Integration

Access thousands of free, open-source models:

```typescript
import { HuggingFaceIntegration } from '@galaos/integrations';

const hf = new HuggingFaceIntegration();
hf.setCredentials({ apiKey: process.env.HUGGINGFACE_API_KEY });

// Search for models
const models = await hf.searchModels({
  query: 'llama',
  filter: 'text-generation',
  sort: 'downloads',
  limit: 10,
});

// Run inference (FREE)
const result = await hf.runInference({
  modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
  inputs: 'Explain machine learning',
  parameters: {
    temperature: 0.7,
    max_new_tokens: 500,
  },
});

console.log(result);
```

### Popular Open Source Models

| Model | Parameters | Use Case | Speed |
|-------|-----------|----------|-------|
| Mistral 7B Instruct | 7B | General chat, coding | Fast |
| Llama 2 7B Chat | 7B | Conversational AI | Fast |
| Llama 2 13B Chat | 13B | Better reasoning | Medium |
| FLAN-T5 XXL | 11B | Instruction following | Fast |
| Code Llama 7B | 7B | Code generation | Fast |
| Zephyr 7B Beta | 7B | Helpful assistant | Fast |

### GitHub Model Repos

Discover and use models hosted on GitHub:

```typescript
import { GitHubIntegration } from '@galaos/integrations';

const github = new GitHubIntegration();

// Search for AI model repositories
const repos = await github.searchModelRepos({
  query: 'transformer',
  sort: 'stars',
  perPage: 20,
});

// Get trending ML repos
const trending = await github.getTrendingModelRepos({
  since: 'weekly',
});

// Get repo details with README
const repo = await github.getRepoDetails({
  owner: 'facebookresearch',
  repo: 'llama',
});
```

### Self-Hosting with Ollama

Run models locally for zero API costs:

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Download a model
ollama pull llama2

# Run the server
ollama serve
```

Configure in GalaOS:

```bash
# .env
OLLAMA_ENDPOINT=http://localhost:11434
```

Models will automatically fall back to local Ollama when API quotas exceeded.

## Best Practices

### 1. Set Conservative Quotas

Start with lower limits and increase as needed:

```typescript
// Start conservative
await tracker.setQuota(userId, 'openai', {
  dailyCostLimit: 10,    // $10/day max
  monthlyLimit: 5000,    // 5k requests/month max
  alertOnThreshold: 0.7, // Alert at 70%
});
```

### 2. Use Appropriate Models

Match model to task complexity:

- **Simple tasks**: GPT-3.5, Claude Haiku, or free models
- **Complex reasoning**: GPT-4, Claude Opus
- **Code generation**: GPT-4, Code Llama
- **Bulk processing**: Free Hugging Face models

### 3. Implement Caching

Cache responses for repeated queries:

```typescript
import { Redis } from 'ioredis';

const redis = new Redis();

async function getCachedResponse(prompt: string) {
  const cacheKey = `ai:${hash(prompt)}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Generate response
  const response = await fallback.complete(userId, {
    messages: [{ role: 'user', content: prompt }],
  });

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(response));

  return response;
}
```

### 4. Optimize Token Usage

Reduce costs by minimizing tokens:

```typescript
// ❌ Wasteful
const response = await complete({
  messages: [
    { role: 'user', content: 'Please explain in great detail...' }
  ],
  maxTokens: 4096, // Too high
});

// ✅ Efficient
const response = await complete({
  messages: [
    { role: 'user', content: 'Briefly explain...' }
  ],
  maxTokens: 500, // Appropriate limit
});
```

### 5. Monitor and Adjust

Regularly review usage patterns:

```typescript
// Generate monthly cost report
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');

const logs = await prisma.apiUsageLog.findMany({
  where: {
    userId,
    timestamp: { gte: startDate, lte: endDate },
  },
});

const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0);
const byProvider = logs.reduce((acc, log) => {
  acc[log.provider] = (acc[log.provider] || 0) + (log.estimatedCost || 0);
  return acc;
}, {});

console.log(`Total Cost: $${totalCost.toFixed(2)}`);
console.log('By Provider:', byProvider);
```

### 6. Use Free Tiers Strategically

Leverage free Hugging Face models for:

- Development and testing
- Non-critical batch processing
- Internal tools and automation
- Cost-sensitive applications

Reserve paid APIs for:

- Production user-facing features
- High-quality outputs required
- Real-time latency-sensitive tasks
- Complex reasoning tasks

## Cost Savings Examples

### Example 1: Chat Application

**Before optimization:**
- 10,000 daily chats
- All using GPT-4 Turbo
- Average 500 tokens/chat
- Cost: ~$50/day = $1,500/month

**After optimization:**
- 7,000 simple chats → Haiku ($0.25/1M)
- 2,500 medium chats → Mistral (FREE)
- 500 complex chats → GPT-4 Turbo ($10/1M)
- Cost: ~$3/day = $90/month

**Savings: 94% ($1,410/month)**

### Example 2: Code Assistant

**Before optimization:**
- 5,000 requests/day
- All GPT-4
- Average 1000 tokens
- Cost: ~$100/day = $3,000/month

**After optimization:**
- 3,000 simple queries → Code Llama (FREE)
- 1,500 medium queries → GPT-3.5 ($0.50/1M)
- 500 complex queries → GPT-4 ($10/1M)
- Cost: ~$6/day = $180/month

**Savings: 94% ($2,820/month)**

## API Endpoints

### REST API

```bash
# Get usage stats
GET /api/usage/stats?provider=openai

# Set quota
POST /api/usage/quota
{
  "provider": "anthropic",
  "dailyCostLimit": 50,
  "monthlyCostLimit": 1000
}

# Get alerts
GET /api/usage/alerts?unreadOnly=true
```

### tRPC API

```typescript
// Get usage stats
const stats = await trpc.usage.getStats.query({ provider: 'openai' });

// Set quota
await trpc.usage.setQuota.mutate({
  provider: 'anthropic',
  dailyCostLimit: 50,
  monthlyCostLimit: 1000,
});

// Get recommended provider
const provider = await trpc.usage.getRecommendedProvider.query();
```

## Monitoring Dashboard (Coming Soon)

Planned features:

- Real-time cost tracking graphs
- Provider comparison charts
- Usage heatmaps
- Budget forecasting
- Cost optimization recommendations
- Automated cost reports

## Support

For cost optimization questions:

- 📧 Email: support@galaos.ai
- 💬 Discord: https://discord.gg/galaos
- 📚 Docs: https://docs.galaos.ai/cost-optimization
