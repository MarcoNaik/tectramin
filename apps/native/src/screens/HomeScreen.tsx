import { SignedIn, SignedOut } from "@clerk/clerk-expo";
import { SignInScreen } from "./SignInScreen";
import { AssignmentsScreen } from "../features/assignments";

export default function HomeScreen() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <AssignmentsScreen />
      </SignedIn>
    </>
  );
}
