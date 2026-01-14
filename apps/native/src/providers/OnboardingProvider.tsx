import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";

type OnboardingContextValue = {
  needsOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const clerkId = user?.id ?? "";

  const onboardingStatus = useQuery(
    api.mobile.onboarding.checkOnboardingStatus,
    isSignedIn && clerkId ? { clerkId } : "skip"
  );

  const isLoading = isSignedIn && onboardingStatus === undefined;

  const needsOnboarding =
    isSignedIn &&
    !hasCompletedOnboarding &&
    onboardingStatus !== undefined &&
    onboardingStatus.needsOnboarding;

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.needsOnboarding) {
      setHasCompletedOnboarding(true);
    }
  }, [onboardingStatus]);

  return (
    <OnboardingContext.Provider
      value={{
        needsOnboarding,
        isLoading,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
