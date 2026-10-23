import type { Locale } from '../types';
import { acceptLanguageForLocale, parseAppLocale, runtimeLocale } from './appLocale';

const DEFAULT_FEEDBACK_API = 'https://api.tili.su';

function feedbackApiBase() {
  return (
    import.meta.env.VITE_FEEDBACK_API_URL
    || import.meta.env.VITE_ACCOUNT_API_URL
    || DEFAULT_FEEDBACK_API
  ).trim().replace(/\/$/, '');
}

export async function sendFeedback(input: {
  message: string;
  contact?: string;
  locale: Locale;
}) {
  const locale = parseAppLocale(input.locale) ?? runtimeLocale();
  const response = await fetch(`${feedbackApiBase()}/v1/feedback`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'accept-language': acceptLanguageForLocale(locale),
    },
    body: JSON.stringify({
      message: input.message,
      contact: input.contact || undefined,
      locale,
      website: '',
    }),
  });

  if (response.ok) return;
  if (response.status === 429) throw new Error('too_many_requests');
  throw new Error('send_failed');
}
