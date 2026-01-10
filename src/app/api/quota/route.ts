import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayQuotaUsage, checkQuota } from '@/lib/quota';

// GET /api/quota - Check current quota status
export async function GET() {
  const used = await getTodayQuotaUsage();
  const status = await checkQuota(100);

  // Get today's log entries for debugging
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logs = await prisma.quotaLog.findMany({
    where: { date: today },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    used,
    remaining: status.remaining,
    limit: 10000,
    hasQuota: status.hasQuota,
    logs,
  });
}

// DELETE /api/quota - Reset today's quota tracking (for testing)
export async function DELETE() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.quotaLog.deleteMany({
    where: { date: today },
  });

  return NextResponse.json({
    message: 'Quota tracking reset for today',
    deletedEntries: result.count,
  });
}
