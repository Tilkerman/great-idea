import type { MascotPose } from './mascotTypes';
import { ONBOARDING_MASCOTS } from './onboardingAssets';
import './OnboardingMascot.css';

export type { MascotPose } from './mascotTypes';
export { ONBOARDING_POSES } from './mascotTypes';

const SRC: Record<MascotPose, string> = {
  welcome: ONBOARDING_MASCOTS.welcome,
  pinch: ONBOARDING_MASCOTS.pinch,
  hour: ONBOARDING_MASCOTS.hour,
  colors: ONBOARDING_MASCOTS.colors,
  swipe: ONBOARDING_MASCOTS.complete,
  device: ONBOARDING_MASCOTS.device,
};

export function OnboardingMascot({ pose }: { pose: MascotPose }) {
  return (
    <div className="onboarding-mascot" role="img" aria-hidden>
      <img
        className="onboarding-mascot__figure"
        src={SRC[pose]}
        alt=""
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
