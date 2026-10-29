import { Controller, Get, Headers, Query } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../database/prisma.service';
import { readSessionToken } from '../../common/session-token';

@Controller('search')
export class SearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async search(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Query('q') q?: string) {
    const query = (q ?? '').trim();
    if (query.length < 1 || query.length > 80) {
      return { users: [], posts: [] };
    }

    let blockedIds: string[] = [];
    try {
      const current = await this.auth.current(readSessionToken(cookie, authorization));
      const blocks = await this.prisma.userBlock.findMany({
        where: { OR: [{ blockerId: current.user.id }, { blockedId: current.user.id }] },
        select: { blockerId: true, blockedId: true },
      });
      const set = new Set<string>();
      for (const b of blocks) {
        set.add(b.blockerId === current.user.id ? b.blockedId : b.blockerId);
      }
      blockedIds = [...set];
    } catch {
      // anonymous
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
          ...(blockedIds.length ? [{ id: { notIn: blockedIds } }] : []),
        ],
      },
      take: 15,
      select: { id: true, username: true, displayName: true, avatarKey: true, bio: true },
      orderBy: { username: 'asc' },
    });

    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        body: { contains: query, mode: 'insensitive' },
        ...(blockedIds.length ? { authorId: { notIn: blockedIds } } : {}),
      },
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarKey: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    return { users, posts };
  }
}
