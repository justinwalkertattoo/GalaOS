export function parseList(envVal?: string): string[] {
  return (envVal || '').split(',').map(s=>s.trim()).filter(Boolean);
}

export function isHostAllowed(hostname: string): { allowed: boolean; reason?: string } {
  const allow = parseList(process.env.NET_ALLOWED_HOSTS);
  const block = parseList(process.env.NET_BLOCKED_HOSTS);
  const host = hostname.toLowerCase();

  // Explicit user blocklist
  if (block.some(b => host.endsWith(b.toLowerCase()))) return { allowed: false, reason: 'Host is blocked' };

  // Default protections: block metadata endpoints and private ranges unless explicitly allowed
  const defaultBlockedHosts = ['metadata.google.internal', 'localhost', '127.0.0.1'];
  if (defaultBlockedHosts.some(h => host === h || host.endsWith(`.${h}`))) {
    if (!allow.some(a => host.endsWith(a.toLowerCase()))) return { allowed: false, reason: 'Default-blocked host' };
  }
  // Block link-local metadata IP
  if (host === '169.254.169.254') {
    if (!allow.includes(host)) return { allowed: false, reason: 'Metadata IP blocked' };
  }
  // Block RFC1918/private IPv4 if detected
  const ipv4 = /^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : '';
  if (ipv4) {
    const [a, b] = ipv4.split('.').map(n => parseInt(n, 10));
    const isPrivate = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    if (isPrivate && !allow.includes(ipv4)) return { allowed: false, reason: 'Private IP blocked' };
  }

  // If no allowlist provided, allow the rest by default
  if (allow.length === 0) return { allowed: true };

  // Allow if hostname matches allowlist
  if (allow.some(a => host.endsWith(a.toLowerCase()))) return { allowed: true };
  return { allowed: false, reason: 'Host not in allowlist' };
}
