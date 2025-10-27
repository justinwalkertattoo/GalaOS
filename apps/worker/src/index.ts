import { Worker, Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@galaos/db';
import winston from 'winston';

// Setup logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'worker-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'worker.log' }),
  ],
});

// Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Prisma client
const prisma = new PrismaClient();

// Job queues
const transcriptionQueue = new Queue('transcription', { connection });
const mediaProcessingQueue = new Queue('media-processing', { connection });
const modelTrainingQueue = new Queue('model-training', { connection });
const knowledgeUpdateQueue = new Queue('knowledge-update', { connection });
const auditQueue = new Queue('audit', { connection });

// ============================================================================
// TRANSCRIPTION WORKER
// ============================================================================

const transcriptionWorker = new Worker(
  'transcription',
  async (job: Job) => {
    const { fileUrl, fileName, userId, inboxItemId } = job.data;

    logger.info(`Processing transcription for ${fileName}`);

    try {
      // Download file
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const tempFilePath = `/tmp/${fileName}`;
      await fs.writeFile(tempFilePath, response.data);

      // Send to Whisper service
      const formData = new FormData();
      formData.append('audio_file', await fs.readFile(tempFilePath), fileName);
      formData.append('task', 'transcribe');
      formData.append('language', 'en');
      formData.append('output', 'json');

      const whisperResponse = await axios.post(
        `${process.env.WHISPER_URL}/asr`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 300000, // 5 minutes
        }
      );

      const transcription = whisperResponse.data.text;

      // Update inbox item with transcription
      await prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: {
          metadata: {
            transcription,
            duration: whisperResponse.data.duration,
            language: whisperResponse.data.language,
          },
          processedAt: new Date(),
        },
      });

      // Clean up temp file
      await fs.unlink(tempFilePath);

      logger.info(`Transcription completed for ${fileName}`);

      return { success: true, transcription };
    } catch (error: any) {
      logger.error(`Transcription failed for ${fileName}:`, error.message);
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

// ============================================================================
// MEDIA PROCESSING WORKER
// ============================================================================

const mediaProcessingWorker = new Worker(
  'media-processing',
  async (job: Job) => {
    const { fileUrl, fileName, userId, inboxItemId, operation } = job.data;

    logger.info(`Processing media operation ${operation} for ${fileName}`);

    try {
      // Download file
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      const tempInputPath = `/tmp/input_${fileName}`;
      await fs.writeFile(tempInputPath, response.data);

      let result: any = {};

      switch (operation) {
        case 'extract_audio':
          // Use FFmpeg to extract audio
          const outputPath = `/tmp/audio_${fileName}.mp3`;
          // Execute FFmpeg command (would need to shell out to container)
          result = { audioPath: outputPath };
          break;

        case 'ocr':
          // Use Tesseract for OCR
          // Send to Tesseract service
          result = { text: 'Extracted text...' };
          break;

        case 'thumbnail':
          // Generate thumbnail
          result = { thumbnailPath: '/tmp/thumb.jpg' };
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      // Update inbox item
      await prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: {
          metadata: { ...result },
          processedAt: new Date(),
        },
      });

      // Clean up
      await fs.unlink(tempInputPath);

      logger.info(`Media processing completed for ${fileName}`);

      return { success: true, ...result };
    } catch (error: any) {
      logger.error(`Media processing failed for ${fileName}:`, error.message);
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

// ============================================================================
// MODEL TRAINING WORKER
// ============================================================================

const modelTrainingWorker = new Worker(
  'model-training',
  async (job: Job) => {
    const { modelType, trainingData, userId, config } = job.data;

    logger.info(`Starting model training: ${modelType}`);

    try {
      // For art style training
      if (modelType === 'art_style') {
        // Send to PyTorch service to train LoRA model
        const response = await axios.post(
          `${process.env.PYTORCH_URL}/predictions/art_style_trainer`,
          {
            images: trainingData.images,
            prompt: trainingData.prompt,
            steps: config.steps || 1000,
            learning_rate: config.learningRate || 0.0001,
          },
          { timeout: 3600000 } // 1 hour timeout
        );

        // Save trained model reference
        await prisma.modelProvider.create({
          data: {
            userId,
            name: `Art Style - ${new Date().toISOString()}`,
            type: 'docker',
            provider: 'docker',
            model: response.data.model_id,
            baseUrl: process.env.PYTORCH_URL,
          },
        });

        logger.info(`Model training completed: ${modelType}`);

        return { success: true, modelId: response.data.model_id };
      }

      throw new Error(`Unknown model type: ${modelType}`);
    } catch (error: any) {
      logger.error(`Model training failed for ${modelType}:`, error.message);
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

// ============================================================================
// KNOWLEDGE UPDATE WORKER
// ============================================================================

const knowledgeUpdateWorker = new Worker(
  'knowledge-update',
  async (job: Job) => {
    const { type, data, userId } = job.data;

    logger.info(`Updating knowledge: ${type}`);

    try {
      switch (type) {
        case 'embedding':
          // Create embeddings and store in Qdrant
          const embeddingResponse = await axios.post(
            `${process.env.ANTHROPIC_API_KEY ? 'https://api.anthropic.com' : process.env.OLLAMA_URL}/embeddings`,
            { text: data.text }
          );

          // Store in vector DB
          await axios.put(`${process.env.QDRANT_URL}/collections/knowledge/points`, {
            points: [
              {
                id: data.id,
                vector: embeddingResponse.data.embedding,
                payload: {
                  userId,
                  text: data.text,
                  metadata: data.metadata,
                  timestamp: new Date().toISOString(),
                },
              },
            ],
          });
          break;

        case 'contradiction':
          // Handle contradiction detection and resolution
          logger.warn(`Contradiction detected in knowledge base`);
          // Implement contradiction resolution logic
          break;

        default:
          logger.warn(`Unknown knowledge update type: ${type}`);
      }

      logger.info(`Knowledge update completed: ${type}`);

      return { success: true };
    } catch (error: any) {
      logger.error(`Knowledge update failed for ${type}:`, error.message);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// ============================================================================
// AUDIT WORKER
// ============================================================================

const auditWorker = new Worker(
  'audit',
  async (job: Job) => {
    const { auditType, scope } = job.data;

    logger.info(`Running audit: ${auditType}`);

    try {
      switch (auditType) {
        case 'knowledge_verification':
          // Verify facts in knowledge base
          const knowledgeItems = await prisma.knowledgeBase.findMany({
            where: { verified: false },
            take: 100,
          });

          for (const item of knowledgeItems) {
            // Use LLM to verify fact
            // Mark as verified or flag for review
          }
          break;

        case 'memory_consolidation':
          // Consolidate similar memories
          logger.info('Running memory consolidation');
          break;

        case 'performance_check':
          // Check system performance metrics
          logger.info('Running performance check');
          break;

        default:
          logger.warn(`Unknown audit type: ${auditType}`);
      }

      logger.info(`Audit completed: ${auditType}`);

      return { success: true };
    } catch (error: any) {
      logger.error(`Audit failed for ${auditType}:`, error.message);
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

// Schedule routine audits
async function scheduleRoutineAudits() {
  // Daily knowledge verification
  await auditQueue.add(
    'daily-verification',
    { auditType: 'knowledge_verification', scope: 'all' },
    {
      repeat: {
        pattern: '0 2 * * *', // 2 AM daily
      },
    }
  );

  // Weekly memory consolidation
  await auditQueue.add(
    'weekly-consolidation',
    { auditType: 'memory_consolidation', scope: 'all' },
    {
      repeat: {
        pattern: '0 3 * * 0', // 3 AM on Sundays
      },
    }
  );

  // Hourly performance check
  await auditQueue.add(
    'hourly-performance',
    { auditType: 'performance_check', scope: 'system' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
}

// ============================================================================
// STARTUP
// ============================================================================

async function main() {
  logger.info('GalaOS Worker Service Starting...');

  // Test connections
  try {
    await connection.ping();
    logger.info('✓ Connected to Redis');

    await prisma.$connect();
    logger.info('✓ Connected to PostgreSQL');

    // Schedule routine jobs
    await scheduleRoutineAudits();
    logger.info('✓ Scheduled routine audits');

    logger.info('🚀 GalaOS Worker Service Ready!');
  } catch (error) {
    logger.error('Failed to start worker service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await transcriptionWorker.close();
  await mediaProcessingWorker.close();
  await modelTrainingWorker.close();
  await knowledgeUpdateWorker.close();
  await auditWorker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

main();
