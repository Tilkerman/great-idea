import mascotWelcome from '../../assets/onboarding/mascot-welcome.png';
import mascotPinch from '../../assets/onboarding/mascot-pinch.png';
import mascotHour from '../../assets/onboarding/mascot-hour.png';
import mascotColors from '../../assets/onboarding/mascot-colors.png';
import mascotComplete from '../../assets/onboarding/mascot-complete.png';
import mascotDevice from '../../assets/onboarding/mascot-device.png';
import devicesBackup from '../../assets/onboarding/devices-backup.svg';
import mascotCloud from '../../assets/onboarding/mascot-cloud.png';

const base = `${import.meta.env.BASE_URL}onboarding/`;

/** Шесть поз персонажа (импорт в бандл — не пропадают при dev/rsync). */
export const ONBOARDING_MASCOTS = {
  welcome: mascotWelcome,
  pinch: mascotPinch,
  hour: mascotHour,
  colors: mascotColors,
  complete: mascotComplete,
  device: mascotDevice,
} as const;

/** Только десктоп: скрины интерфейса справа. */
export const ONBOARDING_IMAGES = {
  colorsWeekDesktop: `${base}colors-week-desktop.jpg`,
  swipeCardComplete: `${base}swipe-card-complete.jpg`,
  devicesBackup,
  mascotCloud,
} as const;
