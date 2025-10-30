import fs from "fs";
import path from "path";
import { Context } from "../context";

const LOG_DIR = process.env.GALA_AUDIT_LOG_DIR || path.join(process.cwd(), ".galaos-logs");

function ensureDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

export interface AuditEntry {
  id: string;
  time: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resource?: string;
  input?: any;
  result?: any;
  decision?: { allow: boolean; reason?: string; superuser?: boolean };
}

export function writeAudit(ctx: Context, entry: Omit<AuditEntry, "time" | "id">) {
  ensureDir();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: AuditEntry = {
    id,
    time: new Date().toISOString(),
    userId: ctx.user?.id ?? null,
    userEmail: ctx.user?.email ?? null,
    ...entry,
  };
  const file = path.join(LOG_DIR, `${new Date().toISOString().slice(0,10)}.ndjson`);
  fs.appendFileSync(file, JSON.stringify(record) + "\n");
  return record;
}

