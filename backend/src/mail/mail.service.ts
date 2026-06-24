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
      // In production this is a misconfiguration — warn loudly but DON'T crash the
      // app, otherwise the backend crash-loops and takes down already-verified users
      // too. Verification / reset emails simply won't be delivered until SMTP is set.
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'SMTP_HOST is not set in production — verification & password-reset emails will NOT be sent. Configure SMTP to enable new-user signups.',
        );
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
