import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly push: PushService) {}

  async create(params: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    actorId?: string;
    targetType?: string;
    targetId?: string;
  }) {
    if (params.actorId && params.actorId === params.userId) return null;
    const created = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        actorId: params.actorId,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    });
    void this.push.notifyUser(params.userId, params.title, params.body || '', '/notifications');
    return created;
  }

  async list(userId: string, limit = 30) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { notifications: items, unreadCount };
  }

  async markRead(userId: string, ids?: string[]) {
    if (ids?.length) {
      await this.prisma.notification.updateMany({
        where: { userId, id: { in: ids }, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return { success: true };
  }
}
