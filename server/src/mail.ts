import type { AppConfig } from './config.js';

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  language?: 'ru' | 'en' | 'es';
};

export async function sendMail(config: AppConfig, message: OutboundMail): Promise<'sent' | 'skipped'> {
  if (!config.UNISENDER_API_KEY) return 'skipped';

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
    throw new Error(
      `Unisender rejected the message (${response.status}${payload.code ? `/${payload.code}` : ''}): ${payload.message ?? 'unknown error'}`,
    );
  }
  return 'sent';
}
