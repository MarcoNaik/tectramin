import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Text } from "../components/Text";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { db, clearAllData } from "../db/client";
import migrations from "../db/migrations/migrations";

interface DatabaseContextValue {
  db: typeof db;
  isReady: boolean;
  error: Error | undefined;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { success, error } = useMigrations(db, migrations);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (success) {
      setIsReady(true);
    }
  }, [success, error]);

  const handleReset = async () => {
    const didReset = await clearAllData();
    if (didReset) {
      Alert.alert(
        "Database Reset",
        "Database has been cleared. Please close and reopen the app.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Error", "Failed to reset database. Try deleting the app manually.");
    }
  };

  if (error) {
    console.error("[DatabaseProvider] Migration error:", error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset Database & Reload</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>This will clear all local data</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading database...</Text>
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={{ db, isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 300,
  },
  resetButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabaseContext must be used within a DatabaseProvider");
  }
  return context;
}
