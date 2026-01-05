import { Modal, StyleSheet, Image, Pressable, Dimensions, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 150;
const VELOCITY_THRESHOLD = 500;

interface ImageViewerModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export function ImageViewerModal({
  visible,
  imageUri,
  onClose,
}: ImageViewerModalProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const resetPosition = () => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withSpring(1);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = 1 - event.translationY / SCREEN_HEIGHT;
      }
    })
    .onEnd((event) => {
      if (
        event.translationY > DISMISS_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD
      ) {
        translateY.value = withSpring(SCREEN_HEIGHT);
        opacity.value = withSpring(0);
        runOnJS(onClose)();
      } else {
        runOnJS(resetPosition)();
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleModalShow = () => {
    translateY.value = 0;
    opacity.value = 1;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleModalShow}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={animatedImageStyle}>
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
  },
});
