import nodemailer from 'nodemailer';
import type { AppConfig } from './config.js';

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  language?: 'ru' | 'en' | 'es';
};

export type MailTransport = 'smtp' | 'unisender' | 'none';

function smtpReady(config: AppConfig) {
  return Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
}

export function resolveMailTransport(config: AppConfig): MailTransport {
  const smtp = smtpReady(config);
  const unisender = Boolean(config.UNISENDER_API_KEY);
  if (config.MAIL_TRANSPORT === 'smtp') return smtp ? 'smtp' : 'none';
  if (config.MAIL_TRANSPORT === 'unisender') return unisender ? 'unisender' : 'none';
  if (smtp) return 'smtp';
  if (unisender) return 'unisender';
  return 'none';
}

export async function sendMail(config: AppConfig, message: OutboundMail): Promise<'sent' | 'skipped'> {
  const transport = resolveMailTransport(config);
  if (transport === 'none') return 'skipped';
  if (transport === 'smtp') return sendViaSmtp(config, message);
  return sendViaUnisender(config, message);
}

async function sendViaSmtp(config: AppConfig, message: OutboundMail): Promise<'sent'> {
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === 'true',
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${config.MAIL_FROM_NAME.replaceAll('"', '')}" <${config.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`SMTP rejected the message: ${detail}`);
  } finally {
    transporter.close();
  }
  return 'sent';
}

async function sendViaUnisender(config: AppConfig, message: OutboundMail): Promise<'sent'> {
  const response = await fetch(`${config.UNISENDER_API_URL}/email/send.json`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-api-key': config.UNISENDER_API_KEY,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: message.to }],
        from_email: config.MAIL_FROM,
        from_name: config.MAIL_FROM_NAME,
        subject: message.subject,
        global_language: message.language ?? 'ru',
        body: {
          html: message.html,
          plaintext: message.text,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({})) as {
    status?: string;
    message?: string;
    code?: number;
  };
  if (!response.ok || payload.status === 'error') {
    const err = new Error(
      `Unisender rejected the message (${response.status}${payload.code ? `/${payload.code}` : ''}): ${payload.message ?? 'unknown error'}`,
    );
    (err as Error & { unisenderCode?: number }).unisenderCode = payload.code;
    throw err;
  }
  return 'sent';
}
