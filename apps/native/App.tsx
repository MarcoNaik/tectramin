import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ConvexClientProvider from "./ConvexClientProvider";
import { OfflineProvider } from "./src/providers/OfflineProvider";
import { OnboardingProvider } from "./src/providers/OnboardingProvider";
import { PermissionsGate } from "./src/components/PermissionsGate";
import HomeScreen from "./src/screens/HomeScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaProvider>
        <ConvexClientProvider>
          <OnboardingProvider>
            <OfflineProvider>
              <PermissionsGate>
                <NavigationContainer>
                  <Stack.Navigator>
                    <Stack.Screen
                      name="Home"
                      component={HomeScreen}
                      options={{ headerShown: false }}
                    />
                  </Stack.Navigator>
                </NavigationContainer>
              </PermissionsGate>
            </OfflineProvider>
          </OnboardingProvider>
        </ConvexClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
