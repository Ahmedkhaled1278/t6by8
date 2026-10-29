import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MessagingService } from './messaging.service';
import { readSessionToken } from '../../common/session-token';

@Controller()
export class MessagingController {
  constructor(
    private readonly messaging: MessagingService,
    private readonly auth: AuthService,
  ) {}

  private async userId(cookie: string | undefined, authorization?: string) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return current.user.id;
  }

  @Get('conversations')
  async list(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined) {
    return this.messaging.listConversations(await this.userId(cookie, authorization));
  }

  @Post('conversations/direct')
  @HttpCode(200)
  async direct(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { userId?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    if (typeof body?.userId !== 'string') throw new BadRequestException('معرّف المستخدم مطلوب');
    return this.messaging.getOrCreateDirect(uid, body.userId);
  }


  @Post('conversations/group')
  @HttpCode(201)
  async createGroup(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { title?: unknown; memberUserIds?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    const title = typeof body?.title === 'string' ? body.title : '';
    const memberUserIds = Array.isArray(body?.memberUserIds)
      ? body.memberUserIds.filter((x): x is string => typeof x === 'string')
      : [];
    return this.messaging.createGroup(uid, title, memberUserIds);
  }

  @Post('conversations/:id/members')
  @HttpCode(200)
  async addMember(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { userId?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    if (typeof body?.userId !== 'string') throw new BadRequestException('معرّف المستخدم مطلوب');
    return this.messaging.addGroupMember(uid, id, body.userId);
  }

  @Get('conversations/:id/messages')
  async messages(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.messaging.listMessages(await this.userId(cookie, authorization), id, before);
  }

  @Post('conversations/:id/messages')
  @HttpCode(201)
  async send(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { body?: unknown; clientMessageId?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    const text = typeof body?.body === 'string' ? body.body : '';
    const clientMessageId = typeof body?.clientMessageId === 'string' ? body.clientMessageId : '';
    return this.messaging.sendMessage(uid, id, text, clientMessageId);
  }
}
