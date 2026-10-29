import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MediaService } from './media.service';
import { readSessionToken } from '../../common/session-token';

@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly auth: AuthService,
  ) {}

  @Post('presign')
  @HttpCode(200)
  async presign(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { contentType?: unknown; byteSize?: unknown; folder?: unknown },
  ) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
    const byteSize = typeof body?.byteSize === 'number' ? body.byteSize : Number(body?.byteSize);
    const folderRaw = typeof body?.folder === 'string' ? body.folder : 'posts';
    const folder = folderRaw === 'stories' || folderRaw === 'avatars' ? folderRaw : 'posts';
    return this.media.createPresignedUpload(current.user.id, contentType, byteSize, folder);
  }
}
