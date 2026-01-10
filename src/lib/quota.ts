import { prisma } from './prisma';

const DAILY_QUOTA_LIMIT = 10000;

export async function getTodayQuotaUsage(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.quotaLog.aggregate({
    where: {
      date: today,
    },
    _sum: {
      unitsUsed: true,
    },
  });

  return result._sum.unitsUsed || 0;
}

export async function checkQuota(requiredUnits: number = 100): Promise<{
  hasQuota: boolean;
  remaining: number;
  used: number;
}> {
  const used = await getTodayQuotaUsage();
  const remaining = DAILY_QUOTA_LIMIT - used;

  return {
    hasQuota: remaining >= requiredUnits,
    remaining,
    used,
  };
}

export async function logQuotaUsage(
  operation: string,
  units: number,
  details?: object
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.quotaLog.create({
    data: {
      date: today,
      unitsUsed: units,
      operation,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}

// Quota costs for different operations
export const QUOTA_COSTS = {
  SEARCH: 100,
  VIDEOS_LIST: 1,
  CHANNELS_LIST: 1,
} as const;
