import fs from 'fs';
import path from 'path';

function normalize(p: string) {
  return path.resolve(p);
}

function isAllowed(targetPath: string): boolean {
  const allow = (process.env.FS_ALLOWED_DIRS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allow.length === 0) return false;
  const resolved = normalize(targetPath);
  return allow.some(base => {
    const b = normalize(base);
    return resolved === b || resolved.startsWith(b + path.sep);
  });
}

export function safeRead(filePath: string): { ok: boolean; content?: string; error?: string } {
  try {
    const p = normalize(filePath);
    if (!isAllowed(p)) return { ok: false, error: 'Path not allowed' };
    const data = fs.readFileSync(p, 'utf8');
    return { ok: true, content: data };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function safeWrite(filePath: string, content: string): { ok: boolean; error?: string } {
  try {
    const p = normalize(filePath);
    if (!isAllowed(p)) return { ok: false, error: 'Path not allowed' };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function safeMove(src: string, dest: string): { ok: boolean; error?: string } {
  try {
    const s = normalize(src); const d = normalize(dest);
    if (!isAllowed(s) || !isAllowed(d)) return { ok: false, error: 'Path not allowed' };
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.renameSync(s, d);
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

export function safeDelete(filePath: string): { ok: boolean; error?: string } {
  try {
    const p = normalize(filePath);
    if (!isAllowed(p)) return { ok: false, error: 'Path not allowed' };
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

