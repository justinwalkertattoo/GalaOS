import { Agent } from './agent';
import { AgentConfig, TaskIntent, OrchestrationPlan, WorkflowStep, Message, AIProvider } from './types';
import { ToolRegistry, globalToolRegistry } from './tool-registry';
import { ProviderConfig } from './providers';
import { CapabilityAuditor, CapabilityAuditResult } from './capability-audit';
import { z } from 'zod';

export interface OrchestratorConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  defaultProvider?: AIProvider;
  ollamaBaseUrl?: string;
  dockerProviders?: Array<{ containerName: string; baseUrl: string; model: string }>;
}

export class AIOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private toolRegistry: ToolRegistry;
  private routerAgent: Agent;
  private auditor: CapabilityAuditor;

  constructor(private config: OrchestratorConfig) {
    this.toolRegistry = globalToolRegistry;

    // Create router agent - the "brain" that analyzes intent
    const routerProviderConfig = this.createProviderConfig(
      config.defaultProvider || 'anthropic'
    );

    this.routerAgent = new Agent(
      {
        id: 'router',
        name: 'Task Router',
        description: 'Analyzes user intent and creates orchestration plans',
        systemPrompt: `You are an intelligent task router for GalaOS. Your job is to:
1. Analyze user requests to understand their intent
2. Break down complex tasks into smaller steps
3. Identify which tools/integrations are needed
4. Create an orchestration plan

When a user says something like "post these photos", you should:
- Identify the task type (social media posting)
- List required steps (analyze images, generate caption, post to platforms)
- Identify needed tools (image analysis, social APIs, etc.)
- Determine if human input is needed (caption approval, etc.)

Always respond with structured analysis of the task.`,
        provider: config.defaultProvider || 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      },
      routerProviderConfig,
      this.toolRegistry
    );

    // Initialize capability auditor
    this.auditor = new CapabilityAuditor(this.toolRegistry);
  }

  private createProviderConfig(provider: AIProvider, modelName?: string): ProviderConfig {
    switch (provider) {
      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: this.config.anthropicApiKey,
        };
      case 'openai':
        return {
          provider: 'openai',
          apiKey: this.config.openaiApiKey,
        };
      case 'ollama':
        return {
          provider: 'ollama',
          baseUrl: this.config.ollamaBaseUrl || 'http://localhost:11434',
          model: modelName || 'llama2',
        };
      case 'docker':
        const dockerProvider = this.config.dockerProviders?.[0];
        if (!dockerProvider) {
          throw new Error('No Docker providers configured');
        }
        return {
          provider: 'docker',
          containerName: dockerProvider.containerName,
          baseUrl: dockerProvider.baseUrl,
          model: dockerProvider.model,
        };
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  registerAgent(config: AgentConfig, providerConfig?: ProviderConfig): Agent {
    const finalProviderConfig = providerConfig || this.createProviderConfig(config.provider, config.model);
    const agent = new Agent(config, finalProviderConfig, this.toolRegistry);
    this.agents.set(config.id, agent);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  async analyzeIntent(userInput: string, context?: any): Promise<TaskIntent> {
    const prompt = `Analyze this user request and identify the intent:

User request: "${userInput}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Provide a structured analysis:
1. What is the main intent/goal?
2. What entities are involved? (files, platforms, content types)
3. What tools/integrations are needed?
4. Confidence level (0-1)

Respond in JSON format with: intent, entities, requiredTools, confidence`;

    const response = await this.routerAgent.chat(prompt);

    // Parse AI response (in production, use structured output)
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'unknown',
          entities: parsed.entities || {},
          confidence: parsed.confidence || 0.5,
          requiredTools: parsed.requiredTools || [],
        };
      }
    } catch (e) {
      // Fallback parsing
    }

    // Fallback intent detection
    return this.fallbackIntentDetection(userInput, context);
  }

  private fallbackIntentDetection(userInput: string, context?: any): TaskIntent {
    const lower = userInput.toLowerCase();

    // Social media posting intent
    if (
      lower.includes('post') &&
      (lower.includes('photo') ||
        lower.includes('image') ||
        lower.includes('picture') ||
        context?.files)
    ) {
      return {
        intent: 'social_media_post',
        entities: {
          contentType: 'photos',
          files: context?.files || [],
        },
        confidence: 0.8,
        requiredTools: [
          'image_analyzer',
          'caption_generator',
          'hashtag_generator',
          'social_media_poster',
        ],
        suggestedWorkflow: 'photo_to_social_media',
      };
    }

    // Email campaign intent
    if (lower.includes('email') && (lower.includes('campaign') || lower.includes('send'))) {
      return {
        intent: 'email_campaign',
        entities: {},
        confidence: 0.8,
        requiredTools: ['email_service'],
      };
    }

    // Portfolio update intent
    if (lower.includes('portfolio') || lower.includes('website')) {
      return {
        intent: 'portfolio_update',
        entities: {},
        confidence: 0.7,
        requiredTools: ['cms_api', 'file_uploader'],
      };
    }

    return {
      intent: 'general_query',
      entities: {},
      confidence: 0.5,
      requiredTools: [],
    };
  }

  async createOrchestrationPlan(
    userInput: string,
    context?: any
  ): Promise<OrchestrationPlan> {
    // Analyze intent
    const intent = await this.analyzeIntent(userInput, context);

    // Create workflow steps based on intent
    const steps = await this.generateWorkflowSteps(intent, context);

    return {
      taskId: this.generateTaskId(),
      intent,
      steps,
      estimatedDuration: this.estimateDuration(steps),
    };
  }

  /**
   * Self-audit: given user input, analyze intent and audit capabilities.
   */
  async selfAudit(
    userInput: string,
    context?: any,
    options?: { availableGenerators?: string[]; env?: Record<string, string | undefined> }
  ): Promise<CapabilityAuditResult> {
    const intent = await this.analyzeIntent(userInput, context);
    const providers = {
      anthropic: Boolean(this.config.anthropicApiKey),
      openai: Boolean(this.config.openaiApiKey),
      ollama: Boolean(this.config.ollamaBaseUrl),
    };
    return this.auditor.audit(intent, {
      availableGenerators: options?.availableGenerators,
      env: options?.env,
      providers,
    });
  }

  private async generateWorkflowSteps(
    intent: TaskIntent,
    context?: any
  ): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    // Generate steps based on intent
    switch (intent.intent) {
      case 'social_media_post':
        return this.generateSocialMediaSteps(intent, context);
      case 'email_campaign':
        return this.generateEmailCampaignSteps(intent, context);
      case 'portfolio_update':
        return this.generatePortfolioUpdateSteps(intent, context);
      default:
        return [];
    }
  }

  private generateSocialMediaSteps(intent: TaskIntent, context?: any): WorkflowStep[] {
    return [
      {
        id: 'analyze_images',
        agentId: 'vision_analyzer',
        action: 'analyze_images',
        input: { files: context?.files || [] },
      },
      {
        id: 'generate_caption',
        agentId: 'content_creator',
        action: 'generate_caption',
        input: { analysis: '{{analyze_images.output}}' },
        requiresHumanInput: true,
        humanInputPrompt: 'Review and edit the suggested caption:',
      },
      {
        id: 'generate_hashtags',
        agentId: 'content_creator',
        action: 'generate_hashtags',
        input: { caption: '{{generate_caption.output}}' },
      },
      {
        id: 'post_to_buffer',
        agentId: 'social_media_manager',
        action: 'post_to_buffer',
        input: {
          images: '{{files}}',
          caption: '{{generate_caption.output}}',
          hashtags: '{{generate_hashtags.output}}',
          // Buffer will handle Instagram posting since it's connected
          profiles: 'instagram', // Will post to all Instagram profiles connected in Buffer
          schedule: 'now', // or 'optimal' for Buffer's optimal timing
        },
        requiresHumanInput: true,
        humanInputPrompt: 'Ready to post via Buffer? This will publish to your connected Instagram account:',
      },
      {
        id: 'update_portfolio',
        agentId: 'portfolio_manager',
        action: 'add_to_portfolio',
        input: {
          images: '{{files}}',
          description: '{{generate_caption.output}}',
        },
      },
      {
        id: 'create_email_campaign',
        agentId: 'email_marketer',
        action: 'create_campaign',
        input: {
          subject: 'Portfolio Updated - New Work Available',
          content: '{{generate_caption.output}}',
          images: '{{files}}',
        },
        requiresHumanInput: true,
        humanInputPrompt: 'Review email campaign before sending:',
      },
    ];
  }

  private generateEmailCampaignSteps(intent: TaskIntent, context?: any): WorkflowStep[] {
    return [
      {
        id: 'draft_email',
        agentId: 'email_marketer',
        action: 'draft_email',
        input: context,
      },
      {
        id: 'send_campaign',
        agentId: 'email_marketer',
        action: 'send_campaign',
        input: { draft: '{{draft_email.output}}' },
        requiresHumanInput: true,
        humanInputPrompt: 'Review and approve email campaign:',
      },
    ];
  }

  private generatePortfolioUpdateSteps(intent: TaskIntent, context?: any): WorkflowStep[] {
    return [
      {
        id: 'prepare_content',
        agentId: 'portfolio_manager',
        action: 'prepare_content',
        input: context,
      },
      {
        id: 'upload_to_portfolio',
        agentId: 'portfolio_manager',
        action: 'upload',
        input: { content: '{{prepare_content.output}}' },
      },
    ];
  }

  async executeOrchestrationPlan(
    plan: OrchestrationPlan,
    onStepComplete?: (step: WorkflowStep, result: any) => void,
    onHumanInputRequired?: (step: WorkflowStep) => Promise<any>
  ): Promise<any> {
    const results: Record<string, any> = {};

    for (const step of plan.steps) {
      // Check if human input is required
      if (step.requiresHumanInput && onHumanInputRequired) {
        const humanInput = await onHumanInputRequired(step);
        results[step.id] = humanInput;
        if (onStepComplete) onStepComplete(step, humanInput);
        continue;
      }

      // Get the agent
      const agent = this.getAgent(step.agentId);
      if (!agent) {
        console.warn(`Agent not found: ${step.agentId}, skipping step ${step.id}`);
        continue;
      }

      // Resolve input variables
      const resolvedInput = this.resolveVariables(step.input, results);

      // Execute step
      try {
        const result = await agent.execute({
          action: step.action,
          ...resolvedInput,
        });
        results[step.id] = result;
        if (onStepComplete) onStepComplete(step, result);
      } catch (error) {
        console.error(`Error executing step ${step.id}:`, error);
        results[step.id] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return results;
  }

  private resolveVariables(input: any, results: Record<string, any>): any {
    if (typeof input === 'string') {
      // Replace {{variable}} with actual values
      return input.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const keys = path.split('.');
        let value: any = results;
        for (const key of keys) {
          value = value?.[key];
        }
        return value !== undefined ? value : `{{${path}}}`;
      });
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.resolveVariables(item, results));
    }

    if (typeof input === 'object' && input !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = this.resolveVariables(value, results);
      }
      return resolved;
    }

    return input;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateDuration(steps: WorkflowStep[]): number {
    // Estimate in seconds
    return steps.length * 5; // Rough estimate: 5 seconds per step
  }

  // Convenience method for the "Gala" interface
  async gala(userInput: string, context?: any): Promise<string> {
    // Create orchestration plan
    const plan = await this.createOrchestrationPlan(userInput, context);

    // Format response for user
    let response = `I understand you want to: ${plan.intent.intent}\n\n`;
    response += `Here's my plan:\n`;
    plan.steps.forEach((step, i) => {
      const icon = step.requiresHumanInput ? '⏸️' : '✓';
      response += `${i + 1}. ${icon} ${step.action.replace(/_/g, ' ')}\n`;
    });

    if (plan.steps.some((s) => s.requiresHumanInput)) {
      response += `\nSome steps will require your input. `;
    }

    response += `\nEstimated time: ~${plan.estimatedDuration} seconds\n`;
    response += `\nShould I proceed? (Reply "yes" to start)`;

    return response;
  }
}
