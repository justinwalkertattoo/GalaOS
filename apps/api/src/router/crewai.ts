import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  CrewBuilder,
  CrewProcess,
  Crew,
  AgentConfig,
  TaskConfig,
} from '@galaos/ai/src/crewai-orchestrator';

// Active crews (in-memory for now)
const activeCrews: Map<string, Crew> = new Map();

// Validation schemas
const agentConfigSchema = z.object({
  id: z.string(),
  role: z.string(),
  goal: z.string(),
  backstory: z.string(),
  verbose: z.boolean().optional(),
  allowDelegation: z.boolean().optional(),
  maxIter: z.number().optional(),
  maxRPM: z.number().optional(),
  llmConfig: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
});

const taskConfigSchema = z.object({
  id: z.string(),
  description: z.string(),
  expectedOutput: z.string(),
  agent: z.string().optional(),
  async: z.boolean().optional(),
  context: z
    .object({
      dependencies: z.array(z.string()).optional(),
      sharedData: z.record(z.any()).optional(),
      deadline: z.date().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    })
    .optional(),
});

const crewConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agents: z.array(agentConfigSchema),
  tasks: z.array(taskConfigSchema),
  process: z.enum(['sequential', 'hierarchical', 'parallel', 'consensus']),
  managerId: z.string().optional(),
  verbose: z.boolean().optional(),
  maxRetries: z.number().optional(),
  timeout: z.number().optional(),
});

export const crewAIRouter = router({
  /**
   * Create a new crew
   */
  createCrew: protectedProcedure
    .input(crewConfigSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const builder = new CrewBuilder()
          .crew(input.id, input.name, input.description)
          .process(input.process as CrewProcess)
          .verbose(input.verbose || false);

        // Add agents
        for (const agent of input.agents) {
          builder.agent(agent as AgentConfig);
        }

        // Add tasks
        for (const task of input.tasks) {
          builder.task(task as TaskConfig);
        }

        // Set manager if hierarchical
        if (input.managerId) {
          builder.manager(input.managerId);
        }

        const crew = builder.build();
        activeCrews.set(input.id, crew);

        return {
          success: true,
          crewId: input.id,
          message: 'Crew created successfully',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Failed to create crew: ${error.message}`,
        });
      }
    }),

  /**
   * Execute a crew (kickoff)
   */
  kickoffCrew: protectedProcedure
    .input(z.object({ crewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const crew = activeCrews.get(input.crewId);
      if (!crew) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Crew not found',
        });
      }

      try {
        const result = await crew.kickoff();

        // Store result in database
        await ctx.prisma.agentRun.create({
          data: {
            userId: ctx.user.id,
            type: 'crew',
            status: result.success ? 'completed' : 'failed',
            result: result as any,
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Crew execution failed: ${error.message}`,
        });
      }
    }),

  /**
   * List all active crews
   */
  listCrews: protectedProcedure.query(async () => {
    return Array.from(activeCrews.values()).map((crew) => crew.getConfig());
  }),

  /**
   * Get crew details
   */
  getCrew: protectedProcedure
    .input(z.object({ crewId: z.string() }))
    .query(async ({ input }) => {
      const crew = activeCrews.get(input.crewId);
      if (!crew) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Crew not found',
        });
      }

      return {
        config: crew.getConfig(),
        results: crew.getResults(),
      };
    }),

  /**
   * Delete a crew
   */
  deleteCrew: protectedProcedure
    .input(z.object({ crewId: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = activeCrews.delete(input.crewId);
      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Crew not found',
        });
      }

      return { success: true, message: 'Crew deleted successfully' };
    }),

  /**
   * Get crew templates
   */
  getTemplates: protectedProcedure.query(async () => {
    return [
      {
        id: 'research-crew',
        name: 'Research Team',
        description: 'Research and content creation crew',
        agents: [
          {
            id: 'researcher',
            role: 'Senior Research Analyst',
            goal: 'Uncover cutting-edge developments',
            backstory: 'Expert analyst with years of research experience',
          },
          {
            id: 'writer',
            role: 'Tech Content Strategist',
            goal: 'Craft compelling technical content',
            backstory: 'Seasoned writer specialized in technology',
          },
        ],
        tasks: [
          {
            id: 'research',
            description: 'Research the topic thoroughly',
            expectedOutput: 'Comprehensive research report',
            agent: 'researcher',
          },
          {
            id: 'write',
            description: 'Write engaging content based on research',
            expectedOutput: 'Well-written article or blog post',
            agent: 'writer',
          },
        ],
        process: 'sequential',
      },
      {
        id: 'dev-crew',
        name: 'Development Team',
        description: 'Code analysis, review, and documentation crew',
        agents: [
          {
            id: 'architect',
            role: 'Software Architect',
            goal: 'Design scalable and maintainable systems',
            backstory: 'Senior architect with deep system design experience',
          },
          {
            id: 'developer',
            role: 'Senior Developer',
            goal: 'Implement robust and efficient code',
            backstory: 'Expert developer with 10+ years experience',
          },
          {
            id: 'reviewer',
            role: 'Code Reviewer',
            goal: 'Ensure code quality and best practices',
            backstory: 'Quality-focused developer with attention to detail',
          },
        ],
        tasks: [
          {
            id: 'design',
            description: 'Design the system architecture',
            expectedOutput: 'Architecture document with diagrams',
            agent: 'architect',
          },
          {
            id: 'implement',
            description: 'Implement the designed system',
            expectedOutput: 'Working code with tests',
            agent: 'developer',
          },
          {
            id: 'review',
            description: 'Review the implementation',
            expectedOutput: 'Code review report with feedback',
            agent: 'reviewer',
          },
        ],
        process: 'sequential',
      },
      {
        id: 'marketing-crew',
        name: 'Marketing Team',
        description: 'Market analysis and campaign creation crew',
        agents: [
          {
            id: 'analyst',
            role: 'Market Analyst',
            goal: 'Understand market trends and opportunities',
            backstory: 'Data-driven analyst with market expertise',
          },
          {
            id: 'strategist',
            role: 'Marketing Strategist',
            goal: 'Develop effective marketing strategies',
            backstory: 'Creative strategist with proven track record',
          },
          {
            id: 'copywriter',
            role: 'Copywriter',
            goal: 'Write compelling marketing copy',
            backstory: 'Award-winning copywriter',
          },
        ],
        tasks: [
          {
            id: 'analyze',
            description: 'Analyze the target market',
            expectedOutput: 'Market analysis report',
            agent: 'analyst',
          },
          {
            id: 'strategy',
            description: 'Develop marketing strategy',
            expectedOutput: 'Marketing strategy document',
            agent: 'strategist',
          },
          {
            id: 'copy',
            description: 'Write marketing copy',
            expectedOutput: 'Marketing copy and ad content',
            agent: 'copywriter',
          },
        ],
        process: 'sequential',
      },
      {
        id: 'support-crew',
        name: 'Customer Support Team',
        description: 'Intelligent customer support crew',
        agents: [
          {
            id: 'classifier',
            role: 'Support Ticket Classifier',
            goal: 'Categorize and prioritize support requests',
            backstory: 'Expert in understanding customer needs',
          },
          {
            id: 'responder',
            role: 'Support Specialist',
            goal: 'Provide helpful and accurate responses',
            backstory: 'Experienced support professional',
          },
          {
            id: 'escalator',
            role: 'Escalation Manager',
            goal: 'Handle complex issues requiring human intervention',
            backstory: 'Senior support manager',
          },
        ],
        tasks: [
          {
            id: 'classify',
            description: 'Classify the support request',
            expectedOutput: 'Classification and priority',
            agent: 'classifier',
          },
          {
            id: 'respond',
            description: 'Respond to the customer',
            expectedOutput: 'Support response',
            agent: 'responder',
          },
          {
            id: 'escalate',
            description: 'Escalate if needed',
            expectedOutput: 'Escalation decision and reasoning',
            agent: 'escalator',
          },
        ],
        process: 'sequential',
      },
    ];
  }),

  /**
   * Create crew from template
   */
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        crewId: z.string(),
        customization: z
          .object({
            name: z.string().optional(),
            description: z.string().optional(),
            agents: z.record(z.any()).optional(),
            tasks: z.record(z.any()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get template
      const templates = await crewAIRouter.createCaller(ctx).getTemplates();
      const template = templates.find((t) => t.id === input.templateId);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      // Create crew from template with customizations
      const crewConfig = {
        ...template,
        id: input.crewId,
        ...(input.customization || {}),
      };

      return crewAIRouter
        .createCaller(ctx)
        .createCrew(crewConfig as any);
    }),
});
