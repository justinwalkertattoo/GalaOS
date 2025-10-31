import { spawn } from 'child_process';

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  shell?: string;
  env?: Record<string, string | undefined>;
  maxOutputKb?: number;
}

export function runCommand(cmd: string, args: string[] = [], opts: ExecOptions = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const timeout = opts.timeoutMs ?? Number(process.env.SHELL_TIMEOUT_MS || 60000);
    const maxKb = opts.maxOutputKb ?? Number(process.env.EXEC_MAX_OUTPUT_KB || 5120);
    const child = spawn(cmd, args, { cwd: opts.cwd || process.cwd(), env: { ...process.env, ...opts.env }, shell: false });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, timeout);
    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (Buffer.byteLength(stdout, 'utf8') / 1024 > maxKb) {
        stdout = stdout.slice(-maxKb * 1024);
      }
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      if (Buffer.byteLength(stderr, 'utf8') / 1024 > maxKb) {
        stderr = stderr.slice(-maxKb * 1024);
      }
    });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 0, stdout, stderr }); });
  });
}

