import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { AIOrchestrator } from '@galaos/ai';
import { WorkflowEngine } from '@galaos/workflow';
import {
  visionAnalyzerConfig,
  contentCreatorConfig,
  socialMediaManagerConfig,
  portfolioManagerConfig,
  emailMarketerConfig,
} from '@galaos/ai/src/agents';

// Create global orchestrator instance
const orchestrator = new AIOrchestrator({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  defaultProvider: 'anthropic',
});

// Register predefined agents
orchestrator.registerAgent(visionAnalyzerConfig);
orchestrator.registerAgent(contentCreatorConfig);
orchestrator.registerAgent(socialMediaManagerConfig);
orchestrator.registerAgent(portfolioManagerConfig);
orchestrator.registerAgent(emailMarketerConfig);

// Workflow engine instance
const workflowEngine = new WorkflowEngine();

export const orchestrationRouter = router({
  // Analyze user intent
  analyzeIntent: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const intent = await orchestrator.analyzeIntent(input.message, input.context);
      return intent;
    }),

  // Create orchestration plan
  createPlan: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const plan = await orchestrator.createOrchestrationPlan(input.message, input.context);
      return plan;
    }),

  // Execute orchestration plan
  executePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        plan: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { plan } = input;

      // Store execution in database
      const execution = await ctx.prisma.workflowExecution.create({
        data: {
          workflowId: plan.taskId,
          status: 'running',
          input: plan,
        },
      });

      // Execute plan with callbacks
      const results = await orchestrator.executeOrchestrationPlan(
        plan,
        async (step, result) => {
          // On step complete
          console.log(`Step ${step.id} completed:`, result);
        },
        async (step) => {
          // On human input required
          // In production, this would emit an event or store state
          return {
            awaiting: true,
            stepId: step.id,
            prompt: step.humanInputPrompt,
          };
        }
      );

      // Update execution status
      await ctx.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'success',
          output: results,
          completedAt: new Date(),
        },
      });

      return {
        executionId: execution.id,
        results,
      };
    }),

  // Get execution status
  getExecution: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const execution = await ctx.prisma.workflowExecution.findUnique({
        where: { id: input.executionId },
      });

      return execution;
    }),

  // Resume paused execution with human input
  resumeExecution: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
        stepId: z.string(),
        userInput: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const execution = await ctx.prisma.workflowExecution.findUnique({
        where: { id: input.executionId },
      });

      if (!execution) {
        throw new Error('Execution not found');
      }

      // Resume with user input
      const result = await workflowEngine.resumeExecution(
        input.executionId,
        input.stepId,
        input.userInput
      );

      return result;
    }),

  // "Gala" conversational interface
  gala: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const response = await orchestrator.gala(input.message, input.context);
      return { response };
    }),

  // List registered agents
  listAgents: protectedProcedure.query(async () => {
    return [
      { id: 'vision_analyzer', name: 'Vision Analyzer', description: 'Analyzes images' },
      { id: 'content_creator', name: 'Content Creator', description: 'Creates captions and content' },
      { id: 'social_media_manager', name: 'Social Media Manager', description: 'Posts to social platforms' },
      { id: 'portfolio_manager', name: 'Portfolio Manager', description: 'Manages portfolio' },
      { id: 'email_marketer', name: 'Email Marketer', description: 'Creates email campaigns' },
    ];
  }),
});
