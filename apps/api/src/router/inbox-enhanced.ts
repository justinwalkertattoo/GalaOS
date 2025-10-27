import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import axios from 'axios';
import FormData from 'form-data';

// Environment variables
const MINIO_URL = process.env.MINIO_URL || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || 'galaos';
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || 'minio_secure_password_change_me';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Import BullMQ for job queues
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Job queues
const transcriptionQueue = new Queue('transcription', { connection });
const mediaProcessingQueue = new Queue('media-processing', { connection });
const knowledgeUpdateQueue = new Queue('knowledge-update', { connection });

/**
 * Enhanced Universal Inbox Router
 *
 * Accepts all forms of media:
 * - URLs (web scraping)
 * - Files (any format)
 * - Images (with OCR)
 * - Audio (with transcription)
 * - Video (with transcription and frames)
 * - Text
 */
export const inboxEnhancedRouter = router({
  /**
   * Submit URL to inbox
   */
  submitUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create inbox item
      const inboxItem = await ctx.prisma.inboxItem.create({
        data: {
          userId: ctx.user.id,
          type: 'url',
          url: input.url,
          status: 'pending',
          metadata: input.metadata || {},
        },
      });

      // Queue for processing (web scraping)
      await knowledgeUpdateQueue.add('scrape-url', {
        inboxItemId: inboxItem.id,
        url: input.url,
        userId: ctx.user.id,
      });

      return {
        id: inboxItem.id,
        status: 'queued',
        message: 'URL queued for processing',
      };
    }),

  /**
   * Submit text content to inbox
   */
  submitText: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create inbox item
      const inboxItem = await ctx.prisma.inboxItem.create({
        data: {
          userId: ctx.user.id,
          type: 'text',
          content: input.content,
          status: 'pending',
          metadata: input.metadata || {},
        },
      });

      // Queue for knowledge extraction
      await knowledgeUpdateQueue.add('process-text', {
        inboxItemId: inboxItem.id,
        content: input.content,
        userId: ctx.user.id,
      });

      return {
        id: inboxItem.id,
        status: 'queued',
        message: 'Text queued for processing',
      };
    }),

  /**
   * Submit file to inbox (multipart upload)
   *
   * Note: This endpoint expects base64 encoded file data from tRPC client
   * For direct multipart uploads, use the Express endpoint below
   */
  submitFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        mimeType: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const fileSize = fileBuffer.length;

      // Determine type from MIME type
      let type = 'file';
      if (input.mimeType.startsWith('image/')) type = 'image';
      else if (input.mimeType.startsWith('audio/')) type = 'audio';
      else if (input.mimeType.startsWith('video/')) type = 'video';

      // Create inbox item
      const inboxItem = await ctx.prisma.inboxItem.create({
        data: {
          userId: ctx.user.id,
          type,
          fileName: input.fileName,
          fileSize,
          mimeType: input.mimeType,
          status: 'pending',
          metadata: input.metadata || {},
        },
      });

      try {
        // Upload to MinIO
        const bucketName = 'galaos-inbox';
        const objectName = `${ctx.user.id}/${inboxItem.id}/${input.fileName}`;

        // Create FormData for MinIO upload
        const formData = new FormData();
        formData.append('file', fileBuffer, {
          filename: input.fileName,
          contentType: input.mimeType,
        });

        // Upload to MinIO using presigned URL or direct upload
        // For now, we'll store the file path reference
        const fileUrl = `${MINIO_URL}/${bucketName}/${objectName}`;

        // Update inbox item with file URL
        await ctx.prisma.inboxItem.update({
          where: { id: inboxItem.id },
          data: {
            url: fileUrl,
            metadata: {
              ...input.metadata,
              storagePath: objectName,
              bucketName,
            },
          },
        });

        // Queue appropriate processing job based on type
        if (type === 'audio') {
          await transcriptionQueue.add('transcribe', {
            inboxItemId: inboxItem.id,
            fileUrl,
            fileName: input.fileName,
            userId: ctx.user.id,
          });
        } else if (type === 'image') {
          await mediaProcessingQueue.add('ocr', {
            inboxItemId: inboxItem.id,
            fileUrl,
            fileName: input.fileName,
            userId: ctx.user.id,
            processType: 'ocr',
          });
        } else if (type === 'video') {
          await mediaProcessingQueue.add('video', {
            inboxItemId: inboxItem.id,
            fileUrl,
            fileName: input.fileName,
            userId: ctx.user.id,
            processType: 'video',
          });
        } else {
          // Generic file processing
          await knowledgeUpdateQueue.add('process-file', {
            inboxItemId: inboxItem.id,
            fileUrl,
            fileName: input.fileName,
            mimeType: input.mimeType,
            userId: ctx.user.id,
          });
        }

        return {
          id: inboxItem.id,
          status: 'queued',
          message: `${type} file queued for processing`,
          fileUrl,
        };
      } catch (error) {
        // Update inbox item status to failed
        await ctx.prisma.inboxItem.update({
          where: { id: inboxItem.id },
          data: { status: 'failed' },
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload file',
        });
      }
    }),

  /**
   * List inbox items
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
        type: z.enum(['url', 'file', 'text', 'image', 'audio', 'video']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.user.id,
      };

      if (input.status) {
        where.status = input.status;
      }

      if (input.type) {
        where.type = input.type;
      }

      const items = await ctx.prisma.inboxItem.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const total = await ctx.prisma.inboxItem.count({ where });

      return {
        items,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  /**
   * Get single inbox item
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.inboxItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Inbox item not found' });
      }

      return item;
    }),

  /**
   * Delete inbox item
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inboxItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // TODO: Delete file from MinIO if exists

      await ctx.prisma.inboxItem.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Retry failed processing
   */
  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inboxItem.findFirst({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Reset status to pending
      await ctx.prisma.inboxItem.update({
        where: { id: input.id },
        data: { status: 'pending' },
      });

      // Re-queue based on type
      if (item.type === 'url') {
        await knowledgeUpdateQueue.add('scrape-url', {
          inboxItemId: item.id,
          url: item.url,
          userId: ctx.user.id,
        });
      } else if (item.type === 'audio') {
        await transcriptionQueue.add('transcribe', {
          inboxItemId: item.id,
          fileUrl: item.url,
          fileName: item.fileName,
          userId: ctx.user.id,
        });
      } else if (item.type === 'image') {
        await mediaProcessingQueue.add('ocr', {
          inboxItemId: item.id,
          fileUrl: item.url,
          fileName: item.fileName,
          userId: ctx.user.id,
          processType: 'ocr',
        });
      } else if (item.type === 'video') {
        await mediaProcessingQueue.add('video', {
          inboxItemId: item.id,
          fileUrl: item.url,
          fileName: item.fileName,
          userId: ctx.user.id,
          processType: 'video',
        });
      } else {
        await knowledgeUpdateQueue.add('process-file', {
          inboxItemId: item.id,
          fileUrl: item.url,
          fileName: item.fileName,
          mimeType: item.mimeType,
          userId: ctx.user.id,
        });
      }

      return {
        success: true,
        status: 'pending',
        message: 'Item re-queued for processing',
      };
    }),

  /**
   * Get inbox statistics
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [total, pending, processing, completed, failed] = await Promise.all([
      ctx.prisma.inboxItem.count({ where: { userId: ctx.user.id } }),
      ctx.prisma.inboxItem.count({
        where: { userId: ctx.user.id, status: 'pending' },
      }),
      ctx.prisma.inboxItem.count({
        where: { userId: ctx.user.id, status: 'processing' },
      }),
      ctx.prisma.inboxItem.count({
        where: { userId: ctx.user.id, status: 'completed' },
      }),
      ctx.prisma.inboxItem.count({
        where: { userId: ctx.user.id, status: 'failed' },
      }),
    ]);

    const byType = await ctx.prisma.inboxItem.groupBy({
      by: ['type'],
      where: { userId: ctx.user.id },
      _count: true,
    });

    return {
      total,
      byStatus: {
        pending,
        processing,
        completed,
        failed,
      },
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }),

  /**
   * Bulk submit URLs
   */
  bulkSubmitUrls: protectedProcedure
    .input(
      z.object({
        urls: z.array(z.string().url()).min(1).max(100),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const items = await Promise.all(
        input.urls.map((url) =>
          ctx.prisma.inboxItem.create({
            data: {
              userId: ctx.user.id,
              type: 'url',
              url,
              status: 'pending',
              metadata: input.metadata || {},
            },
          })
        )
      );

      // Queue all for processing
      await Promise.all(
        items.map((item) =>
          knowledgeUpdateQueue.add('scrape-url', {
            inboxItemId: item.id,
            url: item.url,
            userId: ctx.user.id,
          })
        )
      );

      return {
        count: items.length,
        items: items.map((i) => ({ id: i.id, url: i.url })),
        message: `${items.length} URLs queued for processing`,
      };
    }),
});

/**
 * Express middleware for direct file uploads
 *
 * Use this for handling multipart/form-data uploads from web clients
 * Add to your Express app:
 *
 * import multer from 'multer';
 * import { inboxUploadHandler } from './router/inbox-enhanced';
 *
 * const upload = multer({ dest: 'uploads/' });
 * app.post('/api/inbox/upload', upload.single('file'), inboxUploadHandler);
 */
export async function inboxUploadHandler(req: any, res: any) {
  // TODO: Implement Express handler with Multer
  // This would handle direct file uploads from the web UI
  res.status(501).json({ error: 'Not implemented - use submitFile endpoint' });
}
