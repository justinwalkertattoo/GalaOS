import { Context } from "../context";

export type ActionKind =
  | "generators.run"
  | "generators.create"
  | "system.selfAudit"
  | "system.diagnostics"
  | "updates.run"
  | "files.write"
  | "packages.install"
  | "shell.exec"
  | "files.read"
  | "files.move"
  | "files.delete"
  | "net.fetch";

export interface PolicyDecision {
  allow: boolean;
  reason?: string;
  superuser?: boolean;
}

function isSuperUser(ctx: Context): boolean {
  const devEmail = process.env.DEV_SUPERUSER_EMAIL?.toLowerCase();
  const devId = process.env.DEV_SUPERUSER_ID;
  if (!ctx.user) return false;
  if (devEmail && ctx.user.email?.toLowerCase() === devEmail) return true;
  if (devId && ctx.user.id === devId) return true;
  // Optional: local dev fallback (DO NOT enable in prod)
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SUPERUSER_LOCAL === "1") {
    return true;
  }
  return false;
}

export function decide(ctx: Context, action: ActionKind, resource?: string): PolicyDecision {
  const superuser = isSuperUser(ctx);
  // Superuser can do anything, with audit logging elsewhere
  if (superuser) return { allow: true, superuser };

  // Conservative defaults for non-superusers in dev: allow safe reads; gate writes
  switch (action) {
    case "system.diagnostics":
    case "system.selfAudit":
    case "files.read":
      return { allow: true };
    case "generators.run":
    case "generators.create":
    case "files.write":
    case "files.move":
    case "files.delete":
    case "packages.install":
    case "updates.run":
    case "shell.exec":
    case "net.fetch":
      return { allow: false, reason: "Not permitted without superuser override" };
    default:
      return { allow: false, reason: "Unknown action" };
  }
}
