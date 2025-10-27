import { BaseIntegration, IntegrationAction } from './base';

export class IntegrationRegistry {
  private integrations: Map<string, BaseIntegration> = new Map();
  private actions: Map<string, IntegrationAction> = new Map();

  register(integration: BaseIntegration): void {
    this.integrations.set(integration.config.id, integration);
  }

  registerAction(integrationId: string, action: IntegrationAction): void {
    const key = `${integrationId}.${action.name}`;
    this.actions.set(key, action);
  }

  getIntegration(id: string): BaseIntegration | undefined {
    return this.integrations.get(id);
  }

  getAction(integrationId: string, actionName: string): IntegrationAction | undefined {
    const key = `${integrationId}.${actionName}`;
    return this.actions.get(key);
  }

  listIntegrations(): BaseIntegration[] {
    return Array.from(this.integrations.values());
  }

  listActions(integrationId: string): IntegrationAction[] {
    return Array.from(this.actions.entries())
      .filter(([key]) => key.startsWith(`${integrationId}.`))
      .map(([, action]) => action);
  }

  async executeAction(
    integrationId: string,
    actionName: string,
    input: any,
    credentials: any
  ): Promise<any> {
    const action = this.getAction(integrationId, actionName);
    if (!action) {
      throw new Error(`Action not found: ${integrationId}.${actionName}`);
    }

    // Validate input
    const validatedInput = action.inputSchema.parse(input);

    // Execute action
    return await action.execute(validatedInput, credentials);
  }
}

export const globalIntegrationRegistry = new IntegrationRegistry();
