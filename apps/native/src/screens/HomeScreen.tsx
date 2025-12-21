import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { useAuth, useUser, SignedIn, SignedOut, useSignIn, useSSO } from "@clerk/clerk-expo";
import { useTasks } from "../hooks/useTasks";
import { SyncStatusIcon } from "../components/SyncStatusIcon";

function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleOAuthSignIn = async (strategy: "oauth_google" | "oauth_microsoft") => {
    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy,
      });

      if (createdSessionId) {
        await ssoSetActive!({ session: createdSessionId });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "OAuth sign in failed");
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Sign in failed");
    }
  };

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Tectramin</Text>

      <TouchableOpacity
        style={styles.oauthButton}
        onPress={() => handleOAuthSignIn("oauth_google")}
      >
        <Text style={styles.oauthButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.oauthButton}
        onPress={() => handleOAuthSignIn("oauth_microsoft")}
      >
        <Text style={styles.oauthButtonText}>Sign in with Microsoft</Text>
      </TouchableOpacity>

      <View style={styles.separator}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>or</Text>
        <View style={styles.separatorLine} />
      </View>

      <TextInput
        style={styles.signInInput}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.signInInput}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

function TasksScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [newTask, setNewTask] = useState("");

  const { tasks, createTask, toggleTask } = useTasks(user?.id ?? "");

  const handleAddTask = async () => {
    console.log("[HomeScreen] handleAddTask called");
    console.log("[HomeScreen] newTask:", newTask);
    console.log("[HomeScreen] user?.id:", user?.id);

    if (!newTask.trim() || !user?.id) {
      console.log("[HomeScreen] Validation failed - newTask.trim():", newTask.trim(), "user?.id:", user?.id);
      return;
    }

    console.log("[HomeScreen] Calling createTask...");
    try {
      await createTask({ text: newTask });
      console.log("[HomeScreen] createTask completed successfully");
      setNewTask("");
    } catch (error) {
      console.error("[HomeScreen] Error in createTask:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={styles.headerRight}>
          <SyncStatusIcon />
          <TouchableOpacity onPress={() => signOut()}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={newTask}
          onChangeText={setNewTask}
          placeholder="Add a new task..."
          onSubmitEditing={handleAddTask}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.clientId}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleTask(item.clientId)}
            >
              {item.isCompleted && <View style={styles.checked} />}
            </TouchableOpacity>
            <Text
              style={[styles.taskText, item.isCompleted && styles.completed]}
            >
              {item.text}
            </Text>
            {item.syncStatus === "pending" && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>pending</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  return (
    <>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        <TasksScreen />
      </SignedIn>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 32,
  },
  signInInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  oauthButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  oauthButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#d1d5db",
  },
  separatorText: {
    color: "#6b7280",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  signOutText: {
    color: "#6b7280",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    justifyContent: "center",
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: {
    width: 14,
    height: 14,
    backgroundColor: "#2563eb",
    borderRadius: 2,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
  },
  completed: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 10,
    color: "#d97706",
  },
});
