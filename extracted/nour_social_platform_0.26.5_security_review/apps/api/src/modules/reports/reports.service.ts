import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const ALLOWED_TYPES = new Set(['user', 'post', 'comment', 'story', 'message']);
const ALLOWED_REASONS = new Set([
  'spam',
  'harassment',
  'hate',
  'violence',
  'nudity',
  'misinformation',
  'other',
]);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    targetType: string,
    targetId: string,
    reason: string,
    details?: string,
  ) {
    if (!ALLOWED_TYPES.has(targetType)) {
      throw new BadRequestException('نوع الهدف غير صالح');
    }
    if (!targetId || targetId.length > 100) {
      throw new BadRequestException('معرّف الهدف غير صالح');
    }
    if (!ALLOWED_REASONS.has(reason)) {
      throw new BadRequestException('سبب البلاغ غير صالح');
    }
    const det = details?.trim();
    if (det && det.length > 2000) {
      throw new BadRequestException('التفاصيل يجب ألا تتجاوز 2000 حرف');
    }

    // Prevent self-report for users
    if (targetType === 'user' && targetId === authorId) {
      throw new BadRequestException('لا يمكن الإبلاغ عن نفسك');
    }

    const report = await this.prisma.report.create({
      data: {
        authorId,
        targetType,
        targetId,
        reason,
        details: det || null,
      },
    });
    return { report: { id: report.id, status: report.status, createdAt: report.createdAt } };
  }

  async listMine(authorId: string) {
    const reports = await this.prisma.report.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });
    return { reports };
  }

  private async assertAdmin(userId: string) {
    const admins = (process.env.ADMIN_USERNAMES || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    if (!admins.length) throw new BadRequestException('لوحة الإدارة غير مفعّلة (ADMIN_USERNAMES)');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (!user || !admins.includes(user.username.toLowerCase())) {
      throw new BadRequestException('غير مصرح');
    }
  }

  async listOpenForAdmin(actorId: string) {
    await this.assertAdmin(actorId);
    const reports = await this.prisma.report.findMany({
      where: { status: { in: ['OPEN', 'REVIEWING'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
    return { reports };
  }

  async resolve(actorId: string, reportId: string, status: 'RESOLVED' | 'DISMISSED') {
    await this.assertAdmin(actorId);
    if (status !== 'RESOLVED' && status !== 'DISMISSED') {
      throw new BadRequestException('حالة غير صالحة');
    }
    const existing = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!existing) throw new BadRequestException('البلاغ غير موجود');
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: { status, resolvedAt: new Date() },
    });
    return { report: { id: report.id, status: report.status, resolvedAt: report.resolvedAt } };
  }
}
