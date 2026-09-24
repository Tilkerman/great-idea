export function publicAsset(file: string) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${file}`.replace(/\/{2,}/g, '/');
}

export const TILI_ICON_FILE = 'icon-tili-192.png';
export const LUMI_ICON_FILE = 'icon-lumi-192.png';

export function tiliIconUrl() {
  return publicAsset(TILI_ICON_FILE);
}

export function lumiIconUrl() {
  return publicAsset(LUMI_ICON_FILE);
}
