import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from = process.env.MAIL_FROM ?? 'Survey App <noreply@example.com>';

  constructor() {
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    } else {
      // No SMTP configured: log links instead of sending (dev/CI), like the DeepSeek mock.
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMTP_HOST is required in production');
      }
      this.transporter = null;
    }
  }

  // NOTE: single-origin link base; add a dedicated APP_URL env if a second frontend origin appears.
  private link(path: string): string {
    const base = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
    return `${base}${path}`;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = this.link(`/verify-email?token=${token}`);
    await this.send(to, 'Confirm your email', `Confirm your email: ${url}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = this.link(`/reset-password?token=${token}`);
    await this.send(to, 'Reset your password', `Reset your password: ${url}`);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail:dev] to=${to} subject="${subject}" — ${text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
