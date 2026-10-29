import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ReportsService } from './reports.service';
import { readSessionToken } from '../../common/session-token';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly auth: AuthService,
  ) {}

  private async userId(cookie: string | undefined, authorization?: string) {
    const current = await this.auth.current(readSessionToken(cookie, authorization));
    return current.user.id;
  }

  @Post()
  @HttpCode(201)
  async create(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { targetType?: unknown; targetId?: unknown; reason?: unknown; details?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    return this.reports.create(
      uid,
      typeof body?.targetType === 'string' ? body.targetType : '',
      typeof body?.targetId === 'string' ? body.targetId : '',
      typeof body?.reason === 'string' ? body.reason : '',
      typeof body?.details === 'string' ? body.details : undefined,
    );
  }

  @Get('mine')
  async mine(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined) {
    return this.reports.listMine(await this.userId(cookie, authorization));
  }

  @Get('admin/open')
  async adminOpen(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined) {
    return this.reports.listOpenForAdmin(await this.userId(cookie, authorization));
  }

  @Post('admin/resolve')
  @HttpCode(200)
  async adminResolve(
    @Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization: string | undefined,
    @Body() body: { reportId?: unknown; status?: unknown },
  ) {
    const uid = await this.userId(cookie, authorization);
    const reportId = typeof body?.reportId === 'string' ? body.reportId : '';
    const status = body?.status === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';
    return this.reports.resolve(uid, reportId, status);
  }
}
