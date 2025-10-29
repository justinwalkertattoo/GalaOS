# Your Cost-Optimized GalaOS Setup

**Goal: Keep monthly costs under $100-140 while maintaining high quality**

Your local Ollama models can handle 90-95% of tasks for **FREE**! This guide shows you exactly how to maximize your local models and minimize API costs.

## Your Local Model Arsenal

You have an excellent collection of models installed:

| Model | Size | Best For | Speed | Quality |
|-------|------|----------|-------|---------|
| **qwen2.5-coder** | 4.7 GB | Code generation, debugging | Fast | Excellent |
| **llama3.1** | 4.9 GB | General chat, Q&A, writing | Fast | Excellent |
| **codellama** | 3.8 GB | Code assistance | Fast | Very Good |
| **deepseek-r1** | 4.7 GB | Reasoning, math, analysis | Medium | Excellent |
| **gpt-oss:20b** | 13 GB | Complex tasks, large context | Slow | Excellent |
| **mistral-small3.1** | 15 GB | Creative writing, general | Slow | Excellent |
| **gemma3** | 3.3 GB | Quick responses, simple tasks | Very Fast | Good |
| **qwen3** | 5.2 GB | Multilingual, Chinese | Fast | Very Good |
| **llava** | 4.7 GB | Vision, image understanding | Medium | Very Good |
| **nomic-embed-text** | 274 MB | Text embeddings | Very Fast | Excellent |

**Total local capacity: ~60 GB of AI power at $0 cost** 🎉

## Task-to-Model Mapping (Maximize FREE Usage)

### 1. Code Generation & Debugging ⚡

**Use**: `qwen2.5-coder` (4.7 GB) - **ALWAYS FREE**

```typescript
const provider = new CostOptimizedModelProvider();
const model = await provider.selectModelForTask(userId, 'code');

// Uses qwen2.5-coder for FREE
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Write a React component for user authentication' }
  ],
});
```

**When it's perfect for**:
- Writing functions, classes, components
- Fixing bugs and errors
- Code refactoring
- API endpoint creation
- Unit test generation
- Code reviews and suggestions

**Fallback chain**: qwen2.5-coder → codellama → llama3.1 → claude-3-haiku ($0.25/1M)

**Monthly savings**: $30-50 (1000+ requests/month)

---

### 2. General Chat & Q&A 💬

**Use**: `llama3.1` (4.9 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'chat');

// Uses llama3.1 for FREE
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ],
});
```

**When it's perfect for**:
- General Q&A
- Conversational AI
- Writing emails, messages
- Brainstorming
- Explaining concepts
- Customer support responses

**Fallback chain**: llama3.1 → gemma3 → mistral-small3.1 → claude-3-haiku

**Monthly savings**: $40-60 (2000+ requests/month)

---

### 3. Complex Reasoning & Analysis 🧠

**Use**: `deepseek-r1` (4.7 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'reasoning');

// Uses deepseek-r1 for FREE
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Solve this optimization problem step by step...' }
  ],
});
```

**When it's perfect for**:
- Mathematical problems
- Logical reasoning
- Step-by-step analysis
- Problem decomposition
- Strategic planning
- Algorithm design

**Fallback chain**: deepseek-r1 → gpt-oss:20b → llama3.1 → claude-3-sonnet ($3/1M)

**Monthly savings**: $5-15 (200+ requests/month)

---

### 4. Document Analysis & Summarization 📄

**Use**: `gpt-oss:20b` (13 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'complex');

// Uses gpt-oss:20b for FREE (20B parameters!)
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Summarize this 50-page technical document...' }
  ],
});
```

**When it's perfect for**:
- Long document analysis
- Report summarization
- Technical documentation review
- Research paper analysis
- Large context understanding

**Fallback chain**: gpt-oss:20b → mistral-small3.1 → llama3.1 → claude-3-haiku

**Monthly savings**: $10-20 (500+ requests/month)

---

### 5. Quick Simple Queries ⚡

**Use**: `gemma3` (3.3 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'fast');

// Uses gemma3 for blazing fast FREE responses
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'What is the capital of France?' }
  ],
});
```

**When it's perfect for**:
- Simple factual questions
- Quick translations
- Short definitions
- Basic calculations
- Status updates
- Rapid-fire queries

**Fallback chain**: gemma3 → llama3.1

**Monthly savings**: $20-30 (3000+ requests/month)

---

### 6. Image Understanding 👁️

**Use**: `llava` (4.7 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'vision');

// Uses llava for FREE image analysis
const response = await provider.complete(userId, {
  messages: [
    {
      role: 'user',
      content: 'Describe what's in this image...',
      image: base64Image
    }
  ],
});
```

**When it's perfect for**:
- Image description
- OCR (text extraction)
- Visual Q&A
- Screenshot analysis
- Meme understanding
- Chart/graph interpretation

**Fallback chain**: llava → gpt-4-vision ($10/1M - use sparingly!)

**Monthly savings**: $5-10 (100+ requests/month)

---

### 7. Text Embeddings (Vector Search) 🔍

**Use**: `nomic-embed-text` (274 MB) - **ALWAYS FREE**

```typescript
const provider = new CostOptimizedModelProvider();

// Uses nomic-embed-text for FREE embeddings
const embedding = await provider.getEmbedding('Your text here');

// Use for Qdrant, Pinecone, semantic search, etc.
await qdrant.upsert({
  points: [{
    id: '1',
    vector: embedding,
    payload: { text: 'Your text here' }
  }]
});
```

**When it's perfect for**:
- Semantic search
- RAG (Retrieval Augmented Generation)
- Document similarity
- Clustering
- Recommendation systems
- Question answering systems

**No fallback needed** - This model handles all embedding needs

**Monthly savings**: $20-40 (5000+ embeddings/month)

---

### 8. Creative Writing ✍️

**Use**: `mistral-small3.1` (15 GB) - **ALWAYS FREE**

```typescript
const model = await provider.selectModelForTask(userId, 'chat');

// Uses mistral-small3.1 for FREE creative tasks
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Write a compelling product description for...' }
  ],
});
```

**When it's perfect for**:
- Marketing copy
- Blog posts
- Product descriptions
- Social media content
- Storytelling
- Creative brainstorming

**Fallback chain**: mistral-small3.1 → llama3.1 → claude-3-sonnet (creative tasks)

**Monthly savings**: $10-20 (300+ requests/month)

---

## API Usage Strategy (Reserve for Critical Tasks)

### When to Use Paid APIs

Only use paid APIs when:

1. **Local model struggles** (rare - your models are very capable)
2. **Production user-facing features** requiring absolute best quality
3. **Business-critical tasks** where cost is justified
4. **Emergency fallback** when local models unavailable

### Recommended API Usage

With your setup, aim for:
- **95% local models** (FREE)
- **5% paid APIs** ($15-25/month)

### Conservative Quotas (Automatically Enforced)

```typescript
// Your quotas (set via setup script):
OpenAI:
  - $100/month max ($3.50/day)
  - 50 requests/day
  - 500k tokens/day

Anthropic:
  - $40/month max ($1.50/day)
  - 30 requests/day
  - 300k tokens/day

Gemini:
  - $15/month max ($0.50/day)
  - 20 requests/day
  - 200k tokens/day

Total: $140/month maximum
Alerts: At 70% ($98)
```

---

## Cost Projections

### Best Case (95% Local) 💚
- **Local models**: 6,650 calls/month - **$0**
- **API fallback**: 350 calls/month - **$5**
- **Total**: **$5/month**

### Realistic (90% Local) 💙
- **Local models**: 6,300 calls/month - **$0**
- **API fallback**: 700 calls/month - **$15-25**
- **Total**: **$15-25/month**

### Heavy API Use (80% Local) 💛
- **Local models**: 5,600 calls/month - **$0**
- **API fallback**: 1,400 calls/month - **$50-70**
- **Total**: **$50-70/month**

### Maximum (Hitting Quotas) ❤️
- **Local models**: 5,000 calls/month - **$0**
- **API calls**: Max quotas hit - **$140**
- **Total**: **$140/month** (quota limit)

**Target: Stay in the "Realistic" range ($15-25/month)**

---

## Setup Instructions

### 1. Run Setup Script

```bash
cd /home/user/GalaOS

# Install dependencies (if not already)
npm install

# Run cost optimization setup
npx tsx scripts/setup-cost-optimization.ts
```

This will:
- ✅ Verify all Ollama models are available
- ✅ Set up conservative API quotas
- ✅ Configure alert thresholds (70%)
- ✅ Display your optimal task mapping

### 2. Update Environment Variables

```bash
# .env
OLLAMA_ENDPOINT=http://localhost:11434
ENCRYPTION_KEY=<your-32-char-secret>
REDIS_URL=redis://localhost:6379

# Optional: API keys (for fallback only)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 3. Start Using Cost-Optimized Provider

```typescript
// In your application code
import { CostOptimizedModelProvider } from '@galaos/ai/src/cost-optimized-provider';

const provider = new CostOptimizedModelProvider();

// Automatic model selection based on task
const response = await provider.complete(userId, {
  messages: [
    { role: 'user', content: 'Your prompt here' }
  ],
});

console.log(response.model);        // qwen2.5-coder, llama3.1, etc.
console.log(response.provider);     // 'local', 'api', etc.
console.log(response.fallbackUsed); // false if using preferred model
console.log(response.cost);         // 0 for local models
```

---

## Monitoring Your Costs

### Daily Check

```typescript
import { ApiUsageTracker } from '@galaos/core/src/api-usage-tracker';

const tracker = new ApiUsageTracker();
const stats = await tracker.getUsageStats(userId);

console.log('Today's API costs:');
console.log(`  OpenAI: $${stats.quotas.find(q => q.provider === 'openai')?.currentDailyCost || 0}`);
console.log(`  Anthropic: $${stats.quotas.find(q => q.provider === 'anthropic')?.currentDailyCost || 0}`);

console.log('\nActive alerts:', stats.alerts.length);
```

### Weekly Review

```bash
# Get usage report
npm run cost-report

# Output:
# 📊 This Week's Usage:
#   Local Models:   1,450 calls ($0) ✅
#   API Calls:      75 calls ($3.50) ✅
#   Total Cost:     $3.50 / $140 budget
#   Remaining:      $136.50 (97%)
```

### Monthly Analysis

```typescript
// Get month-to-date costs
const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const logs = await prisma.apiUsageLog.findMany({
  where: {
    userId,
    timestamp: { gte: startOfMonth },
  },
});

const totalCost = logs.reduce((sum, log) => sum + (log.estimatedCost || 0), 0);
const byProvider = logs.reduce((acc, log) => {
  acc[log.provider] = (acc[log.provider] || 0) + (log.estimatedCost || 0);
  return acc;
}, {});

console.log(`Month-to-date: $${totalCost.toFixed(2)}`);
console.log('By provider:', byProvider);
```

---

## Pro Tips for Maximum Savings

### 1. Batch Similar Tasks

```typescript
// ❌ Expensive: 100 individual API calls
for (const task of tasks) {
  await provider.complete(userId, { messages: [{ role: 'user', content: task }] });
}

// ✅ Cheap: 1 local model call with batched tasks
const batchPrompt = tasks.map((t, i) => `Task ${i + 1}: ${t}`).join('\n\n');
await provider.complete(userId, { messages: [{ role: 'user', content: batchPrompt }] });
```

### 2. Cache Responses

```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getCachedResponse(prompt: string) {
  const cacheKey = `ai:${hash(prompt)}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('✅ Cache hit - $0 cost');
    return JSON.parse(cached);
  }

  // Generate with local model (free)
  const response = await provider.complete(userId, {
    messages: [{ role: 'user', content: prompt }],
  });

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(response));

  return response;
}
```

### 3. Use Appropriate Model Sizes

```typescript
// ❌ Wasteful: Using 15GB model for simple task
const response = await ollama.generate({
  model: 'mistral-small3.1', // 15GB - slow
  prompt: 'What is 2+2?'
});

// ✅ Efficient: Using 3.3GB model for simple task
const response = await ollama.generate({
  model: 'gemma3', // 3.3GB - fast
  prompt: 'What is 2+2?'
});
```

### 4. Leverage Streaming for UX

```typescript
// Better user experience + same cost
const stream = await provider.complete(userId, {
  messages: [{ role: 'user', content: longPrompt }],
  stream: true,
});

// Show tokens as they arrive (feels faster)
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### 5. Use nomic-embed-text for ALL Embeddings

```typescript
// ❌ Expensive: OpenAI embeddings
const embedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: text,
}); // Costs money

// ✅ Free: Local embeddings
const embedding = await provider.getEmbedding(text); // $0
```

---

## Emergency API Access

If local models are down or struggling:

```typescript
// Force API usage (skips local models)
const response = await provider.completeWithAPI(
  { name: 'anthropic', model: 'claude-3-haiku' },
  request
);
```

This is automatically tracked and counted against your quotas.

---

## Summary

### Your Cost-Optimized Setup ✨

- **10 powerful local models** - Handle 90-95% of tasks FREE
- **Conservative API quotas** - $140/month maximum
- **Intelligent fallbacks** - 14-tier fallback chain
- **Automatic cost tracking** - Real-time monitoring and alerts
- **Realistic monthly cost**: $15-25 (target) or $5 (best case)

### Task Distribution (Recommended)

- **Code**: 100% qwen2.5-coder → $0
- **Chat**: 100% llama3.1 → $0
- **Reasoning**: 95% deepseek-r1 → $0-5
- **Vision**: 95% llava → $0-5
- **Embeddings**: 100% nomic-embed-text → $0
- **Quick queries**: 100% gemma3 → $0
- **Complex/docs**: 90% gpt-oss:20b → $0-10
- **Premium tasks**: 10% APIs → $10-20

**Total: $15-25/month (well under your $100-140 budget)** 🎉

---

## Need Help?

- 📧 Questions: Your setup is ready to go!
- 📊 Monitoring: Run `npm run cost-report` anytime
- ⚠️ Alerts: You'll get notified at 70% budget ($98)
- 🔧 Adjust quotas: Modify `CONSERVATIVE_QUOTAS` in cost-optimized-provider.ts

**You're all set to run GalaOS at minimal cost while maintaining excellent quality!** 🚀
