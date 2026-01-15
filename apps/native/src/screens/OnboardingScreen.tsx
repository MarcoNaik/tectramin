import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { Text } from "../components/Text";
import { Id } from "@packages/backend/convex/_generated/dataModel";

type Match = {
  user: {
    _id: Id<"users">;
    fullName?: string;
    email: string;
    rut?: string;
  };
  matchType: string;
  confidence: number;
};

function MatchCard({
  match,
  isSelected,
  onSelect,
}: {
  match: Match;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const confidenceLabel =
    match.confidence >= 0.9
      ? "Alta coincidencia"
      : match.confidence >= 0.6
        ? "Posible coincidencia"
        : match.confidence > 0
          ? "Baja coincidencia"
          : "";

  const confidenceColor =
    match.confidence >= 0.9
      ? "#22c55e"
      : match.confidence >= 0.6
        ? "#f59e0b"
        : "#6b7280";

  return (
    <TouchableOpacity
      style={[styles.matchCard, isSelected && styles.matchCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.radioContainer}>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </View>
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{match.user.fullName ?? match.user.email}</Text>
        <Text style={styles.matchEmail}>{match.user.email}</Text>
        {match.user.rut && <Text style={styles.matchRut}>RUT: {match.user.rut}</Text>}
        {confidenceLabel ? (
          <Text style={[styles.matchConfidence, { color: confidenceColor }]}>
            {confidenceLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { user } = useUser();
  const [selectedMatch, setSelectedMatch] = useState<Id<"users"> | "new" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clerkId = user?.id ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const fullName = user?.fullName ?? undefined;

  const matches = useQuery(
    api.mobile.onboarding.findPotentialMatches,
    clerkId ? { clerkId, email, fullName } : "skip"
  );

  const linkSelf = useMutation(api.mobile.onboarding.linkSelf);
  const createSelf = useMutation(api.mobile.onboarding.createSelf);

  const handleSubmit = async () => {
    if (!selectedMatch || !clerkId) return;

    setIsSubmitting(true);
    try {
      if (selectedMatch === "new") {
        await createSelf({ clerkId, email, fullName });
      } else {
        await linkSelf({
          clerkId,
          talanaUserId: selectedMatch,
          email,
          fullName,
        });
      }
      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const isLoading = matches === undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user.firstName ?? "Usuario"}</Text>
        <Text style={styles.subtitle}>Vamos a configurar tu cuenta</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Buscando tu perfil en Talana...</Text>
          </View>
        ) : matches && matches.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Selecciona tu perfil</Text>
            <Text style={styles.sectionSubtitle}>
              Vincula tu cuenta con tu perfil de Talana. Si no encuentras tu nombre, puedes crear una cuenta nueva.
            </Text>

            {(() => {
              const suggestedMatches = matches.filter((m) => m.confidence > 0);
              const directoryUsers = matches.filter((m) => m.confidence === 0);
              const hasSuggestions = suggestedMatches.length > 0;
              const hasDirectory = directoryUsers.length > 0;

              return (
                <>
                  {hasSuggestions && (
                    <>
                      <Text style={styles.dividerText}>Posibles coincidencias</Text>
                      {suggestedMatches.map((match) => (
                        <MatchCard
                          key={match.user._id}
                          match={match}
                          isSelected={selectedMatch === match.user._id}
                          onSelect={() => setSelectedMatch(match.user._id)}
                        />
                      ))}
                    </>
                  )}
                  {hasDirectory && (
                    <>
                      <Text style={styles.dividerText}>Directorio Talana</Text>
                      {directoryUsers.map((match) => (
                        <MatchCard
                          key={match.user._id}
                          match={match}
                          isSelected={selectedMatch === match.user._id}
                          onSelect={() => setSelectedMatch(match.user._id)}
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()}

            <TouchableOpacity
              style={[
                styles.newAccountCard,
                selectedMatch === "new" && styles.matchCardSelected,
              ]}
              onPress={() => setSelectedMatch("new")}
              activeOpacity={0.7}
            >
              <View style={styles.radioContainer}>
                <View style={[styles.radio, selectedMatch === "new" && styles.radioSelected]}>
                  {selectedMatch === "new" && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.matchInfo}>
                <Text style={styles.newAccountTitle}>Crear cuenta nueva</Text>
                <Text style={styles.newAccountSubtitle}>
                  No soy ninguno de los anteriores
                </Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>No encontramos tu perfil</Text>
            <Text style={styles.sectionSubtitle}>
              Crearemos una nueva cuenta para ti con los datos de tu registro
            </Text>

            <View style={styles.newUserInfo}>
              <Text style={styles.newUserLabel}>Correo:</Text>
              <Text style={styles.newUserValue}>{email}</Text>
              {fullName && (
                <>
                  <Text style={styles.newUserLabel}>Nombre:</Text>
                  <Text style={styles.newUserValue}>{fullName}</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.newAccountCard, styles.matchCardSelected]}
              activeOpacity={1}
            >
              <View style={styles.radioContainer}>
                <View style={[styles.radio, styles.radioSelected]}>
                  <View style={styles.radioInner} />
                </View>
              </View>
              <View style={styles.matchInfo}>
                <Text style={styles.newAccountTitle}>Crear mi cuenta</Text>
                <Text style={styles.newAccountSubtitle}>Comenzar a usar la aplicación</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedMatch && matches && matches.length > 0) && styles.submitButtonDisabled,
          ]}
          onPress={() => {
            if (matches && matches.length === 0) {
              setSelectedMatch("new");
              handleSubmit();
            } else {
              handleSubmit();
            }
          }}
          disabled={
            isSubmitting ||
            isLoading ||
            (matches && matches.length > 0 && !selectedMatch)
          }
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {matches && matches.length === 0 ? "Crear cuenta y continuar" : "Continuar"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "#7c3aed",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#e9d5ff",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  matchCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  matchCardSelected: {
    borderColor: "#7c3aed",
    backgroundColor: "#faf5ff",
  },
  radioContainer: {
    marginRight: 16,
    justifyContent: "center",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#7c3aed",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7c3aed",
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  matchEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  matchRut: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  },
  matchConfidence: {
    fontSize: 12,
    fontWeight: "500",
  },
  newAccountCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  newAccountTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  newAccountSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  newUserInfo: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  newUserLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  newUserValue: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 12,
  },
  footer: {
    padding: 24,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
