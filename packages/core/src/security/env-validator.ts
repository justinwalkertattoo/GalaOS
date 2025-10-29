/**
 * Environment Variable Validator
 *
 * Validates and enforces security requirements for environment variables
 * Prevents accidental exposure of secrets and ensures proper configuration
 */

import { z } from 'zod';

// Define required and optional environment variables with validation
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().optional(),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // AI Providers (all optional but at least one should be set)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // OAuth Client IDs and Secrets
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  NOTION_CLIENT_ID: z.string().optional(),
  NOTION_CLIENT_SECRET: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // API Configuration
  API_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  API_CORS_ORIGIN: z.string().default('*'),
  API_RATE_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('100'),

  // Worker Configuration
  WORKER_CONCURRENCY: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Feature Flags
  ENABLE_SANDBOX: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  ENABLE_TELEMETRY: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),

  // Vector Database
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),

  // Neo4j Knowledge Graph
  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 */
export function validateEnv(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional custom validations
    validateAtLeastOneAIProvider(parsed);
    validateProductionSecurity(parsed);
    checkForWeakSecrets(parsed);

    return parsed;
  } catch (error: any) {
    console.error('❌ Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Ensure at least one AI provider is configured
 */
function validateAtLeastOneAIProvider(env: any): void {
  const providers = [
    env.OPENAI_API_KEY,
    env.ANTHROPIC_API_KEY,
    env.GEMINI_API_KEY,
    env.PERPLEXITY_API_KEY,
    env.HUGGINGFACE_API_KEY,
  ];

  if (!providers.some(Boolean)) {
    throw new Error(
      'At least one AI provider API key must be configured (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, PERPLEXITY_API_KEY, or HUGGINGFACE_API_KEY)'
    );
  }
}

/**
 * Validate production security requirements
 */
function validateProductionSecurity(env: any): void {
  if (env.NODE_ENV === 'production') {
    // Ensure secrets are not default values
    if (env.NEXTAUTH_SECRET === 'changeme' || env.NEXTAUTH_SECRET.length < 32) {
      throw new Error('NEXTAUTH_SECRET must be a strong secret in production (min 32 characters)');
    }

    if (env.ENCRYPTION_KEY === 'changeme' || env.ENCRYPTION_KEY.length < 32) {
      throw new Error('ENCRYPTION_KEY must be a strong secret in production (min 32 characters)');
    }

    // Ensure CORS is not wildcard in production
    if (env.API_CORS_ORIGIN === '*') {
      console.warn('⚠️  WARNING: API_CORS_ORIGIN is set to "*" in production. This is insecure!');
    }

    // Ensure HTTPS for production URLs
    if (!env.NEXTAUTH_URL.startsWith('https://')) {
      throw new Error('NEXTAUTH_URL must use HTTPS in production');
    }
  }
}

/**
 * Check for commonly weak secrets
 */
function checkForWeakSecrets(env: any): void {
  const weakSecrets = [
    'changeme',
    'password',
    '12345678',
    'secret',
    'test',
    'development',
    'admin',
  ];

  const secretFields = [
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'SLACK_CLIENT_SECRET',
    'NOTION_CLIENT_SECRET',
  ];

  for (const field of secretFields) {
    const value = env[field];
    if (value && weakSecrets.some((weak) => value.toLowerCase().includes(weak))) {
      console.warn(`⚠️  WARNING: ${field} appears to be a weak secret`);
    }
  }
}

/**
 * Mask sensitive environment variables for logging
 */
export function maskEnv(env: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'API_KEY',
    'SECRET',
    'PASSWORD',
    'TOKEN',
    'DATABASE_URL',
    'REDIS_URL',
    'ENCRYPTION_KEY',
  ];

  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(env)) {
    if (sensitiveKeys.some((sensitive) => key.includes(sensitive))) {
      masked[key] = value ? `${String(value).slice(0, 4)}...${String(value).slice(-4)}` : undefined;
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Generate a secure random secret
 */
export function generateSecret(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let result = '';
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

export default validateEnv;
