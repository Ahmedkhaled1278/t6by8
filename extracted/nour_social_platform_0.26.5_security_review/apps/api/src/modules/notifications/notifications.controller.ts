import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';
import { readSessionToken } from '../../common/session-token';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly auth: AuthService,
  ) {}

  private async userId(cookie: string | undefined, authorization?: string) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return current.user.id;
  }

  @Get()
  async list(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined) {
    return this.notifications.list(await this.userId(cookie, authorization));
  }

  @Post('read')
  @HttpCode(200)
  async read(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { ids?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((x): x is string => typeof x === 'string')
      : undefined;
    return this.notifications.markRead(uid, ids);
  }
}
