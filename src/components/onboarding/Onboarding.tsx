import { useApp } from '../../context/AppContext';
import { OnboardingLegacy } from './OnboardingLegacy';
import { OnboardingShort } from './OnboardingShort';

export function Onboarding() {
  const { onboardingFlow } = useApp();
  if (onboardingFlow === 'legacy') {
    return <OnboardingLegacy key="legacy" />;
  }
  return <OnboardingShort key="short" />;
}
