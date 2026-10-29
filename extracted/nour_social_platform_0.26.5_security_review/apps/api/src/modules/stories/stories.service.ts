import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MediaService } from '../media/media.service';

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async create(userId: string, objectKey: string, mediaType: string, caption?: string) {
    if (!this.media.isAllowedKeyForUser(objectKey, userId)) {
      throw new BadRequestException('مفتاح الوسائط غير صالح');
    }
    if (!mediaType.startsWith('image/')) {
      throw new BadRequestException('القصص تدعم الصور فقط حاليًا');
    }
    const cap = caption?.trim();
    if (cap && cap.length > 500) {
      throw new BadRequestException('التعليق يجب ألا يتجاوز 500 حرف');
    }

    const story = await this.prisma.story.create({
      data: {
        authorId: userId,
        objectKey,
        mediaType,
        caption: cap || null,
        expiresAt: new Date(Date.now() + STORY_TTL_MS),
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarKey: true } },
      },
    });

    return {
      story: {
        ...story,
        url: await this.media.getReadUrl(story.objectKey),
      },
    };
  }

  async feed(viewerId: string | null) {
    const now = new Date();
    let authorFilter: { authorId?: { in: string[] } } = {};

    if (viewerId) {
      const follows = await this.prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followedId: true },
      });
      const ids = [viewerId, ...follows.map(f => f.followedId)];

      // exclude blocked
      const blocks = await this.prisma.userBlock.findMany({
        where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
        select: { blockerId: true, blockedId: true },
      });
      const blocked = new Set<string>();
      for (const b of blocks) {
        blocked.add(b.blockerId === viewerId ? b.blockedId : b.blockerId);
      }
      const allowed = ids.filter(id => !blocked.has(id));
      authorFilter = { authorId: { in: allowed.length ? allowed : [viewerId] } };
    }

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        ...authorFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarKey: true } },
        _count: { select: { views: true } },
      },
    });

    // group by author
    const byAuthor = new Map<string, typeof stories>();
    for (const s of stories) {
      const list = byAuthor.get(s.authorId) ?? [];
      list.push(s);
      byAuthor.set(s.authorId, list);
    }

    const groups = [];
    for (const [, list] of byAuthor) {
      const author = list[0].author;
      const items = await Promise.all(
        list.map(async s => ({
          id: s.id,
          caption: s.caption,
          mediaType: s.mediaType,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          viewsCount: s._count.views,
          url: await this.media.getReadUrl(s.objectKey),
        })),
      );
      groups.push({ author, stories: items });
    }

    return { groups };
  }

  async view(viewerId: string, storyId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gt: new Date() } },
      select: { id: true, authorId: true },
    });
    if (!story) throw new BadRequestException('القصة غير موجودة أو انتهت');

    // block check
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: story.authorId },
          { blockerId: story.authorId, blockedId: viewerId },
        ],
      },
    });
    if (blocked) throw new BadRequestException('القصة غير متاحة');

    await this.prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      create: { storyId, viewerId },
      update: { viewedAt: new Date() },
    });

    return { success: true };
  }
}
