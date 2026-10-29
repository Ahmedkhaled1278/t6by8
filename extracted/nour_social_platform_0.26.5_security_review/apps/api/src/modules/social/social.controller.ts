import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { PostVisibility } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../database/prisma.service';
import { MediaService } from '../media/media.service';
import { NotificationsService } from '../notifications/notifications.service';
import { readSessionToken } from '../../common/session-token';

type Viewer = { id: string; username: string; displayName: string };

@Controller()
export class SocialController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async signedIn(cookie: string | undefined, authorization?: string): Promise<Viewer> {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return current.user;
  }

  private async optionalViewer(cookie: string | undefined, authorization?: string): Promise<Viewer | null> {
    try {
      return await this.signedIn(cookie, authorization);
    } catch {
      return null;
    }
  }

  private async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const row = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { blockerId: true },
    });
    return Boolean(row);
  }

  private async canViewPost(viewerId: string | null, authorId: string, visibility: PostVisibility): Promise<boolean> {
    if (visibility === 'PUBLIC') return true;
    if (!viewerId) return false;
    if (viewerId === authorId) return true;
    if (visibility === 'PRIVATE') return false;
    if (visibility === 'FOLLOWERS') {
      const follow = await this.prisma.follow.findUnique({
        where: { followerId_followedId: { followerId: viewerId, followedId: authorId } },
        select: { followerId: true },
      });
      return Boolean(follow);
    }
    return false;
  }

  private postInclude() {
    return {
      author: { select: { id: true, username: true, displayName: true, avatarKey: true } },
      _count: { select: { comments: true, reactions: true } },
      media: { select: { id: true, objectKey: true, mediaType: true, byteSize: true } },
      comments: {
        where: { deletedAt: null },
        take: 3,
        orderBy: { createdAt: 'desc' as const },
        include: { author: { select: { id: true, username: true, displayName: true } } },
      },
    };
  }

  private async withMediaUrls(post: {
    media?: { id: string; objectKey: string; mediaType: string; byteSize: number | bigint }[];
    [key: string]: unknown;
  }) {
    if (!post.media?.length) return post;
    const media = await Promise.all(
      post.media.map(async (m) => ({
        id: m.id,
        objectKey: m.objectKey,
        mediaType: m.mediaType,
        byteSize: typeof m.byteSize === 'bigint' ? Number(m.byteSize) : m.byteSize,
        url: await this.media.getReadUrl(m.objectKey),
      })),
    );
    return { ...post, media };
  }

  @Get('posts')
  async listPosts(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Query('scope') scope?: string,
    @Query('before') before?: string,
  ) {
    const viewer = await this.optionalViewer(cookie, authorization);

    const blockedIds = new Set<string>();
    let followingIds: string[] | null = null;
    if (viewer) {
      const blocks = await this.prisma.userBlock.findMany({
        where: {
          OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }],
        },
        select: { blockerId: true, blockedId: true },
      });
      for (const b of blocks) {
        blockedIds.add(b.blockerId === viewer.id ? b.blockedId : b.blockerId);
      }
      if (scope === 'following') {
        const follows = await this.prisma.follow.findMany({
          where: { followerId: viewer.id },
          select: { followedId: true },
          take: 2000,
        });
        followingIds = follows.map((f) => f.followedId);
        followingIds.push(viewer.id); // own posts in following feed
      }
    }

    const authorFilter = followingIds
      ? { authorId: { in: followingIds.filter((id) => !blockedIds.has(id)) } }
      : blockedIds.size > 0
        ? { authorId: { notIn: [...blockedIds] } }
        : {};

    let beforeFilter: { createdAt?: { lt: Date }; id?: { lt: string } } | Record<string, never> = {};
    if (before && typeof before === 'string') {
      const cursorPost = await this.prisma.post.findUnique({ where: { id: before }, select: { id: true, createdAt: true } });
      if (cursorPost) {
        beforeFilter = {
          OR: [
            { createdAt: { lt: cursorPost.createdAt } },
            { createdAt: cursorPost.createdAt, id: { lt: cursorPost.id } },
          ],
        } as never;
      }
    }

    const candidates = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        ...authorFilter,
        ...beforeFilter,
      },
      take: 80,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(),
    });

    const visible = [];
    let lastScannedId: string | null = null;
    let scannedCount = 0;
    for (const post of candidates) {
      lastScannedId = post.id;
      scannedCount += 1;
      if (await this.canViewPost(viewer?.id ?? null, post.authorId, post.visibility)) {
        visible.push(post);
        if (visible.length >= 30) break;
      }
    }
    const withUrls = await Promise.all(visible.map(p => this.withMediaUrls(p)));
    // Advance from the last scanned candidate, including hidden posts, so pages don't repeat
    // or get stuck when a page contains only private/follower-only content.
    const hasMoreCandidates = scannedCount < candidates.length || candidates.length === 80;
    const nextCursor = hasMoreCandidates ? lastScannedId : null;
    return { posts: withUrls, nextCursor };
  }

  @Post('posts')
  @HttpCode(201)
  async createPost(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { body?: unknown; visibility?: unknown; media?: unknown },
  ) {
    const user = await this.signedIn(cookie, authorization);
    if (typeof body?.body !== 'string' || !body.body.trim() || body.body.trim().length > 5000) {
      throw new BadRequestException('المنشور مطلوب ويجب ألا يتجاوز 5000 حرف');
    }
    const allowedVisibilities = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'];
    if (body.visibility !== undefined && !allowedVisibilities.includes(String(body.visibility))) {
      throw new BadRequestException('مستوى الخصوصية غير صالح');
    }
    const visibility = body.visibility === 'FOLLOWERS' || body.visibility === 'PRIVATE' ? body.visibility : 'PUBLIC';

    const mediaItems: { objectKey: string; mediaType: string; byteSize: number }[] = [];
    if (Array.isArray(body.media)) {
      for (const item of body.media.slice(0, 4)) {
        if (!item || typeof item !== 'object') continue;
        const objectKey = typeof (item as any).objectKey === 'string' ? (item as any).objectKey : '';
        const mediaType = typeof (item as any).mediaType === 'string' ? (item as any).mediaType : '';
        const byteSize = Number((item as any).byteSize);
        if (!objectKey || !this.media.isAllowedKeyForUser(objectKey, user.id)) {
          throw new BadRequestException('مفتاح الوسائط غير صالح');
        }
        const okType = mediaType.startsWith('image/') || mediaType === 'video/mp4' || mediaType === 'video/webm';
        if (!okType) {
          throw new BadRequestException('نوع الوسائط غير مدعوم');
        }
        const maxB = mediaType.startsWith('video/') ? 40 * 1024 * 1024 : 8 * 1024 * 1024;
        if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > maxB) {
          throw new BadRequestException('حجم الوسائط غير صالح');
        }
        mediaItems.push({ objectKey, mediaType, byteSize });
      }
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: user.id,
        body: body.body.trim(),
        visibility: visibility as PostVisibility,
        media: mediaItems.length
          ? {
              create: mediaItems.map(m => ({
                objectKey: m.objectKey,
                mediaType: m.mediaType,
                byteSize: BigInt(m.byteSize),
              })),
            }
          : undefined,
      },
      include: this.postInclude(),
    });
    return { post: await this.withMediaUrls(post) };
  }

  @Post('posts/:postId/comments')
  @HttpCode(201)
  async createComment(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Param('postId') postId: string,
    @Body() body: { body?: unknown },
  ) {
    const user = await this.signedIn(cookie, authorization);
    if (typeof body?.body !== 'string' || !body.body.trim() || body.body.trim().length > 3000) {
      throw new BadRequestException('التعليق مطلوب ويجب ألا يتجاوز 3000 حرف');
    }
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true, visibility: true },
    });
    if (!post) throw new BadRequestException('المنشور غير موجود أو غير متاح');
    if (await this.isBlockedEitherWay(user.id, post.authorId)) {
      throw new BadRequestException('المنشور غير موجود أو غير متاح');
    }
    if (!(await this.canViewPost(user.id, post.authorId, post.visibility))) {
      throw new BadRequestException('المنشور غير موجود أو غير متاح');
    }
    const comment = await this.prisma.comment.create({
      data: { postId, authorId: user.id, body: body.body.trim() },
      include: { author: { select: { id: true, username: true, displayName: true } } },
    });
    const postAuthor = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (postAuthor) {
      await this.notifications.create({
        userId: postAuthor.authorId,
        type: 'comment',
        title: 'تعليق جديد',
        body: `${user.displayName} علّق على منشورك`,
        actorId: user.id,
        targetType: 'post',
        targetId: postId,
      });
    }
    return { comment };
  }

  @Post('posts/:postId/reactions')
  @HttpCode(200)
  async toggleReaction(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('postId') postId: string) {
    const user = await this.signedIn(cookie, authorization);
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true, visibility: true },
    });
    if (!post) throw new BadRequestException('المنشور غير موجود أو غير متاح');
    if (await this.isBlockedEitherWay(user.id, post.authorId)) {
      throw new BadRequestException('المنشور غير موجود أو غير متاح');
    }
    if (!(await this.canViewPost(user.id, post.authorId, post.visibility))) {
      throw new BadRequestException('المنشور غير موجود أو غير متاح');
    }
    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });
    if (existing) {
      await this.prisma.postReaction.delete({ where: { postId_userId: { postId, userId: user.id } } });
      return { reacted: false };
    }
    await this.prisma.postReaction.create({ data: { postId, userId: user.id, kind: 'like' } });
    const likedPost = await this.prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (likedPost) {
      await this.notifications.create({
        userId: likedPost.authorId,
        type: 'reaction',
        title: 'إعجاب جديد',
        body: `${user.displayName} أعجب بمنشورك`,
        actorId: user.id,
        targetType: 'post',
        targetId: postId,
      });
    }
    return { reacted: true };
  }

  @Get('users/:username')
  async getProfile(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('username') username: string) {
    if (!username || username.length > 30) throw new BadRequestException('اسم المستخدم غير صالح');
    const profile = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarKey: true,
        createdAt: true,
        _count: {
          select: {
            posts: { where: { deletedAt: null, visibility: 'PUBLIC' } },
            followsIn: true,
            followsOut: true,
          },
        },
      },
    });
    if (!profile) throw new BadRequestException('المستخدم غير موجود');

    let isFollowing = false;
    let isBlocked = false;
    let isSelf = false;
    const viewer = await this.optionalViewer(cookie, authorization);
    if (viewer) {
      isSelf = viewer.id === profile.id;
      if (!isSelf) {
        if (await this.isBlockedEitherWay(viewer.id, profile.id)) {
          throw new BadRequestException('المستخدم غير موجود');
        }
        const [follow, block] = await Promise.all([
          this.prisma.follow.findUnique({
            where: { followerId_followedId: { followerId: viewer.id, followedId: profile.id } },
          }),
          this.prisma.userBlock.findUnique({
            where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: profile.id } },
          }),
        ]);
        isFollowing = Boolean(follow);
        isBlocked = Boolean(block);
      }
    }

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarKey: profile.avatarKey,
        createdAt: profile.createdAt,
        postsCount: profile._count.posts,
        followersCount: profile._count.followsIn,
        followingCount: profile._count.followsOut,
        isFollowing,
        isBlocked,
        isSelf,
      },
    };
  }

  @Get('users/:username/posts')
  async listUserPosts(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('username') username: string) {
    if (!username || username.length > 30) throw new BadRequestException('اسم المستخدم غير صالح');
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) throw new BadRequestException('المستخدم غير موجود');

    const viewer = await this.optionalViewer(cookie, authorization);
    if (viewer && (await this.isBlockedEitherWay(viewer.id, user.id))) {
      throw new BadRequestException('المستخدم غير موجود');
    }

    const candidates = await this.prisma.post.findMany({
      where: { authorId: user.id, deletedAt: null },
      take: 60,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: this.postInclude(),
    });

    const visible = [];
    for (const post of candidates) {
      if (await this.canViewPost(viewer?.id ?? null, post.authorId, post.visibility)) {
        visible.push(post);
        if (visible.length >= 30) break;
      }
    }
    const withUrls = await Promise.all(visible.map(p => this.withMediaUrls(p)));
    return { posts: withUrls };
  }



  @Patch('posts/:postId')
  @HttpCode(200)
  async editPost(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param('postId') postId: string,
    @Body() body: { body?: unknown; visibility?: unknown },
  ) {
    const user = await this.signedIn(cookie, authorization);
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new BadRequestException('المنشور غير موجود');
    if (post.authorId !== user.id) throw new BadRequestException('غير مسموح بتعديل هذا المنشور');
    if (typeof body?.body !== 'string' || !body.body.trim() || body.body.trim().length > 5000) {
      throw new BadRequestException('نص المنشور مطلوب وبحد أقصى 5000 حرف');
    }
    const visibility =
      body.visibility === 'FOLLOWERS' || body.visibility === 'PRIVATE' || body.visibility === 'PUBLIC'
        ? body.visibility
        : post.visibility;
    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { body: body.body.trim(), visibility: visibility as PostVisibility },
      include: this.postInclude(),
    });
    return { post: await this.withMediaUrls(updated) };
  }

  @Delete('posts/:postId')
  @HttpCode(200)
  async deletePost(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param('postId') postId: string,
  ) {
    const user = await this.signedIn(cookie, authorization);
    const post = await this.prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, authorId: true } });
    if (!post) throw new BadRequestException('المنشور غير موجود');
    if (post.authorId !== user.id) throw new BadRequestException('غير مسموح بحذف هذا المنشور');
    await this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    return { success: true, deleted: true };
  }

  @Post('users/:userId/follow')
  @HttpCode(200)
  async toggleFollow(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('userId') userId: string) {
    const viewer = await this.signedIn(cookie, authorization);
    if (viewer.id === userId) throw new BadRequestException('لا يمكن متابعة نفسك');

    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new BadRequestException('المستخدم غير موجود');
    if (await this.isBlockedEitherWay(viewer.id, userId)) {
      throw new BadRequestException('لا يمكن متابعة هذا المستخدم');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: viewer.id, followedId: userId } },
    });
    if (existing) {
      await this.prisma.follow.delete({
        where: { followerId_followedId: { followerId: viewer.id, followedId: userId } },
      });
      return { following: false };
    }
    await this.prisma.follow.create({
      data: { followerId: viewer.id, followedId: userId },
    });
    await this.notifications.create({
      userId,
      type: 'follow',
      title: 'متابعة جديدة',
      body: `${viewer.displayName} بدأ متابعتك`,
      actorId: viewer.id,
      targetType: 'user',
      targetId: viewer.id,
    });
    return { following: true };
  }

  @Post('users/:userId/block')
  @HttpCode(200)
  async toggleBlock(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Param('userId') userId: string) {
    const viewer = await this.signedIn(cookie, authorization);
    if (viewer.id === userId) throw new BadRequestException('لا يمكن حظر نفسك');

    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new BadRequestException('المستخدم غير موجود');

    const existing = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: userId } },
    });

    if (existing) {
      await this.prisma.userBlock.delete({
        where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: userId } },
      });
      return { blocked: false };
    }

    // Create block and remove any existing follow in either direction
    await this.prisma.$transaction([
      this.prisma.userBlock.create({
        data: { blockerId: viewer.id, blockedId: userId },
      }),
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: viewer.id, followedId: userId },
            { followerId: userId, followedId: viewer.id },
          ],
        },
      }),
    ]);
    return { blocked: true };
  }
}
