import { Body, Controller, Delete, Get, Headers, HttpCode, Ip, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { SESSION_COOKIE_NAME, cookieOptions, readSessionToken } from '../../common/session-token';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private metadata(req: Request, ip: string) {
    return { userAgent: req.headers['user-agent'], ipAddress: ip };
  }

  private setCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
  }

  private clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
  }

  private tokenFrom(cookie?: string, authorization?: string) {
    return readSessionToken(cookie, authorization);
  }

  @Post('register')
  @HttpCode(201)
  @UseGuards(new RateLimitGuard(8, 15 * 60 * 1000, 'auth-register'))
  async register(@Body() body: Record<string, unknown>, @Req() req: Request, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    const result = await this.auth.register(body, this.metadata(req, ip));
    this.setCookie(res, result.token, result.expiresAt);
    // token returned for Capacitor / native clients (web still uses HttpOnly cookie)
    return { user: result.user, expiresAt: result.expiresAt, token: result.token };
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(20, 15 * 60 * 1000, 'auth-login'))
  async login(@Body() body: Record<string, unknown>, @Req() req: Request, @Res({ passthrough: true }) res: Response, @Ip() ip: string) {
    const result = await this.auth.login(body, this.metadata(req, ip));
    this.setCookie(res, result.token, result.expiresAt);
    return { user: result.user, expiresAt: result.expiresAt, token: result.token };
  }

  @Get('me')
  async me(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization?: string) {
    return this.auth.current(this.tokenFrom(cookie, authorization));
  }

  @Get('sessions')
  async sessions(@Headers('cookie') cookie: string | undefined, @Headers('authorization') authorization?: string) {
    return this.auth.listSessions(this.tokenFrom(cookie, authorization));
  }

  @Post('sessions/revoke')
  @HttpCode(200)
  async revoke(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { sessionId?: string },
  ) {
    if (!body?.sessionId || typeof body.sessionId !== 'string') throw new UnauthorizedException('معرّف الجلسة مطلوب');
    return this.auth.revokeSession(this.tokenFrom(cookie, authorization), body.sessionId);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { allSessions?: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.logout(this.tokenFrom(cookie, authorization), body?.allSessions === true);
    this.clearCookie(res);
    return result;
  }

  @Post('password/forgot')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(5, 15 * 60 * 1000, 'auth-forgot'))
  async forgotPassword(@Body() body: Record<string, unknown>) {
    return this.auth.requestPasswordReset(body);
  }

  @Post('password/reset')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(8, 15 * 60 * 1000, 'auth-reset'))
  async resetPassword(@Body() body: Record<string, unknown>) {
    return this.auth.resetPassword(body);
  }

  @Post('email/request-verification')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(3, 15 * 60 * 1000, 'email-request-verification'))
  async requestEmailVerification(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization?: string,
  ) {
    return this.auth.requestEmailVerification(this.tokenFrom(cookie, authorization));
  }

  @Post('email/verify')
  @HttpCode(200)
  @UseGuards(new RateLimitGuard(10, 15 * 60 * 1000, 'email-verify'))
  async verifyEmail(@Body() body: Record<string, unknown>) {
    return this.auth.verifyEmail(body);
  }

  @Patch('me')
  @HttpCode(200)
  async updateMe(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.auth.updateProfile(this.tokenFrom(cookie, authorization), body);
  }

  @Get('export')
  async export(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization?: string,
  ) {
    return this.auth.exportAccount(this.tokenFrom(cookie, authorization));
  }

  @Post('delete')
  @HttpCode(200)
  async deleteAccount(
    @Headers('cookie') cookie: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.deleteAccount(this.tokenFrom(cookie, authorization), body);
    this.clearCookie(res);
    return result;
  }
}
