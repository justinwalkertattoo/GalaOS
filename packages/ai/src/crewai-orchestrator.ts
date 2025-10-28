/**
 * CrewAI Integration for GalaOS
 *
 * Multi-agent orchestration system that allows multiple AI agents
 * to collaborate on complex tasks with defined roles, goals, and workflows.
 *
 * Key Concepts:
 * - **Agents**: AI entities with specific roles and expertise
 * - **Tasks**: Work items assigned to agents
 * - **Crews**: Teams of agents working together
 * - **Processes**: How agents collaborate (sequential, hierarchical, consensus)
 * - **Tools**: Capabilities agents can use (integrations, APIs, etc.)
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Agent Configuration
export interface AgentConfig {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose?: boolean;
  allowDelegation?: boolean;
  maxIter?: number;
  maxRPM?: number;
  tools?: AgentTool[];
  llmConfig?: {
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

// Task Configuration
export interface TaskConfig {
  id: string;
  description: string;
  expectedOutput: string;
  agent?: string; // Agent ID assigned to this task
  context?: TaskContext;
  tools?: string[];
  async?: boolean;
  callback?: (result: TaskResult) => Promise<void>;
}

// Task Context
export interface TaskContext {
  dependencies?: string[]; // Task IDs this task depends on
  sharedData?: Record<string, any>;
  deadline?: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Task Result
export interface TaskResult {
  taskId: string;
  agentId: string;
  output: string;
  rawOutput?: any;
  status: 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime: Date;
  duration: number;
  tokensUsed?: number;
  error?: string;
}

// Agent Tool
export interface AgentTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  execute: (input: any) => Promise<any>;
}

// Crew Process Types
export enum CrewProcess {
  SEQUENTIAL = 'sequential', // Tasks executed one after another
  HIERARCHICAL = 'hierarchical', // Manager assigns tasks to workers
  CONSENSUS = 'consensus', // Agents vote on decisions
  PARALLEL = 'parallel', // Tasks executed simultaneously
}

// Crew Configuration
export interface CrewConfig {
  id: string;
  name: string;
  description: string;
  agents: AgentConfig[];
  tasks: TaskConfig[];
  process: CrewProcess;
  verbose?: boolean;
  managerId?: string; // For hierarchical process
  maxRetries?: number;
  timeout?: number; // milliseconds
}

/**
 * CrewAI Agent
 */
export class CrewAgent {
  private config: AgentConfig;
  private anthropic: Anthropic;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Execute a task
   */
  async executeTask(task: TaskConfig, context?: Record<string, any>): Promise<TaskResult> {
    const startTime = new Date();

    try {
      if (this.config.verbose) {
        console.log(`[${this.config.role}] Starting task: ${task.description}`);
      }

      // Build system prompt with role, goal, and backstory
      const systemPrompt = this.buildSystemPrompt();

      // Build task prompt with context
      const taskPrompt = this.buildTaskPrompt(task, context);

      // Execute with Claude
      const response = await this.anthropic.messages.create({
        model: this.config.llmConfig?.model || 'claude-3-5-sonnet-20250219',
        max_tokens: this.config.llmConfig?.maxTokens || 4096,
        temperature: this.config.llmConfig?.temperature || 0.7,
        system: systemPrompt,
        messages: [
          ...(this.conversationHistory as any[]),
          {
            role: 'user',
            content: taskPrompt,
          },
        ],
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';

      // Store in conversation history
      this.conversationHistory.push(
        { role: 'user', content: taskPrompt },
        { role: 'assistant', content: output }
      );

      // Limit history size
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      const endTime = new Date();

      if (this.config.verbose) {
        console.log(`[${this.config.role}] Completed task: ${task.id}`);
      }

      return {
        taskId: task.id,
        agentId: this.config.id,
        output,
        rawOutput: response,
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
      };
    } catch (error: any) {
      const endTime = new Date();

      if (this.config.verbose) {
        console.error(`[${this.config.role}] Task failed: ${error.message}`);
      }

      return {
        taskId: task.id,
        agentId: this.config.id,
        output: '',
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: error.message,
      };
    }
  }

  /**
   * Build system prompt from agent config
   */
  private buildSystemPrompt(): string {
    return `You are ${this.config.role}.

Your Goal: ${this.config.goal}

Your Backstory: ${this.config.backstory}

${this.config.allowDelegation ? 'You can delegate tasks to other agents if needed.' : 'You work independently and complete tasks yourself.'}

${this.config.tools && this.config.tools.length > 0 ? `Available Tools:\n${this.config.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}` : ''}

Always provide high-quality, detailed output that meets the expected results.`;
  }

  /**
   * Build task prompt with context
   */
  private buildTaskPrompt(task: TaskConfig, context?: Record<string, any>): string {
    let prompt = `Task: ${task.description}\n\nExpected Output: ${task.expectedOutput}`;

    if (context) {
      prompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    if (task.context?.sharedData) {
      prompt += `\n\nShared Data from Previous Tasks:\n${JSON.stringify(task.context.sharedData, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

/**
 * CrewAI Crew Orchestrator
 */
export class Crew {
  private config: CrewConfig;
  private agents: Map<string, CrewAgent> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();

  constructor(config: CrewConfig) {
    this.config = config;

    // Initialize agents
    for (const agentConfig of config.agents) {
      this.agents.set(agentConfig.id, new CrewAgent(agentConfig));
    }
  }

  /**
   * Execute all tasks based on the crew process
   */
  async kickoff(): Promise<CrewResult> {
    const startTime = new Date();

    try {
      switch (this.config.process) {
        case CrewProcess.SEQUENTIAL:
          await this.executeSequential();
          break;

        case CrewProcess.HIERARCHICAL:
          await this.executeHierarchical();
          break;

        case CrewProcess.PARALLEL:
          await this.executeParallel();
          break;

        case CrewProcess.CONSENSUS:
          await this.executeConsensus();
          break;

        default:
          throw new Error(`Unknown process: ${this.config.process}`);
      }

      const endTime = new Date();

      return {
        crewId: this.config.id,
        success: true,
        results: Array.from(this.taskResults.values()),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error: any) {
      const endTime = new Date();

      return {
        crewId: this.config.id,
        success: false,
        results: Array.from(this.taskResults.values()),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: error.message,
      };
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(): Promise<void> {
    const sharedContext: Record<string, any> = {};

    for (const task of this.config.tasks) {
      const agent = this.getAgentForTask(task);

      if (this.config.verbose) {
        console.log(`[Crew] Executing task ${task.id} with agent ${agent.getConfig().role}`);
      }

      const result = await agent.executeTask(task, sharedContext);
      this.taskResults.set(task.id, result);

      // Share results with next tasks
      if (result.status === 'completed') {
        sharedContext[task.id] = result.output;
      }

      // Run callback if provided
      if (task.callback) {
        await task.callback(result);
      }
    }
  }

  /**
   * Execute tasks in parallel
   */
  private async executeParallel(): Promise<void> {
    const promises = this.config.tasks.map(async (task) => {
      const agent = this.getAgentForTask(task);
      const result = await agent.executeTask(task);
      this.taskResults.set(task.id, result);

      if (task.callback) {
        await task.callback(result);
      }

      return result;
    });

    await Promise.all(promises);
  }

  /**
   * Execute with hierarchical process (manager delegates)
   */
  private async executeHierarchical(): Promise<void> {
    if (!this.config.managerId) {
      throw new Error('Hierarchical process requires a manager agent');
    }

    const manager = this.agents.get(this.config.managerId);
    if (!manager) {
      throw new Error(`Manager agent not found: ${this.config.managerId}`);
    }

    // Manager decides task assignment and execution order
    const planningTask: TaskConfig = {
      id: 'planning',
      description: `Plan how to execute these tasks:\n${this.config.tasks.map(t => `- ${t.description}`).join('\n')}`,
      expectedOutput: 'A detailed execution plan with task assignments',
    };

    const planResult = await manager.executeTask(planningTask);
    this.taskResults.set('planning', planResult);

    // Execute tasks based on manager's plan
    // For simplicity, we'll execute sequentially
    await this.executeSequential();
  }

  /**
   * Execute with consensus process (agents vote)
   */
  private async executeConsensus(): Promise<void> {
    for (const task of this.config.tasks) {
      // All agents work on the task
      const results = await Promise.all(
        Array.from(this.agents.values()).map((agent) => agent.executeTask(task))
      );

      // Aggregate results (simple majority or best quality)
      const bestResult = this.selectBestResult(results);
      this.taskResults.set(task.id, bestResult);

      if (task.callback) {
        await task.callback(bestResult);
      }
    }
  }

  /**
   * Select best result from consensus
   */
  private selectBestResult(results: TaskResult[]): TaskResult {
    // Simple heuristic: longest output or first successful
    const completed = results.filter((r) => r.status === 'completed');
    if (completed.length === 0) {
      return results[0];
    }

    return completed.reduce((best, current) =>
      current.output.length > best.output.length ? current : best
    );
  }

  /**
   * Get agent for a task
   */
  private getAgentForTask(task: TaskConfig): CrewAgent {
    if (task.agent) {
      const agent = this.agents.get(task.agent);
      if (agent) return agent;
    }

    // Default to first agent
    return Array.from(this.agents.values())[0];
  }

  /**
   * Get crew configuration
   */
  getConfig(): CrewConfig {
    return this.config;
  }

  /**
   * Get all task results
   */
  getResults(): TaskResult[] {
    return Array.from(this.taskResults.values());
  }
}

// Crew Result
export interface CrewResult {
  crewId: string;
  success: boolean;
  results: TaskResult[];
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
}

/**
 * Crew Builder - Fluent API for creating crews
 */
export class CrewBuilder {
  private config: Partial<CrewConfig> = {
    agents: [],
    tasks: [],
    process: CrewProcess.SEQUENTIAL,
  };

  crew(id: string, name: string, description: string): this {
    this.config.id = id;
    this.config.name = name;
    this.config.description = description;
    return this;
  }

  agent(config: AgentConfig): this {
    this.config.agents!.push(config);
    return this;
  }

  task(config: TaskConfig): this {
    this.config.tasks!.push(config);
    return this;
  }

  process(process: CrewProcess): this {
    this.config.process = process;
    return this;
  }

  manager(agentId: string): this {
    this.config.managerId = agentId;
    return this;
  }

  verbose(verbose: boolean = true): this {
    this.config.verbose = verbose;
    return this;
  }

  build(): Crew {
    if (!this.config.id || !this.config.name) {
      throw new Error('Crew must have id and name');
    }

    if (this.config.agents!.length === 0) {
      throw new Error('Crew must have at least one agent');
    }

    if (this.config.tasks!.length === 0) {
      throw new Error('Crew must have at least one task');
    }

    return new Crew(this.config as CrewConfig);
  }
}

// Example Usage
export function createExampleCrew(): Crew {
  return new CrewBuilder()
    .crew('research-crew', 'Research Team', 'Comprehensive research and analysis crew')
    .agent({
      id: 'researcher',
      role: 'Senior Research Analyst',
      goal: 'Uncover cutting-edge developments and insights',
      backstory: 'You are an expert analyst with years of experience in research',
      verbose: true,
    })
    .agent({
      id: 'writer',
      role: 'Tech Content Strategist',
      goal: 'Craft compelling and technically accurate content',
      backstory: 'You are a seasoned writer specialized in technology and AI',
      verbose: true,
    })
    .task({
      id: 'research',
      description: 'Research the latest trends in AI and machine learning',
      expectedOutput: 'A comprehensive report on AI trends with key insights',
      agent: 'researcher',
    })
    .task({
      id: 'write',
      description: 'Write an engaging blog post based on the research',
      expectedOutput: 'A well-written 1000-word blog post',
      agent: 'writer',
    })
    .process(CrewProcess.SEQUENTIAL)
    .verbose(true)
    .build();
}
