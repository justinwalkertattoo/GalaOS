import { WorkflowNode, ExecutionContext, NodeExecutor } from './types';

export class BaseNodeExecutor implements NodeExecutor {
  type: string;

  constructor(type: string) {
    this.type = type;
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    throw new Error(`Execute method not implemented for ${this.type}`);
  }

  protected resolveVariables(value: any, context: ExecutionContext): any {
    if (typeof value === 'string') {
      // Replace {{variable}} with actual values from context
      return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        if (path.startsWith('node.')) {
          // Reference to another node's output
          const nodeId = path.split('.')[1];
          const result = context.nodeResults.get(nodeId);
          return result !== undefined ? JSON.stringify(result) : `{{${path}}}`;
        }
        // Variable reference
        const value = context.variables[path];
        return value !== undefined ? value : `{{${path}}}`;
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveVariables(item, context));
    }

    if (typeof value === 'object' && value !== null) {
      const resolved: any = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val, context);
      }
      return resolved;
    }

    return value;
  }
}

// HTTP Request Node
export class HttpRequestExecutor extends BaseNodeExecutor {
  constructor() {
    super('http_request');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = this.resolveVariables(node.data, context);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}

// Condition Node
export class ConditionExecutor extends BaseNodeExecutor {
  constructor() {
    super('condition');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { leftValue, operator, rightValue } = this.resolveVariables(node.data, context);

    switch (operator) {
      case 'equals':
        return leftValue === rightValue;
      case 'not_equals':
        return leftValue !== rightValue;
      case 'greater_than':
        return leftValue > rightValue;
      case 'less_than':
        return leftValue < rightValue;
      case 'contains':
        return String(leftValue).includes(String(rightValue));
      default:
        return false;
    }
  }
}

// Transform Data Node
export class TransformExecutor extends BaseNodeExecutor {
  constructor() {
    super('transform');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { input, transformations } = this.resolveVariables(node.data, context);

    let result = input;
    for (const transform of transformations || []) {
      result = this.applyTransformation(result, transform);
    }

    return result;
  }

  private applyTransformation(data: any, transform: any): any {
    const { type, params } = transform;

    switch (type) {
      case 'map':
        return Array.isArray(data) ? data.map((item: any) => params.mapping(item)) : data;
      case 'filter':
        return Array.isArray(data) ? data.filter((item: any) => params.condition(item)) : data;
      case 'extract':
        return params.path.split('.').reduce((obj: any, key: string) => obj?.[key], data);
      default:
        return data;
    }
  }
}

// Delay Node
export class DelayExecutor extends BaseNodeExecutor {
  constructor() {
    super('delay');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { duration } = this.resolveVariables(node.data, context);
    const ms = this.parseDuration(duration);

    await new Promise((resolve) => setTimeout(resolve, ms));
    return { delayed: ms };
  }

  private parseDuration(duration: string | number): number {
    if (typeof duration === 'number') return duration;

    const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
    if (!match) return 0;

    const [, amount, unit] = match;
    const num = parseInt(amount, 10);

    switch (unit) {
      case 'ms':
        return num;
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      default:
        return num;
    }
  }
}

// AI Node
export class AIExecutor extends BaseNodeExecutor {
  constructor() {
    super('ai');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const { prompt, model, agentId } = this.resolveVariables(node.data, context);

    // This would integrate with the AI orchestrator
    // For now, return a placeholder
    return {
      response: `AI response to: ${prompt}`,
      model: model || 'default',
      agentId: agentId || 'default',
    };
  }
}

// Human Input Node
export class HumanInputExecutor extends BaseNodeExecutor {
  constructor() {
    super('human_input');
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // This node pauses execution and waits for human input
    // The actual implementation would emit an event and wait for resume
    return {
      status: 'awaiting_input',
      prompt: node.data.prompt || 'Please provide input',
      inputType: node.data.inputType || 'text',
    };
  }
}
