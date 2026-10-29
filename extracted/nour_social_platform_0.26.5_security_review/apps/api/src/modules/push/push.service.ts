import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@nour.local';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    }
  }

  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || null, enabled: this.enabled };
  }

  async subscribe(
    userId: string,
    body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; userAgent?: unknown },
  ) {
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : '';
    const auth = typeof body.keys?.auth === 'string' ? body.keys.auth : '';
    if (!endpoint || !p256dh || !auth) throw new BadRequestException('بيانات الاشتراك غير مكتملة');
    const userAgent = typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : undefined;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent },
      update: { userId, p256dh, auth, userAgent },
    });
    return { success: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { success: true };
  }

  async notifyUser(userId: string, title: string, body: string, url?: string) {
    if (!this.enabled) return { sent: 0 };
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: url || '/' }),
        );
        sent += 1;
      } catch (err) {
        this.logger.warn(`Push failed for ${sub.endpoint}: ${String(err)}`);
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    }
    return { sent };
  }
}
