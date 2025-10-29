# Security Guide

GalaOS implements enterprise-grade security measures to protect your data, API keys, and infrastructure. This guide covers all security features and best practices.

## Table of Contents

- [Environment Validation](#environment-validation)
- [Secret Management](#secret-management)
- [Rate Limiting](#rate-limiting)
- [DDoS Protection](#ddos-protection)
- [Security Headers](#security-headers)
- [Authentication](#authentication)
- [Encryption](#encryption)
- [API Security](#api-security)
- [Best Practices](#best-practices)

## Environment Validation

### Automatic Validation

GalaOS validates environment variables on startup to prevent security issues:

```typescript
import { validateEnv } from '@galaos/core/src/security/env-validator';

// Validates all required environment variables
const env = validateEnv();
```

### What Gets Validated

✅ **Required Variables**: DATABASE_URL, NEXTAUTH_SECRET, etc.
✅ **Format Validation**: URLs, API keys, encryption keys
✅ **Minimum Length**: Secrets must be 32+ characters
✅ **Production Rules**: HTTPS enforced, no wildcards
✅ **Weak Secret Detection**: Warns about common passwords

### Example Output

```bash
❌ Environment validation failed:
  - NEXTAUTH_SECRET: String must contain at least 32 character(s)
  - DATABASE_URL: Invalid url
  - ENCRYPTION_KEY: Required
⚠️  WARNING: GITHUB_CLIENT_SECRET appears to be a weak secret
⚠️  WARNING: API_CORS_ORIGIN is set to "*" in production. This is insecure!
```

### Required Environment Variables

```bash
# Critical Security Variables
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# At least one AI provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Production: Must use HTTPS
NEXTAUTH_URL=https://your-app.com  # ❌ http:// not allowed
```

## Secret Management

### Encryption Service

All sensitive data is encrypted using AES-256-GCM:

```typescript
import { SecretManager } from '@galaos/core/src/security/secret-manager';

const secrets = new SecretManager();

// Encrypt sensitive data
const encrypted = secrets.encrypt('sensitive-api-key');
// Store encrypted in database

// Decrypt when needed
const decrypted = secrets.decrypt(encrypted);

// Encrypt objects
const encryptedObj = secrets.encryptObject({
  apiKey: 'sk-...',
  refreshToken: 'rt-...',
});
```

### Password Hashing

Use PBKDF2 with 100,000 iterations:

```typescript
// Hash password for storage
const hashed = secrets.hashPassword('user-password');
// Store in database: "salt:hash"

// Verify password
const isValid = secrets.verifyPassword('user-password', hashed);
```

### API Key Management

```typescript
// Generate secure API key
const apiKey = secrets.generateApiKey(32);
// Returns: "abc123XYZ..." (base64url encoded)

// Hash for storage (one-way)
const hashedKey = secrets.hashApiKey(apiKey);
// Store hashedKey in database

// Show user the key ONCE
console.log('Your API key:', apiKey);
console.log('Store this securely - you will not see it again!');
```

### Key Rotation

Rotate encryption keys without data loss:

```typescript
// Rotate a single encrypted value
const rotated = secrets.rotateKey(
  'old-encryption-key',
  'new-encryption-key',
  encryptedData
);

// Rotate all secrets in database
async function rotateAllSecrets() {
  const secrets = await prisma.integration.findMany();

  for (const secret of secrets) {
    const rotated = manager.rotateKey(
      process.env.OLD_ENCRYPTION_KEY!,
      process.env.NEW_ENCRYPTION_KEY!,
      secret.accessToken
    );

    await prisma.integration.update({
      where: { id: secret.id },
      data: { accessToken: rotated },
    });
  }
}
```

### Secure Token Generation

```typescript
// CSRF tokens
const csrfToken = secrets.generateToken(32);

// Email verification tokens
const verifyToken = secrets.generateToken(48);

// Session tokens
const sessionToken = secrets.generateToken(64);
```

## Rate Limiting

### API Rate Limiting

Protect your API from abuse:

```typescript
import { RateLimiter } from '@galaos/core/src/security/rate-limiter';

// Create rate limiter
const limiter = RateLimiter.forAPI(
  100,        // 100 requests
  60 * 1000   // per minute
);

// Check if request allowed
const { allowed, info } = await limiter.checkLimit(userId);

if (!allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${info.resetTime}`);
}
```

### Rate Limit Presets

```typescript
// General API (100 req/min)
const apiLimiter = RateLimiter.forAPI();

// Authentication (5 attempts per 15 min)
const authLimiter = RateLimiter.forAuth();

// AI requests (20 req/min)
const aiLimiter = RateLimiter.forAI();

// Custom
const customLimiter = new RateLimiter(undefined, {
  max: 50,
  windowMs: 5 * 60 * 1000, // 5 minutes
});
```

### Express Middleware

```typescript
import { createRateLimitMiddleware } from '@galaos/core/src/security/rate-limiter';

const limiter = RateLimiter.forAPI();
app.use('/api', createRateLimitMiddleware(limiter));
```

### Rate Limit Headers

Automatically added to responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2024-01-15T10:30:00Z
Retry-After: 42
```

## DDoS Protection

### Automatic Blocking

Suspicious IPs are automatically blocked:

```typescript
import { DDoSProtection } from '@galaos/core/src/security/rate-limiter';

const ddos = new DDoSProtection();

// Check each request
const { allowed, reason } = await ddos.checkRequest(
  req.ip,
  req.path
);

if (!allowed) {
  return res.status(403).json({ error: reason });
}
```

### Blocking Rules

- **Strike 1**: Rate limit exceeded → Warning
- **Strike 2**: Rate limit exceeded again → Temporary block
- **Strike 3**: Repeated violations → Permanent block

### Unblock IP

```typescript
// Manually unblock an IP
ddos.unblockIP('192.168.1.100');

// View blocked IPs
const blocked = ddos.getBlockedIPs();
console.log('Blocked IPs:', blocked);
```

## Security Headers

### Automatic Headers

GalaOS applies security headers to all responses:

```typescript
import { createSecurityMiddleware } from '@galaos/core/src/security/headers';

const middleware = createSecurityMiddleware({
  enableHSTS: true,
  enableCSP: true,
  enableXSSProtection: true,
  enableFrameGuard: true,
  enableNoSniff: true,
});

app.use(middleware);
```

### Headers Applied

```http
# HSTS (Force HTTPS)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'...

# XSS Protection
X-XSS-Protection: 1; mode=block

# Clickjacking Protection
X-Frame-Options: DENY

# MIME Sniffing Protection
X-Content-Type-Options: nosniff

# Referrer Policy
Referrer-Policy: strict-origin-when-cross-origin

# Permissions Policy
Permissions-Policy: accelerometer=(), camera=(), geolocation=()...
```

### CORS Configuration

```typescript
const middleware = createSecurityMiddleware(
  { enableHSTS: true },
  {
    // CORS config
    origins: ['https://app.example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  }
);
```

### Wildcard Subdomain Support

```typescript
const corsConfig = {
  origins: [
    'https://example.com',
    '*.example.com',  // Allows any subdomain
  ],
};
```

## Authentication

### API Key Authentication

```typescript
// Generate API key for user
const apiKey = secrets.generateApiKey();
const hashedKey = secrets.hashApiKey(apiKey);

await prisma.apiKey.create({
  data: {
    userId,
    name: 'My API Key',
    key: hashedKey,
    keyPreview: apiKey.slice(0, 8) + '...',
    scopes: ['read', 'write'],
  },
});

// Verify API key
async function verifyApiKey(providedKey: string) {
  const hashedKey = secrets.hashApiKey(providedKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
  });

  if (!apiKey) return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
```

### OAuth 2.0 Flow

GalaOS implements secure OAuth 2.0 with:

- ✅ CSRF protection (state parameter)
- ✅ PKCE support for mobile apps
- ✅ Token encryption at rest
- ✅ Automatic token refresh
- ✅ Scope validation

```typescript
// OAuth flow handled by OAuth integration manager
const manager = new OAuthIntegrationManager();

// Step 1: Get authorization URL (includes CSRF protection)
const authUrl = await manager.getAuthorizationUrl('github', userId);

// Step 2: Handle callback
const tokens = await manager.handleCallback('github', {
  code: req.query.code,
  state: req.query.state,
});

// Tokens are automatically encrypted and stored
```

## Encryption

### Encryption at Rest

All sensitive data is encrypted in the database:

- ✅ OAuth access tokens
- ✅ OAuth refresh tokens
- ✅ API keys (hashed)
- ✅ User secrets
- ✅ Integration credentials

### Encryption Algorithm

- **Algorithm**: AES-256-GCM
- **Key Length**: 256 bits
- **IV Length**: 128 bits (random per encryption)
- **Authentication**: AEAD with 128-bit auth tag

### Key Management

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Add to .env
ENCRYPTION_KEY=your-generated-key-here
```

**Important**: Store encryption keys in a secure key management service in production (AWS KMS, Azure Key Vault, etc.).

## API Security

### Input Validation

All API inputs validated with Zod schemas:

```typescript
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string(),
  goal: z.string(),
  tools: z.array(z.string()).max(20),
  temperature: z.number().min(0).max(2).optional(),
});

// Automatic validation
const agent = await trpc.agents.create.mutate({
  name: 'My Agent',
  role: 'assistant',
  // ... Invalid data will throw validation error
});
```

### SQL Injection Protection

Using Prisma ORM prevents SQL injection:

```typescript
// ✅ Safe - Parameterized query
const users = await prisma.user.findMany({
  where: { email: userInput },
});

// ❌ Dangerous - Raw SQL (avoid)
await prisma.$executeRaw`SELECT * FROM users WHERE email = ${userInput}`;
```

### XSS Protection

Content Security Policy prevents XSS attacks:

- Script tags from untrusted sources blocked
- Inline scripts require nonce
- User-generated content sanitized

### CSRF Protection

NextAuth.js provides automatic CSRF protection:

- CSRF tokens in forms
- State parameter in OAuth
- SameSite cookies

## Best Practices

### 1. Use Environment Variables

```bash
# ✅ Good
OPENAI_API_KEY=sk-...

# ❌ Bad - Hardcoded
const apiKey = 'sk-proj-abc123...';
```

### 2. Rotate Secrets Regularly

```bash
# Rotate every 90 days
- Database passwords
- API keys
- Encryption keys
- OAuth client secrets
```

### 3. Principle of Least Privilege

```typescript
// Only request OAuth scopes you need
const scopes = ['repo']; // ✅ Minimal

const scopes = ['repo', 'admin:org', 'delete_repo']; // ❌ Excessive
```

### 4. Monitor Failed Attempts

```typescript
// Log failed authentication attempts
await prisma.auditLog.create({
  data: {
    action: 'login_failed',
    userId: attemptedUserId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  },
});

// Alert on suspicious patterns
if (failedAttempts > 5) {
  await sendSecurityAlert(userId, 'Multiple failed login attempts');
}
```

### 5. Keep Dependencies Updated

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix vulnerabilities
npm audit fix
```

### 6. Use HTTPS Everywhere

```nginx
# Nginx - Force HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

### 7. Implement Logging

```typescript
// Log security events
logger.info('User login', { userId, ip, timestamp });
logger.warn('Rate limit exceeded', { userId, endpoint });
logger.error('Authentication failed', { userId, reason });
```

### 8. Regular Security Audits

- [ ] Review API key permissions
- [ ] Check rate limiting effectiveness
- [ ] Audit user access logs
- [ ] Test OAuth flow security
- [ ] Verify encryption key rotation
- [ ] Review third-party integrations

## Security Checklist

### Pre-Production

- [ ] Environment variables validated
- [ ] Secrets are 32+ characters
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Security headers enabled
- [ ] Database credentials secured
- [ ] API keys rotated
- [ ] Encryption keys generated
- [ ] Backup encryption keys secured

### Post-Deployment

- [ ] Monitor rate limit hits
- [ ] Review authentication logs
- [ ] Check for blocked IPs
- [ ] Verify HTTPS certificates
- [ ] Test OAuth flows
- [ ] Audit API key usage
- [ ] Review security alerts
- [ ] Update dependencies monthly

## Security Incident Response

### If API Key Compromised

1. **Immediately revoke** the key
2. **Generate new** key
3. **Rotate** all related secrets
4. **Audit** recent API usage
5. **Investigate** how it was compromised
6. **Notify** affected users if needed

```typescript
// Revoke compromised key
await prisma.apiKey.update({
  where: { id: keyId },
  data: { isActive: false },
});

// Audit usage
const logs = await prisma.apiUsageLog.findMany({
  where: {
    userId,
    timestamp: { gte: suspiciousDate },
  },
});
```

### If Data Breach Suspected

1. **Isolate** affected systems
2. **Assess** scope of breach
3. **Preserve** logs and evidence
4. **Notify** users within 72 hours (GDPR)
5. **Rotate** all credentials
6. **Investigate** root cause
7. **Implement** fixes
8. **Document** incident

## Compliance

### GDPR

- ✅ Data encryption at rest and in transit
- ✅ User consent for data processing
- ✅ Right to deletion (account removal)
- ✅ Data portability (export feature)
- ✅ Breach notification (72 hours)

### SOC 2

- ✅ Access controls
- ✅ Encryption
- ✅ Audit logging
- ✅ Incident response plan
- ✅ Security monitoring

### PCI DSS (if handling payments)

- ✅ Network segmentation
- ✅ Strong encryption
- ✅ Access controls
- ✅ Regular security testing

## Reporting Security Issues

### Responsible Disclosure

Please report security vulnerabilities to:

- 🔒 Email: security@galaos.ai
- 🔐 PGP Key: https://galaos.ai/.well-known/pgp-key.asc

**Do not** open public GitHub issues for security vulnerabilities.

### Bug Bounty (Coming Soon)

We plan to launch a bug bounty program with rewards for:

- Critical vulnerabilities: $500-$2000
- High severity: $200-$500
- Medium severity: $50-$200

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Headers Guide](https://securityheaders.com/)
- [OAuth 2.0 Security](https://tools.ietf.org/html/rfc6819)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
