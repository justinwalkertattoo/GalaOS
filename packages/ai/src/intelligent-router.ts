import { AIProvider } from './types';
import { OllamaProvider, DockerModelProvider, AnthropicProvider, OpenAIProvider } from './providers';

// Task categories for intelligent routing
export enum TaskCategory {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  DATA_ANALYSIS = 'data_analysis',
  CREATIVE_WRITING = 'creative_writing',
  RESEARCH = 'research',
  REASONING = 'reasoning',
  MATH = 'math',
  VISION = 'vision',
  CONVERSATION = 'conversation',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  CLASSIFICATION = 'classification',
  EXTRACTION = 'extraction',
}

// Model capabilities matrix
interface ModelCapability {
  provider: AIProvider;
  model: string;
  strengths: TaskCategory[];
  speed: number; // 1-10, 10 being fastest
  cost: number; // 1-10, 10 being most expensive
  quality: number; // 1-10, 10 being highest quality
  contextWindow: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  localOnly: boolean;
}

const MODEL_REGISTRY: ModelCapability[] = [
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    strengths: [
      TaskCategory.CODE_GENERATION,
      TaskCategory.CODE_REVIEW,
      TaskCategory.REASONING,
      TaskCategory.RESEARCH,
      TaskCategory.CREATIVE_WRITING,
    ],
    speed: 7,
    cost: 8,
    quality: 10,
    contextWindow: 200000,
    supportsVision: true,
    supportsFunctionCalling: true,
    localOnly: false,
  },
  {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    strengths: [
      TaskCategory.CLASSIFICATION,
      TaskCategory.EXTRACTION,
      TaskCategory.SUMMARIZATION,
      TaskCategory.CONVERSATION,
    ],
    speed: 10,
    cost: 2,
    quality: 7,
    contextWindow: 200000,
    supportsVision: true,
    supportsFunctionCalling: true,
    localOnly: false,
  },
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    strengths: [
      TaskCategory.REASONING,
      TaskCategory.MATH,
      TaskCategory.DATA_ANALYSIS,
      TaskCategory.CODE_GENERATION,
    ],
    speed: 6,
    cost: 9,
    quality: 9,
    contextWindow: 128000,
    supportsVision: true,
    supportsFunctionCalling: true,
    localOnly: false,
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    strengths: [TaskCategory.CONVERSATION, TaskCategory.SUMMARIZATION, TaskCategory.TRANSLATION],
    speed: 9,
    cost: 1,
    quality: 6,
    contextWindow: 16000,
    supportsVision: false,
    supportsFunctionCalling: true,
    localOnly: false,
  },
  {
    provider: 'ollama',
    model: 'llama2',
    strengths: [TaskCategory.CONVERSATION, TaskCategory.SUMMARIZATION],
    speed: 5,
    cost: 0,
    quality: 5,
    contextWindow: 4096,
    supportsVision: false,
    supportsFunctionCalling: false,
    localOnly: true,
  },
  {
    provider: 'ollama',
    model: 'codellama',
    strengths: [TaskCategory.CODE_GENERATION, TaskCategory.CODE_REVIEW],
    speed: 5,
    cost: 0,
    quality: 7,
    contextWindow: 4096,
    supportsVision: false,
    supportsFunctionCalling: false,
    localOnly: true,
  },
];

export interface TaskAnalysis {
  category: TaskCategory;
  complexity: number; // 1-10
  requiresVision: boolean;
  requiresFunctions: boolean;
  contextSize: number; // estimated tokens
  prioritySpeed: boolean;
  priorityCost: boolean;
  priorityQuality: boolean;
}

export interface RouteDecision {
  provider: AIProvider;
  model: string;
  reasoning: string;
  confidence: number; // 0-1
  alternatives: Array<{ provider: AIProvider; model: string; score: number }>;
}

export class IntelligentRouter {
  private modelRegistry: ModelCapability[];
  private userPreferences: {
    preferLocal: boolean;
    maxCost: number;
    minQuality: number;
  };

  constructor(
    customRegistry?: ModelCapability[],
    preferences?: {
      preferLocal?: boolean;
      maxCost?: number;
      minQuality?: number;
    }
  ) {
    this.modelRegistry = customRegistry || MODEL_REGISTRY;
    this.userPreferences = {
      preferLocal: preferences?.preferLocal || false,
      maxCost: preferences?.maxCost || 10,
      minQuality: preferences?.minQuality || 5,
    };
  }

  /**
   * Analyze the task from user input
   */
  analyzeTask(userInput: string, context?: any): TaskAnalysis {
    const input = userInput.toLowerCase();

    // Detect task category using keyword matching and patterns
    let category = TaskCategory.CONVERSATION;
    let complexity = 5;

    // Code-related detection
    if (
      /\b(code|program|function|class|implement|debug|fix|refactor)\b/.test(input) ||
      /```/.test(input)
    ) {
      category = TaskCategory.CODE_GENERATION;
      complexity = 7;
    } else if (/\b(review|analyze.*code|check.*code)\b/.test(input)) {
      category = TaskCategory.CODE_REVIEW;
      complexity = 6;
    }
    // Data analysis
    else if (/\b(analyze.*data|statistics|dataset|csv|excel|visualize)\b/.test(input)) {
      category = TaskCategory.DATA_ANALYSIS;
      complexity = 7;
    }
    // Creative tasks
    else if (/\b(write|story|article|blog|creative|poem|script)\b/.test(input)) {
      category = TaskCategory.CREATIVE_WRITING;
      complexity = 6;
    }
    // Research
    else if (/\b(research|find.*information|explain|what is|how does)\b/.test(input)) {
      category = TaskCategory.RESEARCH;
      complexity = 6;
    }
    // Math and reasoning
    else if (/\b(calculate|math|solve|equation|proof|logic)\b/.test(input)) {
      category = TaskCategory.MATH;
      complexity = 8;
    }
    // Summarization
    else if (/\b(summarize|tldr|brief|overview)\b/.test(input)) {
      category = TaskCategory.SUMMARIZATION;
      complexity = 4;
    }
    // Classification/Extraction
    else if (/\b(classify|categorize|extract|parse)\b/.test(input)) {
      category = TaskCategory.CLASSIFICATION;
      complexity = 5;
    }

    // Detect if vision is needed
    const requiresVision = context?.hasImages || /\b(image|photo|picture|visual|screenshot)\b/.test(input);

    // Detect if function calling is needed
    const requiresFunctions =
      context?.tools?.length > 0 || /\b(use.*tool|call.*function|execute|run)\b/.test(input);

    // Estimate context size
    const contextSize = userInput.length + (context?.conversationHistory?.length || 0) * 500;

    // Detect priorities from user input
    const prioritySpeed = /\b(quick|fast|urgent|asap|immediately)\b/.test(input);
    const priorityCost = /\b(cheap|budget|free|local)\b/.test(input);
    const priorityQuality = /\b(best|high.*quality|accurate|precise|detailed)\b/.test(input);

    return {
      category,
      complexity,
      requiresVision,
      requiresFunctions,
      contextSize,
      prioritySpeed,
      priorityCost,
      priorityQuality,
    };
  }

  /**
   * Route to the best model based on task analysis
   */
  route(taskAnalysis: TaskAnalysis, availableProviders?: AIProvider[]): RouteDecision {
    // Filter models based on requirements
    let candidates = this.modelRegistry.filter((model) => {
      // Check if provider is available
      if (availableProviders && !availableProviders.includes(model.provider)) {
        return false;
      }

      // Check if supports vision if needed
      if (taskAnalysis.requiresVision && !model.supportsVision) {
        return false;
      }

      // Check if supports function calling if needed
      if (taskAnalysis.requiresFunctions && !model.supportsFunctionCalling) {
        return false;
      }

      // Check context window
      if (taskAnalysis.contextSize > model.contextWindow) {
        return false;
      }

      // Check user preferences
      if (this.userPreferences.preferLocal && !model.localOnly) {
        return false;
      }

      if (model.cost > this.userPreferences.maxCost) {
        return false;
      }

      if (model.quality < this.userPreferences.minQuality) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      // Fallback to any available model
      candidates = this.modelRegistry;
    }

    // Score each candidate
    const scoredCandidates = candidates.map((model) => {
      let score = 0;

      // Strength match (40% weight)
      if (model.strengths.includes(taskAnalysis.category)) {
        score += 40;
      }

      // Quality match (30% weight)
      score += (model.quality / 10) * 30;

      // Speed consideration (15% weight)
      if (taskAnalysis.prioritySpeed) {
        score += (model.speed / 10) * 15;
      } else {
        score += (model.speed / 10) * 5;
      }

      // Cost consideration (15% weight)
      if (taskAnalysis.priorityCost) {
        score += ((10 - model.cost) / 10) * 15;
      } else {
        score += ((10 - model.cost) / 10) * 5;
      }

      // Complexity match
      if (taskAnalysis.complexity >= 7 && model.quality >= 8) {
        score += 10;
      }

      return { model, score };
    });

    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    const winner = scoredCandidates[0].model;
    const alternatives = scoredCandidates.slice(1, 4).map((c) => ({
      provider: c.model.provider,
      model: c.model.model,
      score: c.score,
    }));

    // Generate reasoning
    const reasoning = this.generateReasoning(winner, taskAnalysis);

    return {
      provider: winner.provider,
      model: winner.model,
      reasoning,
      confidence: scoredCandidates[0].score / 100,
      alternatives,
    };
  }

  private generateReasoning(model: ModelCapability, task: TaskAnalysis): string {
    const reasons: string[] = [];

    if (model.strengths.includes(task.category)) {
      reasons.push(`optimized for ${task.category.replace(/_/g, ' ')}`);
    }

    if (task.prioritySpeed && model.speed >= 8) {
      reasons.push('fast response time');
    }

    if (task.priorityCost && model.cost <= 3) {
      reasons.push('cost-effective');
    }

    if (task.priorityQuality && model.quality >= 9) {
      reasons.push('highest quality output');
    }

    if (model.localOnly) {
      reasons.push('runs locally for privacy');
    }

    if (task.complexity >= 7 && model.quality >= 8) {
      reasons.push('handles complex tasks well');
    }

    return `Selected ${model.model} because it's ${reasons.join(', ')}`;
  }

  /**
   * Get model recommendations for a task
   */
  getRecommendations(userInput: string, context?: any): RouteDecision[] {
    const taskAnalysis = this.analyzeTask(userInput, context);
    const primaryRoute = this.route(taskAnalysis);

    const recommendations: RouteDecision[] = [primaryRoute];

    // Add alternatives as recommendations
    primaryRoute.alternatives.forEach((alt) => {
      const altModel = this.modelRegistry.find((m) => m.provider === alt.provider && m.model === alt.model);
      if (altModel) {
        recommendations.push({
          provider: alt.provider,
          model: alt.model,
          reasoning: this.generateReasoning(altModel, taskAnalysis),
          confidence: alt.score / 100,
          alternatives: [],
        });
      }
    });

    return recommendations;
  }
}
