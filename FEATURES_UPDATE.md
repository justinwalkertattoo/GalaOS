# GalaOS v0.3.0 - Features Update

## New Features

### 1. Instagram via Buffer Integration

**What changed:**
- Workflow now uses Buffer for Instagram posting instead of direct Instagram API
- Simplifies OAuth (only need Buffer connection)
- Buffer handles Instagram's complexity
- Better scheduling options

**Why this is better:**
- ✅ ONE integration instead of two
- ✅ More reliable (Buffer handles Instagram's quirks)
- ✅ Better scheduling (Buffer's optimal timing)
- ✅ Cross-posting (Instagram + other platforms simultaneously)

**How it works:**
```
User: "Gala, post these photos"
  ↓
Gala creates workflow:
  1. Analyze images
  2. Generate caption
  3. Create hashtags
  4. POST TO BUFFER → Buffer posts to Instagram
  5. Update portfolio
  6. Send email
```

**Setup:**
1. Connect Instagram to your Buffer account
2. Add Buffer API key in GalaOS Settings
3. Say "Gala, post these photos"
4. Buffer automatically posts to your connected Instagram!

---

### 2. API Key Management UI

**No more editing .env files!**

**Features:**
- 🔐 **Secure Storage** - Keys encrypted in database
- 🧪 **Test Connections** - Verify keys work before using
- 👁️ **Visual Management** - See all your keys in one place
- 🔑 **Per-User Keys** - Each user has their own keys
- 📊 **Usage Tracking** - See when keys were last used

**Supported Services:**
- Anthropic (Claude)
- OpenAI (GPT-4)
- Buffer
- SendGrid (Email)
- Instagram (optional, if not using Buffer)
- Any other service

**How to Use:**

1. **Go to Settings** (`/dashboard/settings`)

2. **Click "Add Key"**

3. **Fill in details:**
   - Service Name: "Anthropic API"
   - Type: Anthropic
   - API Key: sk-ant-your-key

4. **Click "Test"** to verify it works

5. **Done!** Gala will use your key automatically

**Security:**
- Keys encrypted with AES-256-GCM
- Only YOU can access your keys
- Keys never exposed to frontend
- Optional: still works with .env for backward compatibility

**Example:**

```
Before:
❌ Edit .env file manually
❌ Restart server
❌ Keys shared by all users
❌ No way to test if they work

After:
✅ Add keys via beautiful UI
✅ No server restart needed
✅ Each user has their own keys
✅ Test button verifies instantly
✅ See usage history
```

---

## Updated Workflow Example

### "Gala, Post These Photos"

**Old workflow:**
1. Analyze images
2. Generate caption
3. Post to Instagram (direct API)
4. Post to Buffer (separate)
5. Update portfolio
6. Send email

**New workflow (Better!):**
1. Analyze images
2. Generate caption
3. **Post to Buffer → Instagram** (one step!)
4. Update portfolio
5. Send email

**Benefits:**
- Fewer steps
- More reliable
- Instagram connection managed by Buffer
- Can schedule for optimal times
- Cross-post to multiple platforms

---

## Setup Guide

### Step 1: Generate Encryption Key

```bash
# Add this to your .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to .env as ENCRYPTION_KEY
```

### Step 2: Add API Keys via UI

1. Start GalaOS
2. Login
3. Go to `/dashboard/settings`
4. Add your keys:
   - Anthropic API (for Gala AI)
   - Buffer (for social posting)
   - SendGrid (for emails)

### Step 3: Test Everything

1. Click "Test" on each key
2. Verify all show green checkmarks
3. Go to `/dashboard/gala`
4. Upload photos
5. Say "Gala, post these photos"
6. Watch the magic!

---

## API Changes

### New Endpoints

```typescript
// API Key Management
trpc.settings.listApiKeys.query()
trpc.settings.addApiKey.mutate({ name, type, key })
trpc.settings.testApiKey.mutate({ id })
trpc.settings.deleteApiKey.mutate({ id })
trpc.settings.getDecryptedKey.query({ name }) // Internal use

// Orchestrator now uses user's keys automatically
trpc.orchestration.gala.mutate({ message, context })
// ↑ Uses YOUR API keys from database!
```

### Database Changes

No migration needed! The `ApiKey` table already exists from v0.1.0.

---

## Files Added/Modified

**New Files (4):**
```
apps/api/src/services/encryption.ts       # Encryption service
apps/api/src/router/settings.ts           # Settings API
apps/web/.../dashboard/settings/page.tsx  # Settings UI
FEATURES_UPDATE.md                        # This file
```

**Modified Files (6):**
```
packages/ai/src/orchestrator.ts           # Buffer integration
apps/api/src/router/index.ts              # Added settings router
apps/api/src/router/orchestration.ts      # Use user keys
apps/web/.../dashboard/page.tsx           # Added settings link
.env.example                              # Added ENCRYPTION_KEY
README.md                                 # Updated features
```

---

## Environment Variables

### Required

```bash
# NEW - Required for key encryption
ENCRYPTION_KEY=your-32-byte-hex-key
```

### Optional (can use UI instead)

```bash
# AI Providers
ANTHROPIC_API_KEY=your-key  # Optional: Add via Settings UI
OPENAI_API_KEY=your-key     # Optional: Add via Settings UI

# Integrations
BUFFER_ACCESS_TOKEN=your-token  # Optional: Add via Settings UI
SENDGRID_API_KEY=your-key      # Optional: Add via Settings UI
```

**Priority:**
1. User's keys from database (via Settings UI)
2. Environment variables (fallback)

---

## Migration Guide

### From v0.2.0 to v0.3.0

**If you have API keys in .env:**
1. Keep them there (still works as fallback)
2. OR move to Settings UI (recommended)
3. Add ENCRYPTION_KEY to .env

**If you're new:**
1. Just use Settings UI for everything!
2. Add ENCRYPTION_KEY to .env

**Docker users:**
```bash
# Update docker-compose.yml to include:
environment:
  ENCRYPTION_KEY: ${ENCRYPTION_KEY}
```

---

## Troubleshooting

### "Invalid encrypted data format"
- Run encryption key generator
- Add ENCRYPTION_KEY to .env
- Restart server

### "API key test failed"
- Check key is correct
- Verify service is reachable
- Check key hasn't expired

### "Gala not responding"
- Go to Settings
- Verify Anthropic API key is added
- Click "Test" to confirm it works

---

## What's Next?

### Coming Soon:
- OAuth flow for Buffer (click to connect)
- More integrations (50+ target)
- Visual workflow builder
- Workflow templates
- API usage analytics

### Your Feedback:
Let us know what integrations you want next!

---

## Thank You!

These improvements make GalaOS:
- ✅ More user-friendly (no .env editing!)
- ✅ More secure (encrypted keys per user)
- ✅ More reliable (Buffer for Instagram)
- ✅ Easier to setup (Settings UI)

**Start using it:**
1. Go to `/dashboard/settings`
2. Add your API keys
3. Go to `/dashboard/gala`
4. Say "Gala, post these photos!"

Enjoy! 🚀
