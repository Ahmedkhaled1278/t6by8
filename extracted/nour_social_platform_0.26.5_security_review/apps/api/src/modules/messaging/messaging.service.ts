import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingGateway } from './messaging.gateway';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly gateway: MessagingGateway,
  ) {}

  private async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new UnauthorizedException('ليس لديك صلاحية على هذه المحادثة');
    return member;
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarKey: true } },
              },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { sequence: 'desc' },
              take: 1,
              include: {
                sender: { select: { id: true, username: true, displayName: true } },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
      take: 50,
    });

    return {
      conversations: memberships.map(m => {
        const others = m.conversation.members
          .filter(mem => mem.userId !== userId)
          .map(mem => mem.user);
        const last = m.conversation.messages[0] ?? null;
        return {
          id: m.conversation.id,
          type: m.conversation.type,
          title: m.conversation.title,
          updatedAt: m.conversation.updatedAt,
          lastReadAt: m.lastReadAt,
          members: others,
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                kind: last.kind,
                createdAt: last.createdAt,
                sender: last.sender,
              }
            : null,
        };
      }),
    };
  }

  async getOrCreateDirect(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new BadRequestException('لا يمكن بدء محادثة مع نفسك');

    const other = await this.prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
    if (!other) throw new BadRequestException('المستخدم غير موجود');

    // Block check
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    if (blocked) throw new BadRequestException('لا يمكن بدء محادثة مع هذا المستخدم');

    // Find existing DIRECT conversation with exactly these two members
    const candidates = await this.prisma.conversation.findMany({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarKey: true } } },
        },
      },
      take: 20,
    });
    const existing = candidates.find((c) => {
      const ids = new Set(c.members.map((m) => m.userId));
      return ids.size === 2 && ids.has(userId) && ids.has(otherUserId);
    });
    if (existing) {
      return { conversation: this.shapeConversation(existing, userId) };
    }

    const created = await this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: otherUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarKey: true } } },
        },
      },
    });

    return { conversation: this.shapeConversation(created, userId) };
  }


  async createGroup(creatorId: string, title: string, memberUserIds: string[]) {
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 120) {
      throw new BadRequestException('اسم المجموعة مطلوب وبحد أقصى 120 حرفًا');
    }
    const uniqueIds = [...new Set(memberUserIds.filter((id) => typeof id === 'string' && id && id !== creatorId))];
    if (uniqueIds.length > 40) throw new BadRequestException('حد أقصى 40 عضوًا عند الإنشاء');

    // Validate users exist and not blocked
    if (uniqueIds.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      if (users.length !== uniqueIds.length) throw new BadRequestException('بعض الأعضاء غير موجودين');
      for (const oid of uniqueIds) {
        const blocked = await this.prisma.userBlock.findFirst({
          where: {
            OR: [
              { blockerId: creatorId, blockedId: oid },
              { blockerId: oid, blockedId: creatorId },
            ],
          },
        });
        if (blocked) throw new BadRequestException('لا يمكن إضافة عضو محظور');
      }
    }

    const memberCreates = [
      { userId: creatorId, role: 'OWNER' as const },
      ...uniqueIds.map((userId) => ({ userId, role: 'MEMBER' as const })),
    ];

    const created = await this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        title: cleanTitle,
        members: { create: memberCreates },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarKey: true } } },
        },
      },
    });

    for (const uid of uniqueIds) {
      await this.notifications.create({
        userId: uid,
        type: 'group',
        title: 'دعوة لمجموعة',
        body: `تمت إضافتك إلى مجموعة «${cleanTitle}»`,
        actorId: creatorId,
        targetType: 'conversation',
        targetId: created.id,
      });
    }

    return { conversation: this.shapeConversation(created, creatorId) };
  }

  async addGroupMember(actorId: string, conversationId: string, newUserId: string) {
    const member = await this.assertMember(conversationId, actorId);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { type: true, title: true } });
    if (!conv || conv.type !== 'GROUP') throw new BadRequestException('ليست مجموعة');
    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new BadRequestException('يلزم صلاحية مشرف لإضافة أعضاء');
    }
    if (actorId === newUserId) throw new BadRequestException('أنت عضو بالفعل');
    const user = await this.prisma.user.findUnique({ where: { id: newUserId }, select: { id: true } });
    if (!user) throw new BadRequestException('المستخدم غير موجود');
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: actorId, blockedId: newUserId },
          { blockerId: newUserId, blockedId: actorId },
        ],
      },
      select: { blockerId: true },
    });
    if (blocked) throw new BadRequestException('لا يمكن إضافة عضو محظور');
    const existing = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: newUserId } },
    });
    if (existing) return { success: true, alreadyMember: true };
    await this.prisma.conversationMember.create({
      data: { conversationId, userId: newUserId, role: 'MEMBER' },
    });
    await this.notifications.create({
      userId: newUserId,
      type: 'group',
      title: 'دعوة لمجموعة',
      body: `تمت إضافتك إلى مجموعة «${conv.title || 'بدون اسم'}»`,
      actorId,
      targetType: 'conversation',
      targetId: conversationId,
    });
    return { success: true, alreadyMember: false };
  }

  private shapeConversation(
    conv: {
      id: string;
      type: string;
      title: string | null;
      updatedAt: Date;
      members: { userId: string; user: { id: string; username: string; displayName: string; avatarKey: string | null } }[];
    },
    viewerId: string,
  ) {
    return {
      id: conv.id,
      type: conv.type,
      title: conv.title,
      updatedAt: conv.updatedAt,
      members: conv.members.filter(m => m.userId !== viewerId).map(m => m.user),
    };
  }

  async listMessages(userId: string, conversationId: string, beforeSequence?: string) {
    await this.assertMember(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(beforeSequence ? { sequence: { lt: BigInt(beforeSequence) } } : {}),
      },
      orderBy: { sequence: 'desc' },
      take: 40,
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarKey: true } },
      },
    });

    // Mark as read
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return {
      messages: messages
        .map(m => ({
          id: m.id,
          clientMessageId: m.clientMessageId,
          sequence: m.sequence.toString(),
          kind: m.kind,
          body: m.body,
          createdAt: m.createdAt,
          sender: m.sender,
        }))
        .reverse(),
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    body: string,
    clientMessageId: string,
  ) {
    if (!body.trim() || body.trim().length > 4000) {
      throw new BadRequestException('نص الرسالة مطلوب ويجب ألا يتجاوز 4000 حرف');
    }
    if (!clientMessageId || typeof clientMessageId !== 'string' || !clientMessageId.trim()) {
      clientMessageId = `srv_${randomBytes(12).toString('hex')}`;
    }
    if (clientMessageId.length > 100) {
      throw new BadRequestException('معرّف الرسالة من العميل طويل جدًا');
    }

    await this.assertMember(conversationId, userId);

    // Idempotency
    const existing = await this.prisma.message.findUnique({
      where: { senderId_clientMessageId: { senderId: userId, clientMessageId } },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarKey: true } },
      },
    });
    if (existing) {
      return {
        message: {
          id: existing.id,
          clientMessageId: existing.clientMessageId,
          sequence: existing.sequence.toString(),
          kind: existing.kind,
          body: existing.body,
          createdAt: existing.createdAt,
          sender: existing.sender,
        },
        duplicate: true,
      };
    }

    // Allocate sequence inside a transaction; retry on rare unique conflicts
    let message: {
      id: string;
      clientMessageId: string;
      sequence: bigint;
      kind: string;
      body: string | null;
      createdAt: Date;
      sender: { id: string; username: string; displayName: string; avatarKey: string | null };
    } | null = null;
    for (let attempt = 0; attempt < 5 && !message; attempt++) {
      try {
        message = await this.prisma.$transaction(async (tx) => {
          const last = await tx.message.findFirst({
            where: { conversationId },
            orderBy: { sequence: 'desc' },
            select: { sequence: true },
          });
          const nextSeq = (last?.sequence ?? BigInt(0)) + BigInt(1);
          const created = await tx.message.create({
            data: {
              conversationId,
              senderId: userId,
              clientMessageId,
              sequence: nextSeq,
              kind: 'TEXT',
              body: body.trim(),
            },
            include: {
              sender: { select: { id: true, username: true, displayName: true, avatarKey: true } },
            },
          });
          await tx.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
          await tx.conversationMember.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { lastReadAt: new Date() },
          });
          return created;
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === 'P2002' && attempt < 4) continue;
        throw err;
      }
    }
    if (!message) throw new BadRequestException('تعذر إرسال الرسالة، حاول مرة أخرى');

    const others = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    const sender = message.sender;
    for (const o of others) {
      await this.notifications.create({
        userId: o.userId,
        type: 'message',
        title: 'رسالة جديدة',
        body: `${sender.displayName}: ${(message.body ?? '').slice(0, 80)}`,
        actorId: userId,
        targetType: 'conversation',
        targetId: conversationId,
      });
    }

    const payload = {
      id: message.id,
      clientMessageId: message.clientMessageId,
      sequence: message.sequence.toString(),
      kind: message.kind,
      body: message.body,
      createdAt: message.createdAt,
      sender: message.sender,
    };
    const memberIds = [userId, ...others.map(o => o.userId)];
    this.gateway.emitNewMessage(conversationId, memberIds, payload);

    return {
      message: payload,
      duplicate: false,
    };
  }
}
