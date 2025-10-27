# GalaOS AI Orchestration System

## Overview

The AI Orchestration System is the "brain" of GalaOS that enables conversational, intelligent task automation. It allows users to interact naturally with the system using conversational language and have complex, multi-step tasks automatically decomposed and executed.

## Core Concept: "Gala"

**Gala** is your AI assistant that understands context, decomposes complex tasks, coordinates multiple AI agents, and executes workflows with human-in-the-loop confirmation steps.

### Example Interaction

```
You: "Gala, can you post these photos?" [uploads 3 photos]

Gala: "I see 3 photos of tattoo work. I'll help you share them! Here's what I can do:

📸 Photos analyzed:
- Photo 1: Vibrant color work
- Photo 2: Detail shot
- Photo 3: Full piece

I suggest:
✅ Create Instagram carousel
✅ Post to Buffer (scheduled for optimal time)
✅ Update portfolio website
✅ Send email campaign to subscribers

Let me generate a caption. What's the story behind this piece?"

You: "This was a 6-hour session, custom floral design..."

Gala: "Perfect! Here's your complete post:

[Your story] + 15 relevant hashtags

Ready to post? I'll:
1. Post to Instagram (now)
2. Schedule Buffer post (tomorrow 2pm)
3. Add to portfolio
4. Draft email campaign

Proceed? (yes/no)"

You: "yes"

Gala: "✅ Posted to Instagram (link)
      ✅ Scheduled Buffer (tomorrow 2pm)
      ✅ Portfolio updated (link)
      ✅ Email campaign draft ready - review?"
```

## Architecture

### 1. AI Orchestrator (`@galaos/ai`)

The orchestrator is the central coordinator that:
- Analyzes user intent
- Creates execution plans
- Manages multiple AI agents
- Handles tool calling and function execution

```typescript
import { AIOrchestrator } from '@galaos/ai';

const orchestrator = new AIOrchestrator({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultProvider: 'anthropic',
});

// Analyze what user wants
const intent = await orchestrator.analyzeIntent(
  "post these photos",
  { files: [...] }
);

// Create execution plan
const plan = await orchestrator.createOrchestrationPlan(
  "post these photos",
  { files: [...] }
);

// Execute with callbacks
await orchestrator.executeOrchestrationPlan(
  plan,
  onStepComplete,
  onHumanInputRequired
);
```

### 2. Predefined AI Agents

GalaOS includes specialized agents for different tasks:

#### Vision Analyzer
- Analyzes images for content, style, mood
- Provides detailed descriptions for content creation

#### Content Creator
- Generates engaging captions
- Creates hashtags (popular + niche mix)
- Adapts tone for platforms

#### Social Media Manager
- Posts to Instagram, Buffer, Twitter
- Optimizes posting times
- Tracks performance

#### Portfolio Manager
- Updates portfolio websites
- Organizes work by category
- Writes project descriptions

#### Email Marketer
- Creates email campaigns
- Writes subject lines and content
- Manages subscriber lists

### 3. Workflow Execution Engine (`@galaos/workflow`)

Executes orchestration plans step-by-step:

```typescript
import { WorkflowEngine } from '@galaos/workflow';

const engine = new WorkflowEngine();

// Listen to workflow events
engine.on((event) => {
  if (event.type === 'node_complete') {
    console.log(`Step ${event.nodeId} completed`);
  }
  if (event.type === 'human_input_required') {
    // Pause and wait for user input
  }
});

// Execute workflow
const context = await engine.execute(workflowDefinition, input);
```

### 4. Integration Framework (`@galaos/integrations`)

Connects to external services:

#### Buffer Integration
```typescript
import { BufferIntegration } from '@galaos/integrations';

const buffer = new BufferIntegration();
buffer.setCredentials({ accessToken: '...' });

await buffer.createPost({
  profileIds: ['...'],
  text: 'Caption with #hashtags',
  media: { photo: 'https://...' },
});
```

#### Instagram Integration
```typescript
import { InstagramIntegration } from '@galaos/integrations';

const instagram = new InstagramIntegration();
instagram.setCredentials({ accessToken: '...' });

// Single post
await instagram.createMediaPost({
  imageUrl: 'https://...',
  caption: 'Caption',
  userId: '...',
});

// Carousel
await instagram.createCarouselPost({
  images: ['url1', 'url2', 'url3'],
  caption: 'Caption',
  userId: '...',
});
```

#### Email Integration (SendGrid)
```typescript
import { SendGridIntegration } from '@galaos/integrations';

const email = new SendGridIntegration();
email.setCredentials({ apiKey: '...' });

await email.sendEmail({
  to: 'subscriber@example.com',
  from: 'you@example.com',
  subject: 'Portfolio Updated!',
  html: '<html>...</html>',
});
```

## Using the Orchestration System

### Frontend: Gala Chat Interface

Access the Gala interface at `/dashboard/gala`

Features:
- **File Upload**: Attach images, documents, any files
- **Conversational**: Natural language input
- **Visual Feedback**: See orchestration plans before execution
- **Progress Tracking**: Watch steps execute in real-time
- **Human-in-the-Loop**: Confirm or edit at key steps

### API: tRPC Endpoints

#### Analyze Intent

```typescript
const intent = await trpc.orchestration.analyzeIntent.mutate({
  message: "post these photos",
  context: { files: [...] }
});

// Returns:
// {
//   intent: "social_media_post",
//   entities: { contentType: "photos", files: [...] },
//   confidence: 0.8,
//   requiredTools: ["image_analyzer", "caption_generator", ...]
// }
```

#### Create Plan

```typescript
const plan = await trpc.orchestration.createPlan.mutate({
  message: "post these photos",
  context: { files: [...] }
});

// Returns orchestration plan with steps:
// {
//   taskId: "task_...",
//   intent: {...},
//   steps: [
//     { id: "analyze_images", agentId: "vision_analyzer", ... },
//     { id: "generate_caption", requiresHumanInput: true, ... },
//     { id: "post_to_social", ... },
//     ...
//   ]
// }
```

#### Execute Plan

```typescript
const result = await trpc.orchestration.executePlan.mutate({
  planId: plan.taskId,
  plan: plan,
});

// Executes steps and returns results
```

#### Gala Conversational Interface

```typescript
const response = await trpc.orchestration.gala.mutate({
  message: "post these photos",
  context: { files: [...] }
});

// Returns human-readable response with plan
```

### Universal Inbox

The inbox receives all tasks and routes them appropriately:

```typescript
// Submit to inbox
await trpc.inbox.submit.mutate({
  message: "post these photos",
  files: [...],
  metadata: { priority: "high" }
});

// List inbox items
const items = await trpc.inbox.list.query({
  status: "pending",
  limit: 50
});

// Get specific item
const item = await trpc.inbox.get.query({ id: "..." });

// Update status
await trpc.inbox.updateStatus.mutate({
  id: "...",
  status: "completed"
});
```

## Workflow Templates

### Photo to Social Media

Automatically:
1. Analyze images (AI vision)
2. Generate caption (with user input)
3. Generate hashtags
4. Post to Instagram
5. Schedule Buffer post
6. Update portfolio
7. Create email campaign

### Content Creation

1. Research topic (web search)
2. Generate outline (AI)
3. Write content (AI + human editing)
4. Generate images (DALL-E/Midjourney)
5. Format for platform
6. Schedule publication

### Portfolio Update

1. Organize new work
2. Write descriptions
3. Optimize images
4. Update website
5. Notify subscribers
6. Share on social media

## Extending the System

### Add New Agent

```typescript
import { AgentConfig } from '@galaos/ai';

const myAgentConfig: AgentConfig = {
  id: 'my_agent',
  name: 'My Agent',
  description: 'Does something amazing',
  systemPrompt: 'You are an expert at...',
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  tools: [
    {
      name: 'my_tool',
      description: 'Tool description',
      parameters: z.object({ ... }),
      async execute(params) {
        // Tool logic
        return result;
      }
    }
  ]
};

orchestrator.registerAgent(myAgentConfig);
```

### Add New Integration

```typescript
import { BaseIntegration, IntegrationAction } from '@galaos/integrations';

class MyIntegration extends BaseIntegration {
  config = {
    id: 'my_service',
    name: 'My Service',
    authType: 'oauth2',
    // ...
  };

  async test(): Promise<boolean> {
    // Test connection
  }

  async myAction(params: any): Promise<any> {
    // Implementation
  }
}

// Register integration
import { globalIntegrationRegistry } from '@galaos/integrations';
globalIntegrationRegistry.register(new MyIntegration());
```

### Add New Workflow Node

```typescript
import { BaseNodeExecutor } from '@galaos/workflow';

class MyNodeExecutor extends BaseNodeExecutor {
  constructor() {
    super('my_node_type');
  }

  async execute(node, context): Promise<any> {
    // Node logic
    const input = this.resolveVariables(node.data, context);
    // Process...
    return result;
  }
}

// Register node
import { globalNodeExecutorRegistry } from '@galaos/workflow';
globalNodeExecutorRegistry.register(new MyNodeExecutor());
```

## Best Practices

### 1. Intent Detection

Make intent descriptions specific:
```typescript
// Good
"social_media_post" - clear, specific action

// Bad
"do_something" - vague, unclear
```

### 2. Human-in-the-Loop

Always require human confirmation for:
- Publishing content publicly
- Sending emails
- Making purchases
- Deleting data

```typescript
{
  requiresHumanInput: true,
  humanInputPrompt: "Review caption before posting?"
}
```

### 3. Error Handling

Workflows should handle errors gracefully:
```typescript
try {
  await executeStep(step);
} catch (error) {
  // Log error
  // Offer alternative
  // Allow retry
}
```

### 4. Idempotency

Make steps idempotent when possible:
- Check if action already completed
- Use unique identifiers
- Handle duplicates gracefully

## Environment Variables

Required for AI orchestration:

```bash
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Integrations
BUFFER_CLIENT_ID=...
BUFFER_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
SENDGRID_API_KEY=...
```

## Monitoring & Debugging

### Workflow Execution Logs

All executions are stored in the database:

```sql
SELECT * FROM workflow_executions
WHERE status = 'failed'
ORDER BY started_at DESC;
```

### Agent Conversation History

```typescript
const agent = orchestrator.getAgent('vision_analyzer');
const history = agent.getConversationHistory();
console.log(history);
```

### Event Listeners

```typescript
workflowEngine.on((event) => {
  console.log(`Event: ${event.type}`, event);

  if (event.type === 'node_error') {
    // Alert, log, retry
  }
});
```

## Performance Considerations

### Parallel Execution

Steps without dependencies run in parallel:
```typescript
// These run simultaneously:
- Analyze image
- Fetch user preferences
- Check rate limits
```

### Caching

Results are cached to avoid redundant API calls:
```typescript
// Cached for 5 minutes
const analysis = await cacheOrFetch('image_analysis', imageId, async () => {
  return await analyzeImage(imageId);
});
```

### Rate Limiting

Integrations respect API rate limits:
```typescript
// Wait if rate limit hit
if (rateLimitExceeded) {
  await delay(retryAfter);
  retry();
}
```

## Security

### API Keys

All API keys and OAuth tokens are:
- Encrypted at rest
- Never exposed to frontend
- Rotated regularly
- Scoped to minimum permissions

### User Data

- User approves all public actions
- Data is sandboxed per user
- Audit logs track all operations

### Input Validation

All inputs are validated:
```typescript
const schema = z.object({
  message: z.string().min(1).max(10000),
  files: z.array(fileSchema).max(10),
});

const validated = schema.parse(input);
```

## Future Enhancements

- [ ] Voice input for Gala
- [ ] Multi-agent debates for complex decisions
- [ ] Learning from user preferences
- [ ] Workflow marketplace
- [ ] Mobile app support
- [ ] Offline mode
- [ ] Custom agent training

## FAQ

**Q: Can I use my own AI models?**
A: Yes! Add a custom provider to the orchestrator.

**Q: How much does it cost?**
A: You pay for AI API usage (Claude/GPT-4). Integrations are free or based on service pricing.

**Q: Is my data secure?**
A: Yes, all credentials are encrypted, and you control what gets published.

**Q: Can I self-host?**
A: Yes! GalaOS is designed to be self-hosted.

**Q: How do I add more integrations?**
A: Follow the "Add New Integration" guide above or submit a PR!

---

**Ready to start?** Try the Gala interface at `/dashboard/gala` and say:

> "Gala, help me post photos to Instagram"

Then attach some images and watch the magic happen! ✨
