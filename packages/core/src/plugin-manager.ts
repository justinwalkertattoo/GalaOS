/**
 * Plugin Manager for GalaOS
 *
 * Manages business modules (plugins) that extend GalaOS functionality.
 * Modules are installed per-workspace and can be activated/deactivated.
 */

import { PrismaClient } from '@galaos/db';

export interface BusinessModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  author: string;
  website?: string;
  repository?: string;
  defaultConfig: Record<string, any>;
  routes: ModuleRoute[];
  workflows: WorkflowTemplate[];
  databases: DatabaseTemplate[];
  requiredIntegrations?: string[];
  onInstall?: (workspaceId: string, config: any) => Promise<void>;
  onUninstall?: (workspaceId: string) => Promise<void>;
  onActivate?: (workspaceId: string) => Promise<void>;
  onDeactivate?: (workspaceId: string) => Promise<void>;
}

export interface ModuleRoute {
  path: string;
  name: string;
  description?: string;
  icon?: string;
  component: string;
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer';
  isPublic?: boolean;
  order?: number;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  template: any;
  trigger?: any;
}

export interface DatabaseTemplate {
  name: string;
  description?: string;
  icon?: string;
  schema: DatabaseProperty[];
  templateData?: any[];
}

export interface DatabaseProperty {
  name: string;
  type: string;
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

/**
 * Plugin Manager Class
 */
export class PluginManager {
  private prisma: PrismaClient;
  private registry: Map<string, BusinessModuleDefinition>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.registry = new Map();
  }

  /**
   * Register a business module
   */
  register(module: BusinessModuleDefinition): void {
    if (this.registry.has(module.id)) {
      throw new Error(`Module ${module.id} is already registered`);
    }
    this.registry.set(module.id, module);
    console.log(`Registered module: ${module.name} (${module.id})`);
  }

  /**
   * Get all registered modules
   */
  getRegisteredModules(): BusinessModuleDefinition[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get a specific module by ID
   */
  getModule(moduleId: string): BusinessModuleDefinition | undefined {
    return this.registry.get(moduleId);
  }

  /**
   * Install a module to a workspace
   */
  async installModule(
    workspaceId: string,
    moduleId: string,
    config?: Record<string, any>,
    installedBy?: string
  ): Promise<void> {
    const moduleDef = this.registry.get(moduleId);
    if (!moduleDef) {
      throw new Error(`Module ${moduleId} is not registered`);
    }

    // Check if already installed
    const existing = await this.prisma.businessModule.findUnique({
      where: {
        workspaceId_moduleType: {
          workspaceId,
          moduleType: moduleId,
        },
      },
    });

    if (existing) {
      throw new Error(`Module ${moduleId} is already installed in this workspace`);
    }

    // Merge provided config with defaults
    const finalConfig = {
      ...moduleDef.defaultConfig,
      ...(config || {}),
    };

    // Create the module record
    const module = await this.prisma.businessModule.create({
      data: {
        workspaceId,
        moduleType: moduleId,
        name: moduleDef.name,
        description: moduleDef.description,
        icon: moduleDef.icon,
        version: moduleDef.version,
        config: finalConfig,
        isInstalled: true,
        installedAt: new Date(),
        installedBy,
      },
    });

    // Create routes
    for (const route of moduleDef.routes) {
      await this.prisma.moduleRoute.create({
        data: {
          moduleId: module.id,
          path: route.path,
          name: route.name,
          description: route.description,
          icon: route.icon,
          component: route.component,
          requiredRole: route.requiredRole,
          isPublic: route.isPublic || false,
          order: route.order || 0,
        },
      });
    }

    // Create workflow templates
    for (const workflow of moduleDef.workflows) {
      await this.prisma.moduleWorkflow.create({
        data: {
          moduleId: module.id,
          name: workflow.name,
          description: workflow.description,
          category: workflow.category,
          template: workflow.template,
          trigger: workflow.trigger,
        },
      });
    }

    // Create database templates
    for (const db of moduleDef.databases) {
      await this.prisma.moduleDatabase.create({
        data: {
          moduleId: module.id,
          name: db.name,
          description: db.description,
          icon: db.icon,
          schema: db.schema,
          templateData: db.templateData,
        },
      });

      // Actually create the database in the workspace
      await this.createDatabaseFromTemplate(workspaceId, db);
    }

    // Run onInstall hook
    if (moduleDef.onInstall) {
      await moduleDef.onInstall(workspaceId, finalConfig);
    }

    console.log(`Installed module ${moduleDef.name} in workspace ${workspaceId}`);
  }

  /**
   * Uninstall a module from a workspace
   */
  async uninstallModule(workspaceId: string, moduleId: string): Promise<void> {
    const moduleDef = this.registry.get(moduleId);
    if (!moduleDef) {
      throw new Error(`Module ${moduleId} is not registered`);
    }

    const module = await this.prisma.businessModule.findUnique({
      where: {
        workspaceId_moduleType: {
          workspaceId,
          moduleType: moduleId,
        },
      },
    });

    if (!module) {
      throw new Error(`Module ${moduleId} is not installed in this workspace`);
    }

    // Run onUninstall hook
    if (moduleDef.onUninstall) {
      await moduleDef.onUninstall(workspaceId);
    }

    // Delete the module (cascades to routes, workflows, databases)
    await this.prisma.businessModule.delete({
      where: { id: module.id },
    });

    console.log(`Uninstalled module ${moduleDef.name} from workspace ${workspaceId}`);
  }

  /**
   * Activate a module in a workspace
   */
  async activateModule(workspaceId: string, moduleId: string): Promise<void> {
    const moduleDef = this.registry.get(moduleId);
    if (!moduleDef) {
      throw new Error(`Module ${moduleId} is not registered`);
    }

    const module = await this.prisma.businessModule.findUnique({
      where: {
        workspaceId_moduleType: {
          workspaceId,
          moduleType: moduleId,
        },
      },
    });

    if (!module) {
      throw new Error(`Module ${moduleId} is not installed in this workspace`);
    }

    if (module.isActive) {
      return; // Already active
    }

    // Run onActivate hook
    if (moduleDef.onActivate) {
      await moduleDef.onActivate(workspaceId);
    }

    // Update module status
    await this.prisma.businessModule.update({
      where: { id: module.id },
      data: { isActive: true },
    });

    console.log(`Activated module ${moduleDef.name} in workspace ${workspaceId}`);
  }

  /**
   * Deactivate a module in a workspace
   */
  async deactivateModule(workspaceId: string, moduleId: string): Promise<void> {
    const moduleDef = this.registry.get(moduleId);
    if (!moduleDef) {
      throw new Error(`Module ${moduleId} is not registered`);
    }

    const module = await this.prisma.businessModule.findUnique({
      where: {
        workspaceId_moduleType: {
          workspaceId,
          moduleType: moduleId,
        },
      },
    });

    if (!module) {
      throw new Error(`Module ${moduleId} is not installed in this workspace`);
    }

    if (!module.isActive) {
      return; // Already inactive
    }

    // Run onDeactivate hook
    if (moduleDef.onDeactivate) {
      await moduleDef.onDeactivate(workspaceId);
    }

    // Update module status
    await this.prisma.businessModule.update({
      where: { id: module.id },
      data: { isActive: false },
    });

    console.log(`Deactivated module ${moduleDef.name} in workspace ${workspaceId}`);
  }

  /**
   * Get all modules installed in a workspace
   */
  async getInstalledModules(workspaceId: string) {
    return this.prisma.businessModule.findMany({
      where: { workspaceId },
      include: {
        routes: true,
        workflows: true,
        databases: true,
      },
    });
  }

  /**
   * Get routes for active modules in a workspace
   */
  async getActiveRoutes(workspaceId: string) {
    const modules = await this.prisma.businessModule.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        routes: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return modules.flatMap(m => m.routes);
  }

  /**
   * Get workflows for active modules in a workspace
   */
  async getActiveWorkflows(workspaceId: string) {
    const modules = await this.prisma.businessModule.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        workflows: {
          where: { isActive: true },
        },
      },
    });

    return modules.flatMap(m => m.workflows);
  }

  /**
   * Update module configuration
   */
  async updateModuleConfig(
    workspaceId: string,
    moduleId: string,
    config: Record<string, any>
  ): Promise<void> {
    const module = await this.prisma.businessModule.findUnique({
      where: {
        workspaceId_moduleType: {
          workspaceId,
          moduleType: moduleId,
        },
      },
    });

    if (!module) {
      throw new Error(`Module ${moduleId} is not installed in this workspace`);
    }

    await this.prisma.businessModule.update({
      where: { id: module.id },
      data: {
        config,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated config for module ${moduleId} in workspace ${workspaceId}`);
  }

  /**
   * Create a database from a template
   */
  private async createDatabaseFromTemplate(
    workspaceId: string,
    template: DatabaseTemplate
  ): Promise<void> {
    // Create the database
    const database = await this.prisma.database.create({
      data: {
        workspaceId,
        name: template.name,
        description: template.description,
        icon: template.icon,
      },
    });

    // Create database properties
    for (const prop of template.schema) {
      await this.prisma.databaseProperty.create({
        data: {
          databaseId: database.id,
          name: prop.name,
          type: prop.type,
          options: prop.options,
        },
      });
    }

    // Add template data if provided
    if (template.templateData && template.templateData.length > 0) {
      for (const item of template.templateData) {
        await this.prisma.databaseItem.create({
          data: {
            databaseId: database.id,
            properties: item,
          },
        });
      }
    }

    console.log(`Created database "${template.name}" from template`);
  }
}

/**
 * Global plugin manager instance
 */
let pluginManagerInstance: PluginManager | null = null;

export function getPluginManager(prisma: PrismaClient): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager(prisma);
  }
  return pluginManagerInstance;
}
