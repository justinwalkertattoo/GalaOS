import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import Docker from 'dockerode';

const docker = new Docker();

const createSandboxSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.enum(['javascript', 'typescript', 'python', 'bash', 'go', 'rust']),
  image: z.string().optional(),
});

const executeCodeSchema = z.object({
  sandboxId: z.string(),
  code: z.string(),
  language: z.string(),
  filename: z.string().optional(),
});

const fileOperationSchema = z.object({
  sandboxId: z.string(),
  path: z.string(),
  content: z.string().optional(),
});

// Language to Docker image mapping
const LANGUAGE_IMAGES: Record<string, string> = {
  javascript: 'node:20-alpine',
  typescript: 'node:20-alpine',
  python: 'python:3.11-alpine',
  bash: 'alpine:latest',
  go: 'golang:1.21-alpine',
  rust: 'rust:1.75-alpine',
};

// Language execution commands
const EXEC_COMMANDS: Record<string, (filename: string) => string[]> = {
  javascript: (f) => ['node', f],
  typescript: (f) => ['npx', 'ts-node', f],
  python: (f) => ['python', f],
  bash: (f) => ['sh', f],
  go: (f) => ['go', 'run', f],
  rust: (f) => ['cargo', 'run'],
};

export const sandboxRouter = router({
  // List all sandboxes
  list: protectedProcedure.query(async ({ ctx }) => {
    const sandboxes = await ctx.prisma.sandbox.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return sandboxes;
  }),

  // Get single sandbox
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!sandbox) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return sandbox;
    }),

  // Create sandbox
  create: protectedProcedure
    .input(createSandboxSchema)
    .mutation(async ({ ctx, input }) => {
      const image = input.image || LANGUAGE_IMAGES[input.language] || 'alpine:latest';

      try {
        // Pull image if not exists
        await docker.pull(image);

        // Create container
        const container = await docker.createContainer({
          Image: image,
          Cmd: ['/bin/sh', '-c', 'tail -f /dev/null'], // Keep container running
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          OpenStdin: true,
          Tty: true,
          WorkingDir: '/workspace',
          HostConfig: {
            AutoRemove: false,
            Memory: 512 * 1024 * 1024, // 512MB limit
            CpuQuota: 50000, // 50% CPU
          },
        });

        await container.start();

        // Create sandbox record
        const sandbox = await ctx.prisma.sandbox.create({
          data: {
            name: input.name,
            language: input.language,
            image,
            containerId: container.id,
            status: 'running',
            userId: ctx.user.id,
            files: {},
            executions: [],
          },
        });

        return sandbox;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create sandbox: ${error.message}`,
        });
      }
    }),

  // Start sandbox container
  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        await container.start();

        await ctx.prisma.sandbox.update({
          where: { id: input.id },
          data: { status: 'running' },
        });

        return { success: true, status: 'running' };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start sandbox: ${error.message}`,
        });
      }
    }),

  // Stop sandbox container
  stop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        await container.stop();

        await ctx.prisma.sandbox.update({
          where: { id: input.id },
          data: { status: 'stopped' },
        });

        return { success: true, status: 'stopped' };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to stop sandbox: ${error.message}`,
        });
      }
    }),

  // Delete sandbox
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!sandbox) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        // Remove container if exists
        if (sandbox.containerId) {
          const container = docker.getContainer(sandbox.containerId);
          try {
            await container.stop();
          } catch {
            // Container might already be stopped
          }
          await container.remove();
        }

        // Delete sandbox record
        await ctx.prisma.sandbox.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to delete sandbox: ${error.message}`,
        });
      }
    }),

  // Execute code in sandbox
  execute: protectedProcedure
    .input(executeCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.sandboxId,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (sandbox.status !== 'running') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Sandbox is not running',
        });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        const filename = input.filename || `script.${getFileExtension(input.language)}`;
        const filepath = `/workspace/${filename}`;

        // Write code to file in container
        const createFileExec = await container.exec({
          Cmd: ['sh', '-c', `echo '${input.code.replace(/'/g, "'\\''")}' > ${filepath}`],
          AttachStdout: true,
          AttachStderr: true,
        });

        await createFileExec.start({});

        // Execute the file
        const execCmd = EXEC_COMMANDS[input.language]?.(filepath) || ['sh', filepath];
        const exec = await container.exec({
          Cmd: execCmd,
          AttachStdout: true,
          AttachStderr: true,
          WorkingDir: '/workspace',
        });

        const stream = await exec.start({});

        // Collect output
        let output = '';
        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString();
        });

        await new Promise((resolve) => {
          stream.on('end', resolve);
        });

        // Get exit code
        const inspectResult = await exec.inspect();
        const exitCode = inspectResult.ExitCode || 0;

        // Record execution
        const executions = Array.isArray(sandbox.executions) ? sandbox.executions : [];
        executions.push({
          timestamp: new Date().toISOString(),
          code: input.code,
          output,
          exitCode,
        });

        await ctx.prisma.sandbox.update({
          where: { id: input.sandboxId },
          data: {
            executions,
            lastRunAt: new Date(),
          },
        });

        return {
          success: exitCode === 0,
          output: output.trim(),
          exitCode,
        };
      } catch (error: any) {
        return {
          success: false,
          output: `Error: ${error.message}`,
          exitCode: 1,
        };
      }
    }),

  // Read file from sandbox
  readFile: protectedProcedure
    .input(z.object({ sandboxId: z.string(), path: z.string() }))
    .query(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.sandboxId,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        const exec = await container.exec({
          Cmd: ['cat', input.path],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});

        let content = '';
        stream.on('data', (chunk: Buffer) => {
          content += chunk.toString();
        });

        await new Promise((resolve) => {
          stream.on('end', resolve);
        });

        return { content: content.trim() };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to read file: ${error.message}`,
        });
      }
    }),

  // Write file to sandbox
  writeFile: protectedProcedure
    .input(fileOperationSchema)
    .mutation(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.sandboxId,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        const content = input.content || '';

        const exec = await container.exec({
          Cmd: ['sh', '-c', `echo '${content.replace(/'/g, "'\\''")}' > ${input.path}`],
          AttachStdout: true,
          AttachStderr: true,
        });

        await exec.start({});

        // Update files record
        const files = typeof sandbox.files === 'object' ? sandbox.files : {};
        (files as any)[input.path] = {
          content: content.substring(0, 100), // Store preview
          lastModified: new Date().toISOString(),
        };

        await ctx.prisma.sandbox.update({
          where: { id: input.sandboxId },
          data: { files },
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to write file: ${error.message}`,
        });
      }
    }),

  // List files in sandbox
  listFiles: protectedProcedure
    .input(z.object({ sandboxId: z.string(), path: z.string().default('/workspace') }))
    .query(async ({ ctx, input }) => {
      const sandbox = await ctx.prisma.sandbox.findFirst({
        where: {
          id: input.sandboxId,
          userId: ctx.user.id,
        },
      });

      if (!sandbox || !sandbox.containerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      try {
        const container = docker.getContainer(sandbox.containerId);
        const exec = await container.exec({
          Cmd: ['ls', '-la', input.path],
          AttachStdout: true,
          AttachStderr: true,
        });

        const stream = await exec.start({});

        let output = '';
        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString();
        });

        await new Promise((resolve) => {
          stream.on('end', resolve);
        });

        return { files: output.trim() };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to list files: ${error.message}`,
        });
      }
    }),

  // Get sandbox stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const sandboxes = await ctx.prisma.sandbox.findMany({
      where: { userId: ctx.user.id },
    });

    const byLanguage = sandboxes.reduce((acc: Record<string, number>, sandbox: any) => {
      acc[sandbox.language] = (acc[sandbox.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = sandboxes.reduce((acc: Record<string, number>, sandbox: any) => {
      acc[sandbox.status] = (acc[sandbox.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: sandboxes.length,
      byLanguage,
      byStatus,
      running: byStatus.running || 0,
    };
  }),
});

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    bash: 'sh',
    go: 'go',
    rust: 'rs',
  };
  return extensions[language] || 'txt';
}
