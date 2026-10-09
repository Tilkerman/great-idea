import type { AppConfig } from './config.js';

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
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
        skip_unsubscribe: 1,
        global_language: 'ru',
        body: {
          html: message.html,
          plaintext: message.text,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Unisender rejected the message with status ${response.status}`);
  }
  return 'sent';
}
