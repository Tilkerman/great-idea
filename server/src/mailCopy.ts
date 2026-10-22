export type MailLocale = 'ru' | 'en' | 'es';

const LOCALES: MailLocale[] = ['ru', 'en', 'es'];

export function parseMailLocale(value: unknown): MailLocale {
  const raw = String(value ?? '').trim().toLowerCase().slice(0, 2);
  return LOCALES.includes(raw as MailLocale) ? (raw as MailLocale) : 'ru';
}

export function localeFromAcceptLanguage(header?: string): MailLocale {
  if (!header) return 'ru';
  const tags = header.split(',').map((part) => part.split(';')[0].trim().toLowerCase().slice(0, 2));
  for (const tag of tags) {
    if (LOCALES.includes(tag as MailLocale)) return tag as MailLocale;
  }
  return 'ru';
}

type Copy = {
  goApp: string;
  resetSubject: string;
  resetTitle: string;
  resetText: string;
  resetButton: string;
  resetFootnote: string;
  resetPageLead: string;
  passwordLabel: string;
  savePassword: string;
  passwordSaved: string;
  passwordSavedBody: string;
  passwordNotSaved: string;
  passwordTooShort: string;
  badLink: string;
  badLinkReset: string;
  badLinkUsed: string;
  verifySubject: string;
  verifyTitle: string;
  verifyText: (name: string) => string;
  verifyButton: string;
  verifyFootnote: string;
  verifyOk: string;
  verifyOkBody: string;
};

const copy: Record<MailLocale, Copy> = {
  ru: {
    goApp: 'Перейти в TiLi',
    resetSubject: 'Новый пароль TiLi',
    resetTitle: 'Новый пароль',
    resetText: 'Нажмите кнопку, чтобы задать новый пароль в TiLi.',
    resetButton: 'Задать новый пароль',
    resetFootnote: 'Ссылка действует 1 час. Если вы не запрашивали смену пароля, просто проигнорируйте письмо.',
    resetPageLead: 'Придумайте пароль — минимум 10 символов.',
    passwordLabel: 'Пароль',
    savePassword: 'Сохранить пароль',
    passwordSaved: 'Пароль сохранён',
    passwordSavedBody: 'Новый пароль действует. На других устройствах нужно войти заново.',
    passwordNotSaved: 'Пароль не сохранён',
    passwordTooShort: 'Пароль должен быть не короче 10 символов.',
    badLink: 'Ссылка не подошла',
    badLinkReset: 'Запросите новое письмо для смены пароля.',
    badLinkUsed: 'Ссылка устарела или уже использована. Запросите новое письмо в TiLi.',
    verifySubject: 'Подтвердите почту в TiLi',
    verifyTitle: 'Подтвердите почту',
    verifyText: (name) => `Здравствуйте, ${name}. Нажмите кнопку, чтобы подтвердить адрес в TiLi.`,
    verifyButton: 'Подтвердить почту',
    verifyFootnote: 'Ссылка действует 24 часа. Если вы не создавали аккаунт TiLi, просто проигнорируйте письмо.',
    verifyOk: 'Почта подтверждена',
    verifyOkBody: 'Адрес сохранён. Можно войти в TiLi.',
  },
  en: {
    goApp: 'Open TiLi',
    resetSubject: 'New TiLi password',
    resetTitle: 'New password',
    resetText: 'Tap the button to set a new password in TiLi.',
    resetButton: 'Set a new password',
    resetFootnote: 'This link works for 1 hour. If you did not ask to change the password, ignore this email.',
    resetPageLead: 'Choose a password — at least 10 characters.',
    passwordLabel: 'Password',
    savePassword: 'Save password',
    passwordSaved: 'Password saved',
    passwordSavedBody: 'The new password is active. Sign in again on other devices.',
    passwordNotSaved: 'Password not saved',
    passwordTooShort: 'The password must be at least 10 characters.',
    badLink: 'This link did not work',
    badLinkReset: 'Request a new email to change the password.',
    badLinkUsed: 'This link has expired or was already used. Request a new email in TiLi.',
    verifySubject: 'Confirm your email in TiLi',
    verifyTitle: 'Confirm your email',
    verifyText: (name) => `Hello, ${name}. Tap the button to confirm your address in TiLi.`,
    verifyButton: 'Confirm email',
    verifyFootnote: 'This link works for 24 hours. If you did not create a TiLi account, ignore this email.',
    verifyOk: 'Email confirmed',
    verifyOkBody: 'The address is saved. You can sign in to TiLi.',
  },
  es: {
    goApp: 'Ir a TiLi',
    resetSubject: 'Nueva contraseña de TiLi',
    resetTitle: 'Nueva contraseña',
    resetText: 'Pulsa el botón para poner una nueva contraseña en TiLi.',
    resetButton: 'Poner nueva contraseña',
    resetFootnote: 'El enlace vale 1 hora. Si no pediste cambiar la contraseña, ignora este correo.',
    resetPageLead: 'Elige una contraseña — mínimo 10 caracteres.',
    passwordLabel: 'Contraseña',
    savePassword: 'Guardar contraseña',
    passwordSaved: 'Contraseña guardada',
    passwordSavedBody: 'La nueva contraseña ya vale. En otros dispositivos entra otra vez.',
    passwordNotSaved: 'No se guardó la contraseña',
    passwordTooShort: 'La contraseña debe tener al menos 10 caracteres.',
    badLink: 'El enlace no sirve',
    badLinkReset: 'Pide un correo nuevo para cambiar la contraseña.',
    badLinkUsed: 'El enlace caducó o ya se usó. Pide un correo nuevo en TiLi.',
    verifySubject: 'Confirma el correo en TiLi',
    verifyTitle: 'Confirma el correo',
    verifyText: (name) => `Hola, ${name}. Pulsa el botón para confirmar tu dirección en TiLi.`,
    verifyButton: 'Confirmar correo',
    verifyFootnote: 'El enlace vale 24 horas. Si no creaste una cuenta TiLi, ignora este correo.',
    verifyOk: 'Correo confirmado',
    verifyOkBody: 'La dirección quedó guardada. Ya puedes entrar en TiLi.',
  },
};

export function mailCopy(locale: MailLocale): Copy {
  return copy[locale];
}
