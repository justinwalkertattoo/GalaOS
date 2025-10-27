import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MINIO_URL = process.env.MINIO_URL || 'http://localhost:9000';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Model training queue
const modelTrainingQueue = new Queue('model-training', { connection });

/**
 * Art Style Training Router
 *
 * Train custom models on user's artwork to generate images in their unique style
 */
export const artTrainingRouter = router({
  /**
   * Create a new art style training project
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        baseModel: z
          .enum(['stable-diffusion-xl', 'stable-diffusion-2.1', 'stable-diffusion-1.5'])
          .default('stable-diffusion-xl'),
        modelType: z.enum(['lora', 'dreambooth', 'textual-inversion']).default('lora'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          baseModel: input.baseModel,
          modelType: input.modelType,
          modelPath: '', // Will be set after training
          status: 'pending',
          progress: 0,
          trainingImages: 0,
        },
      });

      return project;
    }),

  /**
   * Upload training images (base64 encoded)
   */
  uploadImage: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        imageData: z.string(), // Base64 encoded
        caption: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Training project not found' });
      }

      if (project.status === 'training' || project.status === 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot add images to a project that is training or completed',
        });
      }

      // Decode image
      const imageBuffer = Buffer.from(input.imageData, 'base64');
      const imageSize = imageBuffer.length;

      // Store in MinIO
      const bucketName = 'galaos-training';
      const objectName = `${ctx.user.id}/${input.projectId}/image_${Date.now()}.png`;
      const imageUrl = `${MINIO_URL}/${bucketName}/${objectName}`;

      // TODO: Actually upload to MinIO
      // For now, we'll store the reference

      // Update project metadata with image reference
      const currentMetadata = (project.hyperparameters as any) || {};
      const images = currentMetadata.trainingImages || [];
      images.push({
        url: imageUrl,
        caption: input.caption,
        storagePath: objectName,
        uploadedAt: new Date().toISOString(),
        size: imageSize,
        ...input.metadata,
      });

      await ctx.prisma.artStyleModel.update({
        where: { id: input.projectId },
        data: {
          trainingImages: images.length,
          hyperparameters: {
            ...currentMetadata,
            trainingImages: images,
          },
        },
      });

      return {
        success: true,
        imageCount: images.length,
        imageUrl,
      };
    }),

  /**
   * Start training
   */
  startTraining: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        config: z
          .object({
            steps: z.number().int().min(100).max(10000).default(1000),
            learningRate: z.number().min(0.00001).max(0.01).default(0.0001),
            batchSize: z.number().int().min(1).max(16).default(1),
            resolution: z.number().int().default(512),
            triggerWord: z.string().optional(), // e.g., "in the style of <user>"
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (project.status === 'training') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Training is already in progress',
        });
      }

      if (project.trainingImages < 5) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least 5 training images are required',
        });
      }

      // Get training images from metadata
      const metadata = project.hyperparameters as any;
      const trainingImages = metadata?.trainingImages || [];

      // Update status to training
      await ctx.prisma.artStyleModel.update({
        where: { id: input.projectId },
        data: {
          status: 'training',
          progress: 0,
          trainingSteps: input.config?.steps || 1000,
          hyperparameters: {
            ...metadata,
            ...input.config,
            startedAt: new Date().toISOString(),
          },
        },
      });

      // Queue training job
      const job = await modelTrainingQueue.add('train-art-style', {
        projectId: input.projectId,
        userId: ctx.user.id,
        modelType: 'art_style',
        config: {
          baseModel: project.baseModel,
          modelType: project.modelType,
          steps: input.config?.steps || 1000,
          learningRate: input.config?.learningRate || 0.0001,
          batchSize: input.config?.batchSize || 1,
          resolution: input.config?.resolution || 512,
          triggerWord: input.config?.triggerWord,
        },
        trainingData: {
          images: trainingImages,
          projectName: project.name,
        },
      });

      return {
        success: true,
        status: 'training',
        jobId: job.id,
        message: 'Training started',
      };
    }),

  /**
   * Get training progress
   */
  getProgress: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return {
        status: project.status,
        progress: project.progress || 0,
        trainingImages: project.trainingImages,
        trainingSteps: project.trainingSteps,
        metrics: project.metrics || {},
        updatedAt: project.updatedAt,
      };
    }),

  /**
   * List all training projects
   */
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['pending', 'training', 'ready', 'failed']).optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.user.id,
      };

      if (input?.status) {
        where.status = input.status;
      }

      const projects = await ctx.prisma.artStyleModel.findMany({
        where,
        take: input?.limit || 50,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return projects;
    }),

  /**
   * Get single project details
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return project;
    }),

  /**
   * Delete training project
   */
  delete: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // TODO: Delete training images from MinIO
      // TODO: Delete trained model from storage

      await ctx.prisma.artStyleModel.delete({
        where: { id: input.projectId },
      });

      return { success: true };
    }),

  /**
   * Deploy trained model (make it available for generation)
   */
  deploy: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        deploymentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (project.status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Model must be trained before deployment',
        });
      }

      // Create a ModelProvider entry for this trained model
      const provider = await ctx.prisma.modelProvider.create({
        data: {
          userId: ctx.user.id,
          name: input.deploymentName || `${project.name} - Art Style`,
          provider: 'custom',
          apiKey: '', // Not needed for local models
          apiUrl: process.env.PYTORCH_URL || 'http://pytorch-serve:8080',
          models: [
            {
              id: project.id,
              name: project.name,
              type: 'image-generation',
              modelPath: project.modelPath,
              baseModel: project.baseModel,
              modelType: project.modelType,
            },
          ],
          isActive: true,
        },
      });

      return {
        success: true,
        providerId: provider.id,
        message: 'Model deployed successfully',
      };
    }),

  /**
   * Generate image using trained style
   */
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        prompt: z.string(),
        negativePrompt: z.string().optional(),
        steps: z.number().int().min(1).max(100).default(30),
        guidance: z.number().min(1).max(20).default(7.5),
        seed: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (project.status !== 'ready') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Model is not ready for generation',
        });
      }

      // Get trigger word from metadata
      const metadata = project.hyperparameters as any;
      const triggerWord = metadata?.triggerWord || '';

      // Enhance prompt with trigger word
      const enhancedPrompt = triggerWord
        ? `${input.prompt}, ${triggerWord}`
        : input.prompt;

      // TODO: Call PyTorch service to generate image
      // For now, return a placeholder response

      const generationResult = {
        imageUrl: `${MINIO_URL}/galaos-generated/${ctx.user.id}/${Date.now()}.png`,
        prompt: enhancedPrompt,
        seed: input.seed || Math.floor(Math.random() * 1000000),
        steps: input.steps,
        guidance: input.guidance,
      };

      return generationResult;
    }),

  /**
   * Cancel training
   */
  cancelTraining: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.artStyleModel.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.user.id,
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (project.status !== 'training') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No training in progress',
        });
      }

      // TODO: Cancel the job in BullMQ
      // TODO: Stop the training process in PyTorch service

      await ctx.prisma.artStyleModel.update({
        where: { id: input.projectId },
        data: {
          status: 'failed',
          metrics: {
            ...(project.metrics as any),
            cancelled: true,
            cancelledAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: 'Training cancelled',
      };
    }),

  /**
   * Get training statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, pending, training, ready, failed] = await Promise.all([
      ctx.prisma.artStyleModel.count({ where: { userId: ctx.user.id } }),
      ctx.prisma.artStyleModel.count({
        where: { userId: ctx.user.id, status: 'pending' },
      }),
      ctx.prisma.artStyleModel.count({
        where: { userId: ctx.user.id, status: 'training' },
      }),
      ctx.prisma.artStyleModel.count({
        where: { userId: ctx.user.id, status: 'ready' },
      }),
      ctx.prisma.artStyleModel.count({
        where: { userId: ctx.user.id, status: 'failed' },
      }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        training,
        ready,
        failed,
      },
    };
  }),
});
