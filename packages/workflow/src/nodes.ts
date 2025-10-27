import { NodeExecutor } from './types';
import {
  HttpRequestExecutor,
  ConditionExecutor,
  TransformExecutor,
  DelayExecutor,
  AIExecutor,
  HumanInputExecutor,
} from './executor';

export class NodeExecutorRegistry {
  private executors: Map<string, NodeExecutor> = new Map();

  constructor() {
    // Register built-in executors
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new HttpRequestExecutor());
    this.register(new ConditionExecutor());
    this.register(new TransformExecutor());
    this.register(new DelayExecutor());
    this.register(new AIExecutor());
    this.register(new HumanInputExecutor());
  }

  register(executor: NodeExecutor): void {
    this.executors.set(executor.type, executor);
  }

  get(type: string): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  has(type: string): boolean {
    return this.executors.has(type);
  }

  list(): string[] {
    return Array.from(this.executors.keys());
  }
}

export const globalNodeExecutorRegistry = new NodeExecutorRegistry();
