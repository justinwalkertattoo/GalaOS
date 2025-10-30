export function parseList(envVal?: string): string[] {
  return (envVal || '').split(',').map(s=>s.trim()).filter(Boolean);
}

export function isHostAllowed(hostname: string): { allowed: boolean; reason?: string } {
  const allow = parseList(process.env.NET_ALLOWED_HOSTS);
  const block = parseList(process.env.NET_BLOCKED_HOSTS);
  const host = hostname.toLowerCase();
  if (block.some(b => host.endsWith(b.toLowerCase()))) return { allowed: false, reason: 'Host is blocked' };
  if (allow.length === 0) return { allowed: true };
  if (allow.some(a => host.endsWith(a.toLowerCase()))) return { allowed: true };
  return { allowed: false, reason: 'Host not in allowlist' };
}

