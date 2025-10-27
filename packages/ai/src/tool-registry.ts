import { ToolDefinition } from './types';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerMultiple(tools: ToolDefinition[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByNames(names: string[]): ToolDefinition[] {
    return names.map((name) => this.get(name)).filter(Boolean) as ToolDefinition[];
  }

  async execute(name: string, parameters: any): Promise<any> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate parameters
    const validated = tool.parameters.parse(parameters);

    // Execute tool
    return await tool.execute(validated);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Global tool registry instance
export const globalToolRegistry = new ToolRegistry();
