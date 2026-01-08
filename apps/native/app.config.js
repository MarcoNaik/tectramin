export default {
  expo: {
    name: "Tectramin",
    slug: "tectramin",
    scheme: "tectramin",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.kueks.tectramin",
      infoPlist: {
        NSCameraUsageDescription:
          "Tectramin necesita acceso a la cámara para tomar fotos de las tareas realizadas.",
        NSLocationWhenInUseUsageDescription:
          "Tectramin necesita acceso a tu ubicación para registrar dónde se realizan las tareas.",
      },
    },
    android: {
      package: "com.kueks.tectramin",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0D87E1",
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-font",
      "expo-secure-store",
      ["expo-sqlite"],
      "expo-web-browser",
      [
        "expo-image-picker",
        {
          cameraPermission:
            "Tectramin necesita acceso a la cámara para tomar fotos de las tareas realizadas.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Tectramin necesita acceso a tu ubicación para registrar dónde se realizan las tareas.",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "5d4c3e0e-d4af-4bb6-ba5f-e0a62c43581b",
      },
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
  },
};
