import { useState, useEffect, useRef, ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet, Linking, AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Text } from "./Text";

type PermissionStatus = "checking" | "undetermined" | "granted" | "denied";

interface PermissionsGateProps {
  children: ReactNode;
}

export function PermissionsGate({ children }: PermissionsGateProps) {
  const [cameraStatus, setCameraStatus] =
    useState<PermissionStatus>("checking");
  const [locationStatus, setLocationStatus] =
    useState<PermissionStatus>("checking");
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        checkPermissions();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkPermissions = async () => {
    const [cameraPermission, locationPermission] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);

    setCameraStatus(
      cameraPermission.granted
        ? "granted"
        : cameraPermission.canAskAgain
          ? "undetermined"
          : "denied"
    );
    setLocationStatus(
      locationPermission.granted
        ? "granted"
        : locationPermission.canAskAgain
          ? "undetermined"
          : "denied"
    );
  };

  const requestCameraPermission = async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    setCameraStatus(
      result.granted ? "granted" : result.canAskAgain ? "undetermined" : "denied"
    );
  };

  const requestLocationPermission = async () => {
    const result = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(
      result.granted ? "granted" : result.canAskAgain ? "undetermined" : "denied"
    );
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const allGranted = cameraStatus === "granted" && locationStatus === "granted";
  const anyDenied = cameraStatus === "denied" || locationStatus === "denied";

  if (cameraStatus === "checking" || locationStatus === "checking") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tectramin</Text>
        <Text style={styles.subtitle}>Verificando permisos...</Text>
      </View>
    );
  }

  if (allGranted) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tectramin</Text>
      <Text style={styles.subtitle}>
        Para usar la aplicación, necesitamos acceso a tu cámara y ubicación.
      </Text>

      <View style={styles.permissionsContainer}>
        <TouchableOpacity
          style={[
            styles.permissionCard,
            cameraStatus === "granted" && styles.permissionGranted,
            cameraStatus === "denied" && styles.permissionDenied,
          ]}
          onPress={requestCameraPermission}
          disabled={cameraStatus === "granted" || cameraStatus === "denied"}
        >
          <View style={styles.permissionIconContainer}>
            {cameraStatus === "granted" ? (
              <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            ) : cameraStatus === "denied" ? (
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            ) : (
              <Ionicons name="camera" size={32} color="#2563eb" />
            )}
          </View>
          <Text style={styles.permissionTitle}>Cámara</Text>
          <Text style={styles.permissionDescription}>
            {cameraStatus === "granted"
              ? "Permiso concedido"
              : cameraStatus === "denied"
                ? "Permiso denegado"
                : "Tomar fotos de tareas"}
          </Text>
          {cameraStatus === "undetermined" && (
            <Text style={styles.permissionAction}>Toca para permitir</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.permissionCard,
            locationStatus === "granted" && styles.permissionGranted,
            locationStatus === "denied" && styles.permissionDenied,
          ]}
          onPress={requestLocationPermission}
          disabled={locationStatus === "granted" || locationStatus === "denied"}
        >
          <View style={styles.permissionIconContainer}>
            {locationStatus === "granted" ? (
              <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            ) : locationStatus === "denied" ? (
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            ) : (
              <Ionicons name="location" size={32} color="#2563eb" />
            )}
          </View>
          <Text style={styles.permissionTitle}>Ubicación</Text>
          <Text style={styles.permissionDescription}>
            {locationStatus === "granted"
              ? "Permiso concedido"
              : locationStatus === "denied"
                ? "Permiso denegado"
                : "Registrar ubicación de tareas"}
          </Text>
          {locationStatus === "undetermined" && (
            <Text style={styles.permissionAction}>Toca para permitir</Text>
          )}
        </TouchableOpacity>
      </View>

      {anyDenied && (
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedText}>
            Has denegado uno o más permisos. Para continuar, actívalos
            manualmente en la configuración.
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
            <Text style={styles.settingsButtonText}>Abrir Configuración</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  permissionsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  permissionCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  permissionGranted: {
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  permissionDenied: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  permissionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  permissionAction: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
    marginTop: 8,
  },
  deniedContainer: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  deniedText: {
    fontSize: 14,
    color: "#991b1b",
    textAlign: "center",
    marginBottom: 16,
  },
  settingsButton: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
