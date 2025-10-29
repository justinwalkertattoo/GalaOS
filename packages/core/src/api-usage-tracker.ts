/**
 * API Usage Tracker
 *
 * Monitors and enforces API usage quotas for cost control
 * Tracks usage across OpenAI, Anthropic, Perplexity, Gemini, and Hugging Face
 */

import { PrismaClient } from '@galaos/db';

// Pricing per 1M tokens (approximate as of 2024)
const PRICING = {
  'openai': {
    'gpt-4': { input: 30, output: 60 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  },
  'anthropic': {
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-sonnet': { input: 3, output: 15 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
  },
  'gemini': {
    'gemini-pro': { input: 0.5, output: 1.5 },
    'gemini-ultra': { input: 10, output: 30 },
  },
  'perplexity': {
    'pplx-70b-online': { input: 1, output: 1 },
    'pplx-7b-chat': { input: 0.2, output: 0.2 },
  },
  'huggingface': {
    'default': { input: 0, output: 0 }, // Free for most models
  },
} as const;

interface UsageMetrics {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  endpoint?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  requestId?: string;
  agentId?: string;
  workflowId?: string;
  conversationId?: string;
}

interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  currentUsage?: {
    dailyRequests: number;
    monthlyRequests: number;
    dailyCost: number;
    monthlyCost: number;
    dailyTokens: number;
    monthlyTokens: number;
  };
  limits?: {
    dailyLimit?: number;
    monthlyLimit?: number;
    dailyCostLimit?: number;
    monthlyCostLimit?: number;
    dailyTokenLimit?: number;
    monthlyTokenLimit?: number;
  };
}

export class ApiUsageTracker {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Check if user has quota available for this request
   */
  async checkQuota(userId: string, provider: string): Promise<QuotaCheck> {
    const quota = await this.prisma.apiUsageQuota.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    // No quota set = unlimited
    if (!quota || !quota.isActive) {
      return { allowed: true };
    }

    // Check daily request limit
    if (quota.dailyLimit && quota.currentDailyUsage >= quota.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily request limit reached (${quota.dailyLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check monthly request limit
    if (quota.monthlyLimit && quota.currentMonthlyUsage >= quota.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly request limit reached (${quota.monthlyLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check daily cost limit
    if (quota.dailyCostLimit && quota.currentDailyCost >= quota.dailyCostLimit) {
      return {
        allowed: false,
        reason: `Daily cost limit reached ($${quota.dailyCostLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check monthly cost limit
    if (quota.monthlyCostLimit && quota.currentMonthlyCost >= quota.monthlyCostLimit) {
      return {
        allowed: false,
        reason: `Monthly cost limit reached ($${quota.monthlyCostLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check daily token limit
    if (quota.dailyTokenLimit && quota.currentDailyTokens >= quota.dailyTokenLimit) {
      return {
        allowed: false,
        reason: `Daily token limit reached (${quota.dailyTokenLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check monthly token limit
    if (quota.monthlyTokenLimit && quota.currentMonthlyTokens >= quota.monthlyTokenLimit) {
      return {
        allowed: false,
        reason: `Monthly token limit reached (${quota.monthlyTokenLimit})`,
        currentUsage: this.formatUsage(quota),
        limits: this.formatLimits(quota),
      };
    }

    // Check if approaching limits (for alerts)
    await this.checkThresholds(userId, provider, quota);

    return {
      allowed: true,
      currentUsage: this.formatUsage(quota),
      limits: this.formatLimits(quota),
    };
  }

  /**
   * Track API usage after request completes
   */
  async trackUsage(userId: string, metrics: UsageMetrics): Promise<void> {
    const cost = this.calculateCost(metrics);

    // Log the usage
    await this.prisma.apiUsageLog.create({
      data: {
        userId,
        provider: metrics.provider,
        model: metrics.model,
        endpoint: metrics.endpoint,
        promptTokens: metrics.promptTokens,
        completionTokens: metrics.completionTokens,
        totalTokens: metrics.totalTokens,
        estimatedCost: cost,
        requestId: metrics.requestId,
        duration: metrics.duration,
        statusCode: metrics.statusCode,
        error: metrics.error,
        agentId: metrics.agentId,
        workflowId: metrics.workflowId,
        conversationId: metrics.conversationId,
      },
    });

    // Update quota usage
    await this.updateQuotaUsage(userId, metrics.provider, cost, metrics.totalTokens || 0);
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(metrics: UsageMetrics): number {
    const provider = metrics.provider.toLowerCase();
    const model = metrics.model.toLowerCase();

    // Get pricing for this provider/model
    let pricing = PRICING[provider as keyof typeof PRICING]?.[model as any];

    if (!pricing) {
      // Try to find closest match or use default
      const providerPricing = PRICING[provider as keyof typeof PRICING];
      if (providerPricing) {
        pricing = providerPricing['default' as any] || Object.values(providerPricing)[0];
      } else {
        return 0;
      }
    }

    const promptCost = (metrics.promptTokens || 0) * (pricing.input / 1_000_000);
    const completionCost = (metrics.completionTokens || 0) * (pricing.output / 1_000_000);

    return promptCost + completionCost;
  }

  /**
   * Update quota usage counters
   */
  private async updateQuotaUsage(
    userId: string,
    provider: string,
    cost: number,
    tokens: number
  ): Promise<void> {
    const now = new Date();

    // Get or create quota
    let quota = await this.prisma.apiUsageQuota.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    });

    if (!quota) {
      // Create default quota if none exists
      quota = await this.prisma.apiUsageQuota.create({
        data: {
          userId,
          provider,
          isActive: true,
        },
      });
    }

    // Check if we need to reset daily counters
    const daysSinceReset = Math.floor(
      (now.getTime() - quota.lastDailyReset.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check if we need to reset monthly counters
    const monthsSinceReset =
      now.getMonth() - quota.lastMonthlyReset.getMonth() +
      (12 * (now.getFullYear() - quota.lastMonthlyReset.getFullYear()));

    // Update quota
    await this.prisma.apiUsageQuota.update({
      where: { id: quota.id },
      data: {
        currentDailyUsage: daysSinceReset > 0 ? 1 : quota.currentDailyUsage + 1,
        currentMonthlyUsage: monthsSinceReset > 0 ? 1 : quota.currentMonthlyUsage + 1,
        currentDailyCost: daysSinceReset > 0 ? cost : quota.currentDailyCost + cost,
        currentMonthlyCost: monthsSinceReset > 0 ? cost : quota.currentMonthlyCost + cost,
        currentDailyTokens: daysSinceReset > 0 ? tokens : quota.currentDailyTokens + tokens,
        currentMonthlyTokens: monthsSinceReset > 0 ? tokens : quota.currentMonthlyTokens + tokens,
        lastDailyReset: daysSinceReset > 0 ? now : quota.lastDailyReset,
        lastMonthlyReset: monthsSinceReset > 0 ? now : quota.lastMonthlyReset,
      },
    });
  }

  /**
   * Check if usage is approaching thresholds and create alerts
   */
  private async checkThresholds(userId: string, provider: string, quota: any): Promise<void> {
    const threshold = quota.alertOnThreshold || 0.8;

    const checks = [
      {
        type: 'daily_limit',
        current: quota.currentDailyUsage,
        limit: quota.dailyLimit,
        message: 'Daily request limit',
      },
      {
        type: 'monthly_limit',
        current: quota.currentMonthlyUsage,
        limit: quota.monthlyLimit,
        message: 'Monthly request limit',
      },
      {
        type: 'daily_cost',
        current: quota.currentDailyCost,
        limit: quota.dailyCostLimit,
        message: 'Daily cost limit',
      },
      {
        type: 'monthly_cost',
        current: quota.currentMonthlyCost,
        limit: quota.monthlyCostLimit,
        message: 'Monthly cost limit',
      },
      {
        type: 'daily_tokens',
        current: quota.currentDailyTokens,
        limit: quota.dailyTokenLimit,
        message: 'Daily token limit',
      },
      {
        type: 'monthly_tokens',
        current: quota.currentMonthlyTokens,
        limit: quota.monthlyTokenLimit,
        message: 'Monthly token limit',
      },
    ];

    for (const check of checks) {
      if (!check.limit) continue;

      const percentage = check.current / check.limit;

      if (percentage >= threshold && percentage < 1) {
        // Create warning alert
        await this.createAlert(userId, provider, {
          alertType: check.type,
          threshold: percentage,
          currentValue: check.current,
          message: `${check.message} at ${Math.round(percentage * 100)}% (${check.current}/${check.limit})`,
          severity: 'warning',
        });
      } else if (percentage >= 0.95) {
        // Create critical alert
        await this.createAlert(userId, provider, {
          alertType: check.type,
          threshold: percentage,
          currentValue: check.current,
          message: `${check.message} CRITICAL at ${Math.round(percentage * 100)}% (${check.current}/${check.limit})`,
          severity: 'critical',
        });
      }
    }
  }

  /**
   * Create cost alert
   */
  private async createAlert(
    userId: string,
    provider: string,
    alert: {
      alertType: string;
      threshold: number;
      currentValue: number;
      message: string;
      severity: string;
    }
  ): Promise<void> {
    // Check if similar unread alert exists
    const existing = await this.prisma.costAlert.findFirst({
      where: {
        userId,
        provider,
        alertType: alert.alertType,
        isRead: false,
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60), // Within last hour
        },
      },
    });

    if (!existing) {
      await this.prisma.costAlert.create({
        data: {
          userId,
          provider,
          ...alert,
        },
      });
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string, provider?: string) {
    const where: any = { userId };
    if (provider) where.provider = provider;

    const [quotas, recentLogs, alerts] = await Promise.all([
      this.prisma.apiUsageQuota.findMany({ where }),
      this.prisma.apiUsageLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 100,
      }),
      this.prisma.costAlert.findMany({
        where: { ...where, isRead: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { quotas, recentLogs, alerts };
  }

  /**
   * Set quota limits for a user
   */
  async setQuota(
    userId: string,
    provider: string,
    limits: {
      dailyLimit?: number;
      monthlyLimit?: number;
      dailyCostLimit?: number;
      monthlyCostLimit?: number;
      dailyTokenLimit?: number;
      monthlyTokenLimit?: number;
      alertOnThreshold?: number;
    }
  ) {
    return await this.prisma.apiUsageQuota.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      create: {
        userId,
        provider,
        ...limits,
        isActive: true,
      },
      update: limits,
    });
  }

  private formatUsage(quota: any) {
    return {
      dailyRequests: quota.currentDailyUsage,
      monthlyRequests: quota.currentMonthlyUsage,
      dailyCost: quota.currentDailyCost,
      monthlyCost: quota.currentMonthlyCost,
      dailyTokens: quota.currentDailyTokens,
      monthlyTokens: quota.currentMonthlyTokens,
    };
  }

  private formatLimits(quota: any) {
    return {
      dailyLimit: quota.dailyLimit,
      monthlyLimit: quota.monthlyLimit,
      dailyCostLimit: quota.dailyCostLimit,
      monthlyCostLimit: quota.monthlyCostLimit,
      dailyTokenLimit: quota.dailyTokenLimit,
      monthlyTokenLimit: quota.monthlyTokenLimit,
    };
  }
}

export default ApiUsageTracker;
