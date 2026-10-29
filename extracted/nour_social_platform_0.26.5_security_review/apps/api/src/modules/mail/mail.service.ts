import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (process.env.NODE_ENV === 'production' && !(host && user && pass)) {
      throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS are required in production for email verification and password recovery.');
    }
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  isConfigured() {
    return Boolean(this.transporter);
  }

  async sendMail(to: string, subject: string, text: string) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'nour@localhost';
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Would send to ${to}: ${subject}`);
      return { sent: false, dev: true };
    }
    await this.transporter.sendMail({ from, to, subject, text });
    return { sent: true, dev: false };
  }
}
