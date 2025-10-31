/**
 * Business Modules Router
 * API endpoints for managing business modules (plugins)
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { getPluginManager } from '@galaos/core';
import { prisma } from '@galaos/db';

const pluginManager = getPluginManager(prisma);

export const modulesRouter = router({
  /**
   * List all available modules (from registry)
   */
  listAvailable: protectedProcedure.query(async () => {
    return pluginManager.getRegisteredModules();
  }),

  /**
   * List installed modules for a workspace
   */
  listInstalled: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
    }))
    .query(async ({ input }) => {
      return pluginManager.getInstalledModules(input.workspaceId);
    }),

  /**
   * Get details of a specific module
   */
  getModule: protectedProcedure
    .input(z.object({
      moduleId: z.string(),
    }))
    .query(async ({ input }) => {
      const module = pluginManager.getModule(input.moduleId);
      if (!module) {
        throw new Error(`Module ${input.moduleId} not found`);
      }
      return module;
    }),

  /**
   * Install a module to a workspace
   */
  install: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      moduleId: z.string(),
      config: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await pluginManager.installModule(
        input.workspaceId,
        input.moduleId,
        input.config,
        ctx.user.id
      );
      return { success: true };
    }),

  /**
   * Uninstall a module from a workspace
   */
  uninstall: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      moduleId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await pluginManager.uninstallModule(input.workspaceId, input.moduleId);
      return { success: true };
    }),

  /**
   * Activate a module in a workspace
   */
  activate: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      moduleId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await pluginManager.activateModule(input.workspaceId, input.moduleId);
      return { success: true };
    }),

  /**
   * Deactivate a module in a workspace
   */
  deactivate: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      moduleId: z.string(),
    }))
    .mutation(async ({ input }) => {
      await pluginManager.deactivateModule(input.workspaceId, input.moduleId);
      return { success: true };
    }),

  /**
   * Update module configuration
   */
  updateConfig: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      moduleId: z.string(),
      config: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      await pluginManager.updateModuleConfig(
        input.workspaceId,
        input.moduleId,
        input.config
      );
      return { success: true };
    }),

  /**
   * Get active routes for a workspace
   */
  getRoutes: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
    }))
    .query(async ({ input }) => {
      return pluginManager.getActiveRoutes(input.workspaceId);
    }),

  /**
   * Get active workflows for a workspace
   */
  getWorkflows: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
    }))
    .query(async ({ input }) => {
      return pluginManager.getActiveWorkflows(input.workspaceId);
    }),
});
