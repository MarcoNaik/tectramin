import { View, ActivityIndicator, StyleSheet } from "react-native";
import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { SignInScreen } from "./SignInScreen";
import { OnboardingScreen } from "./OnboardingScreen";
import { AssignmentsScreen } from "../features/assignments";
import { useOnboarding } from "../providers/OnboardingProvider";

function AuthenticatedContent() {
  const { needsOnboarding, isLoading, completeOnboarding } = useOnboarding();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (needsOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return <AssignmentsScreen />;
}

export default function HomeScreen() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <AuthenticatedContent />
      </SignedIn>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
});
