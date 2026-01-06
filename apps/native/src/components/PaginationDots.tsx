import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

interface PaginationDotsProps {
  totalPages: number;
  currentPage: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function PaginationDots({
  totalPages,
  currentPage,
  activeColor = "#374151",
  inactiveColor = "#d1d5db",
}: PaginationDotsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: totalPages }).map((_, index) => (
        <Dot
          key={index}
          isActive={index === currentPage}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </View>
  );
}

interface DotProps {
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
}

function Dot({ isActive, activeColor, inactiveColor }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isActive ? 1.3 : 1, { duration: 100 });
    const opacity = withTiming(isActive ? 1 : 0.5, { duration: 100 });

    return {
      transform: [{ scale }],
      opacity,
      backgroundColor: withTiming(isActive ? activeColor : inactiveColor, {
        duration: 100,
      }),
    };
  }, [isActive, activeColor, inactiveColor]);

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
