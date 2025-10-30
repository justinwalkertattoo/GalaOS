import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import path from "path";
import { spawn } from "child_process";

// Whitelist available generators to prevent arbitrary execution
const ALLOWED_GENERATORS = ["new-package", "nextjs-feature"] as const;

function runTurboGenRaw(args: Record<string, unknown>): Promise<{ code: number; stdout: string; stderr: string }>{
  return new Promise((resolve) => {
    const cli = path.resolve(process.cwd(), "node_modules", "@turbo", "gen", "dist", "cli.js");
    const json = JSON.stringify(args);
    const child = spawn(process.execPath, [cli, "raw", "run", "--json", json, "-c", "turbo/generators/config.ts"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export const generatorsRouter = router({
  list: protectedProcedure.query(() => {
    return {
      generators: ALLOWED_GENERATORS.map((name) => ({
        name,
        description:
          name === "new-package"
            ? "Scaffold a new package in packages/*"
            : "Scaffold a Next.js App Router feature in apps/web",
      })),
    };
  }),

  run: protectedProcedure
    .input(
      z.discriminatedUnion("name", [
        z.object({
          name: z.literal("new-package"),
          params: z.object({
            name: z.string().min(1).regex(/^[a-zA-Z0-9-_.]+$/),
            description: z.string().optional().default(""),
          }),
        }),
        z.object({
          name: z.literal("nextjs-feature"),
          params: z.object({
            name: z.string().min(1).regex(/^[a-zA-Z0-9-_.]+$/),
            addComponent: z.boolean().default(true),
            addApiRoute: z.boolean().default(false),
          }),
        }),
      ])
    )
    .mutation(async ({ input }) => {
      if (!ALLOWED_GENERATORS.includes(input.name as any)) {
        throw new Error("Generator not allowed");
      }

      const { name, params } = input as any;
      const { code, stdout, stderr } = await runTurboGenRaw({
        generatorName: name,
        ...params,
      });

      if (code !== 0) {
        return { ok: false as const, code, stderr, stdout };
      }

      return { ok: true as const, code, stdout };
    }),
});

