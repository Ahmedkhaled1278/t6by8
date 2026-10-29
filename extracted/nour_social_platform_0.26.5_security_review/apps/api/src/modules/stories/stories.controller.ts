import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { StoriesService } from './stories.service';
import { readSessionToken } from '../../common/session-token';

@Controller('stories')
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly auth: AuthService,
  ) {}

  private async optionalUserId(cookie: string | undefined, authorization?: string): Promise<string | null> {
    try {
      const current = await this.auth.current(readSessionToken(cookie, authorization));
      return current.user.id;
    } catch {
      return null;
    }
  }

  private async requireUser(cookie: string | undefined, authorization?: string) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return current.user;
  }

  @Get()
  async feed(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.stories.feed(await this.optionalUserId(cookie, authorization));
  }

  @Post()
  @HttpCode(201)
  async create(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { objectKey?: unknown; mediaType?: unknown; caption?: unknown },
  ) {
    const user = await this.requireUser(cookie, authorization);
    const objectKey = typeof body?.objectKey === 'string' ? body.objectKey : '';
    const mediaType = typeof body?.mediaType === 'string' ? body.mediaType : '';
    const caption = typeof body?.caption === 'string' ? body.caption : undefined;
    return this.stories.create(user.id, objectKey, mediaType, caption);
  }

  @Post(':id/view')
  @HttpCode(200)
  async view(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const user = await this.requireUser(cookie, authorization);
    return this.stories.view(user.id, id);
  }
}
