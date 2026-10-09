/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_PUSH_API_URL?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_VOICE_PARSE_URL?: string;
  readonly VITE_APP_BUILD?: string;
  /** When set (e.g. https://api.tili.su), auth uses the cloud account API. */
  readonly VITE_ACCOUNT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
