import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private static buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly prefix: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      ip?: string;
      headers?: Record<string, string | undefined>;
      socket?: { remoteAddress?: string };
    }>();
    const ip =
      req.ip ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const key = `${this.prefix}:${ip}`;
    const now = Date.now();
    const bucket = RateLimitGuard.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      RateLimitGuard.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.limit) {
      throw new HttpException('محاولات كثيرة. حاول لاحقًا.', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.count += 1;
    return true;
  }
}
