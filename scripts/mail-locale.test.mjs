import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localeFromNavigatorLanguage,
  localeFromSearch,
  parseAppLocale,
  resolveLaunchLocale,
} from '../src/utils/appLocale.ts';
import {
  localeFromAcceptLanguage,
  parseMailLocale,
  resolveMailLocale,
} from '../server/src/mailCopy.ts';

test('parseAppLocale accepts ru/en/es and region tags, rejects junk', () => {
  assert.equal(parseAppLocale('en'), 'en');
  assert.equal(parseAppLocale('EN-US'), 'en');
  assert.equal(parseAppLocale('es-MX'), 'es');
  assert.equal(parseAppLocale('ru'), 'ru');
  assert.equal(parseAppLocale(undefined), null);
  assert.equal(parseAppLocale('fr'), null);
  assert.equal(parseAppLocale(''), null);
});

test('English UI body locale wins over a Russian browser header', () => {
  assert.equal(resolveMailLocale({
    bodyLocale: 'en',
    acceptLanguage: 'ru-RU,ru;q=0.9,en;q=0.8',
  }), 'en');
});

test('Spanish UI body locale wins over English Accept-Language', () => {
  assert.equal(resolveMailLocale({
    bodyLocale: 'es',
    acceptLanguage: 'en-US,en;q=0.9',
  }), 'es');
});

test('missing body locale does not default to Russian when the header is English', () => {
  assert.equal(parseMailLocale(undefined), null);
  assert.equal(localeFromAcceptLanguage('en-US,en;q=0.9'), 'en');
  assert.equal(resolveMailLocale({
    acceptLanguage: 'en-US,en;q=0.9',
  }), 'en');
});

test('missing body locale follows Spanish Accept-Language', () => {
  assert.equal(resolveMailLocale({
    acceptLanguage: 'es-ES,es;q=0.9',
  }), 'es');
});

test('recovery page ?lang= matches the letter, not the browser', () => {
  assert.equal(resolveMailLocale({
    queryLang: 'en',
    acceptLanguage: 'ru-RU',
  }), 'en');
  assert.equal(resolveMailLocale({
    queryLang: 'es',
    acceptLanguage: 'en-US',
  }), 'es');
});

test('form body locale wins over a leftover query lang', () => {
  assert.equal(resolveMailLocale({
    bodyLocale: 'en',
    queryLang: 'ru',
    acceptLanguage: 'ru-RU',
  }), 'en');
});

test('junk lang does not collapse to Russian before Accept-Language', () => {
  assert.equal(resolveMailLocale({
    bodyLocale: 'fr',
    queryLang: 'xx',
    acceptLanguage: 'en-GB',
  }), 'en');
});

test('last resort without any signal is Russian', () => {
  assert.equal(resolveMailLocale({}), 'ru');
});

test('first launch follows the browser, not factory Russian', () => {
  assert.equal(resolveLaunchLocale({
    stored: 'ru',
    localeChosen: false,
    search: '',
    navigatorLanguage: 'en-US',
  }), 'en');
  assert.equal(resolveLaunchLocale({
    stored: 'ru',
    localeChosen: false,
    search: '',
    navigatorLanguage: 'es-MX',
  }), 'es');
  assert.equal(resolveLaunchLocale({
    stored: 'ru',
    localeChosen: false,
    search: '',
    navigatorLanguage: 'ru-RU',
  }), 'ru');
});

test('chosen Russian is not overwritten by an English OS', () => {
  assert.equal(resolveLaunchLocale({
    stored: 'ru',
    localeChosen: true,
    search: '',
    navigatorLanguage: 'en-US',
  }), 'ru');
});

test('stored English or Spanish is kept before the chosen flag exists', () => {
  assert.equal(resolveLaunchLocale({
    stored: 'en',
    localeChosen: false,
    search: '',
    navigatorLanguage: 'ru-RU',
  }), 'en');
  assert.equal(resolveLaunchLocale({
    stored: 'es',
    localeChosen: false,
    search: '',
    navigatorLanguage: 'en-US',
  }), 'es');
});

test('?lang= from ads always wins', () => {
  assert.equal(resolveLaunchLocale({
    stored: 'ru',
    localeChosen: true,
    search: '?lang=en',
    navigatorLanguage: 'ru-RU',
  }), 'en');
  assert.equal(localeFromSearch('?lang=es'), 'es');
  assert.equal(localeFromNavigatorLanguage('en-GB'), 'en');
});
