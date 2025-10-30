import { prisma } from '@galaos/db';

export async function checkUserLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await prisma.usageLimits.findUnique({ where: { userId } });
  if (!limits) return { allowed: true };

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const dayEvents = await prisma.usageEvent.findMany({ where: { userId, createdAt: { gte: startOfDay } } });
  const dayUsd = dayEvents.reduce((s: number, e: any) => s + Number(e.costUsd), 0);
  if (Number(limits.dailyUsdCap) > 0 && dayUsd >= Number(limits.dailyUsdCap)) {
    return { allowed: false, reason: 'Daily budget reached' };
  }

  const monthEvents = await prisma.usageEvent.findMany({ where: { userId, createdAt: { gte: startOfMonth } } });
  const monthUsd = monthEvents.reduce((s: number, e: any) => s + Number(e.costUsd), 0);
  if (Number(limits.monthlyUsdCap) > 0 && monthUsd >= Number(limits.monthlyUsdCap)) {
    return { allowed: false, reason: 'Monthly budget reached' };
  }

  // Request quotas (per day)
  if (limits.perDay && dayEvents.length >= limits.perDay) {
    return { allowed: false, reason: 'Daily request quota reached' };
  }

  // Per hour quota
  const hourEvents = await prisma.usageEvent.count({ where: { userId, createdAt: { gte: oneHourAgo } } });
  if (limits.perHour && hourEvents >= limits.perHour) {
    return { allowed: false, reason: 'Hourly request quota reached' };
  }

  return { allowed: true };
}
