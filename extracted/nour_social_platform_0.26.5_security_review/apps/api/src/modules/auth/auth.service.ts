import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  private normalizeEmail(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('البريد الإلكتروني مطلوب');
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('البريد الإلكتروني غير صالح');
    return email;
  }

  private normalizeUsername(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('اسم المستخدم مطلوب');
    const username = value.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new BadRequestException('اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو _');
    return username;
  }

  private async hashPassword(password: unknown): Promise<string> {
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
      throw new BadRequestException('كلمة المرور يجب أن تكون من 10 إلى 128 حرفًا');
    }
    const salt = randomBytes(16).toString('hex');
    const derived = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  private async verifyPassword(password: unknown, encoded: string): Promise<boolean> {
    if (typeof password !== 'string' || password.length > 128) return false;
    const [algorithm, salt, expectedHex] = encoded.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
    const actual = await scrypt(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }

  async register(input: Record<string, unknown>, metadata: { userAgent?: string; ipAddress?: string }) {
    const email = this.normalizeEmail(input.email);
    const username = this.normalizeUsername(input.username);
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
    if (!displayName || displayName.length > 80) throw new BadRequestException('الاسم الظاهر مطلوب وبحد أقصى 80 حرفًا');
    const passwordHash = await this.hashPassword(input.password);
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { id: true } });
    if (existing) throw new ConflictException('البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل');
    const user = await this.prisma.user.create({ data: { email, username, displayName, passwordHash }, select: { id: true, email: true, username: true, displayName: true, createdAt: true } });
    const verify = await this.issueToken(user.id, 'email_verify', 48 * 60 * 60 * 1000);
    await this.mail.sendMail(email, 'تأكيد بريدك في نُور', `رمز التأكيد: ${verify.token}\nأو استخدمه عبر /api/auth/email/verify`);
    const session = await this.createSession(user.id, metadata);
    return { user, ...session, devEmailVerifyToken: process.env.NODE_ENV === 'production' ? undefined : verify.token };
  }

  async login(input: Record<string, unknown>, metadata: { userAgent?: string; ipAddress?: string }) {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Keep the outward error identical for unknown email and wrong password.
    if (!user || !user.passwordHash || !(await this.verifyPassword(input.password, user.passwordHash))) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    const session = await this.createSession(user.id, metadata);
    return { user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName }, ...session };
  }

  private async createSession(userId: string, metadata: { userAgent?: string; ipAddress?: string }) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.authSession.create({ data: { userId, tokenHash: this.tokenHash(token), expiresAt, userAgent: metadata.userAgent?.slice(0, 500), ipAddress: metadata.ipAddress?.slice(0, 64) } });
    return { token, expiresAt };
  }

  async current(token: string | undefined) {
    if (!token || token.length > 300) throw new UnauthorizedException('يلزم تسجيل الدخول');
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash: this.tokenHash(token) }, include: { user: { select: { id: true, email: true, username: true, displayName: true, bio: true, avatarKey: true, emailVerifiedAt: true } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('الجلسة غير صالحة أو انتهت');
    return { user: session.user, session: { id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt } };
  }

  async listSessions(token: string | undefined) {
    const current = await this.getActiveSession(token);
    const sessions = await this.prisma.authSession.findMany({ where: { userId: current.userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' } });
    return { sessions, currentSessionId: current.id };
  }

  async revokeSession(token: string | undefined, sessionId: string) {
    const current = await this.getActiveSession(token);
    const target = await this.prisma.authSession.findFirst({ where: { id: sessionId, userId: current.userId, revokedAt: null } });
    if (!target) throw new BadRequestException('الجلسة غير موجودة أو تم إنهاؤها');
    await this.prisma.authSession.update({ where: { id: target.id }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async logout(token: string | undefined, all = false) {
    const current = await this.getActiveSession(token);
    await this.prisma.authSession.updateMany({ where: all ? { userId: current.userId, revokedAt: null } : { id: current.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true, allSessionsRevoked: all };
  }

  private async getActiveSession(token: string | undefined) {
    if (!token || token.length > 300) throw new UnauthorizedException('يلزم تسجيل الدخول');
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash: this.tokenHash(token) } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) throw new UnauthorizedException('الجلسة غير صالحة أو انتهت');
    return session;
  }


  private async issueToken(userId: string, type: string, ttlMs: number) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.authToken.create({
      data: { userId, type, tokenHash: this.tokenHash(token), expiresAt },
    });
    return { token, expiresAt };
  }

  async requestPasswordReset(input: Record<string, unknown>) {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    // Always same response to avoid account enumeration
    const response: { success: true; devResetToken?: string } = { success: true };
    if (user) {
      const issued = await this.issueToken(user.id, 'password_reset', 60 * 60 * 1000);
      const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
      if (u?.email) {
        await this.mail.sendMail(u.email, 'استعادة كلمة المرور — نُور', `رمز الاستعادة: ${issued.token}\nصالح لمدة ساعة.`);
      }
      if (process.env.NODE_ENV !== 'production') response.devResetToken = issued.token;
    }
    return response;
  }

  async resetPassword(input: Record<string, unknown>) {
    const token = typeof input.token === 'string' ? input.token : '';
    if (!token || token.length > 200) throw new BadRequestException('رمز الاستعادة غير صالح');
    const passwordHash = await this.hashPassword(input.password);
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash: this.tokenHash(token) } });
    if (!row || row.type !== 'password_reset' || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException('رمز الاستعادة غير صالح أو منتهي');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.authSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { success: true };
  }

  async requestEmailVerification(sessionToken: string | undefined) {
    const current = await this.getActiveSession(sessionToken);
    const user = await this.prisma.user.findUnique({ where: { id: current.userId }, select: { id: true, emailVerifiedAt: true } });
    if (!user) throw new UnauthorizedException('يلزم تسجيل الدخول');
    if (user.emailVerifiedAt) return { success: true, alreadyVerified: true };
    const issued = await this.issueToken(user.id, 'email_verify', 48 * 60 * 60 * 1000);
    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (fullUser?.email) {
      await this.mail.sendMail(fullUser.email, 'تأكيد بريدك في نُور', `رمز التأكيد: ${issued.token}\nصالح لمدة 48 ساعة.`);
    }
    return {
      success: true,
      alreadyVerified: false,
      devEmailVerifyToken: process.env.NODE_ENV === 'production' ? undefined : issued.token,
    };
  }

  async verifyEmail(input: Record<string, unknown>) {
    const token = typeof input.token === 'string' ? input.token : '';
    if (!token || token.length > 200) throw new BadRequestException('رمز التأكيد غير صالح');
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash: this.tokenHash(token) } });
    if (!row || row.type !== 'email_verify' || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException('رمز التأكيد غير صالح أو منتهي');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } }),
      this.prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    ]);
    return { success: true };
  }

  async updateProfile(sessionToken: string | undefined, input: Record<string, unknown>) {
    const session = await this.getActiveSession(sessionToken);
    const data: { displayName?: string; bio?: string | null; avatarKey?: string | null } = {};
    if (typeof input.displayName === 'string') {
      const name = input.displayName.trim();
      if (!name || name.length > 80) throw new BadRequestException('الاسم الظاهر مطلوب وبحد أقصى 80 حرفًا');
      data.displayName = name;
    }
    if (input.bio !== undefined) {
      if (input.bio === null || input.bio === '') data.bio = null;
      else if (typeof input.bio === 'string') {
        const bio = input.bio.trim();
        if (bio.length > 500) throw new BadRequestException('النبذة يجب ألا تتجاوز 500 حرف');
        data.bio = bio;
      } else throw new BadRequestException('نبذة غير صالحة');
    }
    if (input.avatarKey !== undefined) {
      if (input.avatarKey === null || input.avatarKey === '') data.avatarKey = null;
      else if (typeof input.avatarKey === 'string') {
        const key = input.avatarKey;
        if (!key.startsWith(`avatars/${session.userId}/`) || key.includes('..')) {
          throw new BadRequestException('مفتاح الصورة الشخصية غير صالح');
        }
        data.avatarKey = key;
      } else throw new BadRequestException('صورة غير صالحة');
    }
    if (!Object.keys(data).length) throw new BadRequestException('لا توجد حقول للتحديث');
    const user = await this.prisma.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, email: true, username: true, displayName: true, bio: true, avatarKey: true, emailVerifiedAt: true },
    });
    return { user };
  }

  async exportAccount(sessionToken: string | undefined) {
    const session = await this.getActiveSession(sessionToken);
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true, email: true, username: true, displayName: true, bio: true, avatarKey: true, createdAt: true, emailVerifiedAt: true,
        posts: { where: { deletedAt: null }, select: { id: true, body: true, visibility: true, createdAt: true }, take: 500 },
        comments: { where: { deletedAt: null }, select: { id: true, postId: true, body: true, createdAt: true }, take: 500 },
        followsOut: { select: { followedId: true, createdAt: true }, take: 500 },
        followsIn: { select: { followerId: true, createdAt: true }, take: 500 },
      },
    });
    if (!user) throw new UnauthorizedException('يلزم تسجيل الدخول');
    return { exportedAt: new Date().toISOString(), account: user };
  }

  async deleteAccount(sessionToken: string | undefined, input: Record<string, unknown>) {
    const session = await this.getActiveSession(sessionToken);
    const password = input.password;
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.passwordHash) throw new BadRequestException('لا يمكن حذف الحساب');
    if (!(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('كلمة المرور غير صحيحة');
    }
    const stamp = Date.now().toString(36);
    const anonUser = `deleted_${stamp}`.slice(0, 30);
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.authToken.deleteMany({ where: { userId: user.id } });
      await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
      await tx.follow.deleteMany({ where: { OR: [{ followerId: user.id }, { followedId: user.id }] } });
      await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } });
      await tx.post.updateMany({ where: { authorId: user.id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.comment.updateMany({ where: { authorId: user.id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          username: anonUser,
          email: null,
          passwordHash: null,
          displayName: 'حساب محذوف',
          bio: null,
          avatarKey: null,
          emailVerifiedAt: null,
        },
      });
    });
    return { success: true, deleted: true };
  }
}
