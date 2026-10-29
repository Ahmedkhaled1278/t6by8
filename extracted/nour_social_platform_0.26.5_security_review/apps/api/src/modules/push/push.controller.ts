import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PushService } from './push.service';
import { readSessionToken } from '../../common/session-token';

@Controller('push')
export class PushController {
  constructor(
    private readonly push: PushService,
    private readonly auth: AuthService,
  ) {}

  @Get('vapid-public-key')
  vapid() {
    return this.push.getPublicKey();
  }

  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body: Record<string, unknown>) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return this.push.subscribe(current.user.id, body as any);
  }

  @Post('unsubscribe')
  @HttpCode(200)
  async unsubscribe(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined, @Body() body: { endpoint?: string }) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return this.push.unsubscribe(current.user.id, typeof body?.endpoint === 'string' ? body.endpoint : '');
  }
}
