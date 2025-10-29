/**
 * Security Headers
 *
 * Implements security headers and CORS configuration
 * Protects against common web vulnerabilities
 */

export interface SecurityHeadersConfig {
  enableHSTS?: boolean;
  enableCSP?: boolean;
  enableXSSProtection?: boolean;
  enableFrameGuard?: boolean;
  enableNoSniff?: boolean;
  cspDirectives?: Record<string, string[]>;
  corsOrigins?: string | string[];
  allowCredentials?: boolean;
}

/**
 * Get security headers for HTTP responses
 */
export function getSecurityHeaders(config?: SecurityHeadersConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // HSTS (HTTP Strict Transport Security)
  if (config?.enableHSTS !== false) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Content Security Policy
  if (config?.enableCSP !== false) {
    const cspDirectives = config?.cspDirectives || {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://api.anthropic.com', 'https://api.openai.com'],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    };

    const csp = Object.entries(cspDirectives)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');

    headers['Content-Security-Policy'] = csp;
  }

  // XSS Protection
  if (config?.enableXSSProtection !== false) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  // Frame Guard (Clickjacking protection)
  if (config?.enableFrameGuard !== false) {
    headers['X-Frame-Options'] = 'DENY';
  }

  // No Sniff
  if (config?.enableNoSniff !== false) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer Policy
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

  // Permissions Policy
  headers['Permissions-Policy'] = [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', ');

  return headers;
}

/**
 * CORS Configuration
 */
export interface CORSConfig {
  origins: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Get CORS headers for HTTP responses
 */
export function getCORSHeaders(config: CORSConfig, origin?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  // Determine if origin is allowed
  const allowedOrigins = Array.isArray(config.origins) ? config.origins : [config.origins];
  const isAllowed =
    config.origins === '*' || (origin && allowedOrigins.includes(origin));

  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin || config.origins.toString();

    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    headers['Access-Control-Allow-Methods'] = (
      config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    ).join(', ');

    headers['Access-Control-Allow-Headers'] = (
      config.allowedHeaders || [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
      ]
    ).join(', ');

    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    }

    headers['Access-Control-Max-Age'] = (config.maxAge || 86400).toString();

    // Allow preflight request caching
    headers['Vary'] = 'Origin';
  }

  return headers;
}

/**
 * Middleware factory for security headers
 */
export function createSecurityHeadersMiddleware(config?: SecurityHeadersConfig) {
  const headers = getSecurityHeaders(config);

  return (req: any, res: any, next: any) => {
    // Apply security headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}

/**
 * Middleware factory for CORS
 */
export function createCORSMiddleware(config: CORSConfig) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      const corsHeaders = getCORSHeaders(config, origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      return res.status(204).end();
    }

    // Handle regular requests
    const corsHeaders = getCORSHeaders(config, origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  };
}

/**
 * Combined security middleware
 */
export function createSecurityMiddleware(
  securityConfig?: SecurityHeadersConfig,
  corsConfig?: CORSConfig
) {
  const securityHeaders = getSecurityHeaders(securityConfig);

  return (req: any, res: any, next: any) => {
    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Apply CORS if configured
    if (corsConfig) {
      const origin = req.headers.origin;

      if (req.method === 'OPTIONS') {
        const corsHeaders = getCORSHeaders(corsConfig, origin);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        return res.status(204).end();
      }

      const corsHeaders = getCORSHeaders(corsConfig, origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    next();
  };
}

/**
 * Validate request origin
 */
export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    // Exact match
    if (allowed === origin) {
      return true;
    }

    // Wildcard subdomain match
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain);
    }

    return false;
  });
}

/**
 * Generate Content Security Policy for Next.js
 */
export function generateCSPForNextJS(): string {
  const csp = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js
      "'unsafe-inline'", // Required for Next.js
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.anthropic.com',
      'https://api.openai.com',
      'wss:', // For WebSocket connections
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(csp)
    .map(([key, values]) => (values.length > 0 ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

export default {
  getSecurityHeaders,
  getCORSHeaders,
  createSecurityHeadersMiddleware,
  createCORSMiddleware,
  createSecurityMiddleware,
  validateOrigin,
  generateCSPForNextJS,
};
