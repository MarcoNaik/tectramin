import { TouchableOpacity, Image, View, StyleSheet } from "react-native";
import { Text } from "./Text";

interface UserAvatarButtonProps {
  imageUrl?: string | null;
  fullName?: string | null;
  onPress: () => void;
  size?: number;
}

export function UserAvatarButton({
  imageUrl,
  fullName,
  onPress,
  size = 36,
}: UserAvatarButtonProps) {
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || "?";
  };

  const dynamicStyles = {
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    text: {
      fontSize: size * 0.4,
    },
  };

  if (imageUrl) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Image
          source={{ uri: imageUrl }}
          style={[styles.avatar, dynamicStyles.container]}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.initialsContainer, dynamicStyles.container]}>
        <Text style={[styles.initials, dynamicStyles.text]}>
          {getInitials(fullName)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#e5e7eb",
  },
  initialsContainer: {
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "600",
  },
});
