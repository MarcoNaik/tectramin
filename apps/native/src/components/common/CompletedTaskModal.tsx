import { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Image,
  Alert,
  PanResponder,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { Text } from "../Text";
import { ImageViewerModal } from "./ImageViewerModal";
import { formatFieldValue } from "../../utils/formatFieldValue";
import type { FieldTemplate, User, LookupEntity } from "../../db/types";

interface AnswerAttachment {
  localUri: string | null;
  fileName: string;
  fileType: string;
  mimeType: string;
}

interface Answer {
  label: string;
  value: string;
  fieldType: string;
  fieldServerId: string;
  attachment?: AnswerAttachment | null;
}

interface CompletedTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConfirm?: () => void;
  taskName: string;
  answers: Answer[];
  fields: FieldTemplate[];
  users: User[];
  lookupEntities: LookupEntity[];
  mode?: "view" | "confirm";
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SLIDER_WIDTH = SCREEN_WIDTH - 64;
const THUMB_SIZE = 56;
const TRACK_HEIGHT = 56;
const CONFIRM_THRESHOLD = 0.98;

interface SlideToConfirmProps {
  onConfirm: () => void;
  onConfirmStart?: () => void;
  onProgressChange?: (progress: number) => void;
}

function DarkOverlay({ progress, fadeOut }: { progress: number; fadeOut: boolean }) {
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fadeOut) {
      Animated.timing(animatedOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      animatedOpacity.setValue(progress * 0.85);
    }
  }, [progress, fadeOut, animatedOpacity]);

  return (
    <Animated.View
      style={[
        overlayStyles.container,
        { opacity: animatedOpacity },
      ]}
      pointerEvents="none"
    />
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -SCREEN_HEIGHT,
    left: -32,
    width: SCREEN_WIDTH + 64,
    height: SCREEN_HEIGHT * 2,
    backgroundColor: "#000",
    zIndex: 1,
    elevation: 1,
  },
});

type CelebrationPhase = "idle" | "takeover" | "celebrating" | "exiting";

function SuccessOverlay({
  phase,
  lottieRef,
}: {
  phase: Exclude<CelebrationPhase, "idle">;
  lottieRef: React.RefObject<LottieView | null>;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "takeover") {
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (phase === "celebrating") {
      lottieRef.current?.play();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (phase === "exiting") {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, containerOpacity, scaleAnim, textOpacity, textTranslateY, lottieRef]);

  return (
    <Animated.View style={[successStyles.container, { opacity: containerOpacity }]}>
      <LinearGradient
        colors={["#059669", "#047857"]}
        style={StyleSheet.absoluteFill}
      />
      <LottieView
        ref={lottieRef}
        source={require("../../../assets/confetti.json")}
        style={successStyles.confetti}
        autoPlay={false}
        loop={false}
        resizeMode="cover"
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={successStyles.checkmark}>✓</Text>
      </Animated.View>
      <Animated.Text
        style={[
          successStyles.text,
          { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
        ]}
      >
        ¡Completado!
      </Animated.Text>
    </Animated.View>
  );
}

const successStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    elevation: 10000,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  checkmark: {
    fontSize: 80,
    color: "#fff",
    fontWeight: "700",
    zIndex: 2,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  text: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
    zIndex: 2,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

function SlideToConfirm({ onConfirm, onConfirmStart, onProgressChange }: SlideToConfirmProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const [confirmed, setConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const hapticInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentProgress = useRef(0);
  const maxSlide = SLIDER_WIDTH - THUMB_SIZE + 24;

  const startHapticLoop = () => {
    if (hapticInterval.current) return;
    hapticInterval.current = setInterval(() => {
      const prog = currentProgress.current;
      if (prog > 0) {
        const intensity = Math.min(prog / 0.75, 1);
        if (intensity >= 1) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (intensity >= 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }, 16);
  };

  const stopHapticLoop = () => {
    if (hapticInterval.current) {
      clearInterval(hapticInterval.current);
      hapticInterval.current = null;
    }
  };

  useEffect(() => {
    if (isDragging) {
      Animated.spring(thumbScale, {
        toValue: 1.1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    } else {
      thumbScale.setValue(1);
    }
  }, [isDragging, thumbScale]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        startHapticLoop();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, maxSlide));
        translateX.setValue(newX);
        currentProgress.current = newX / maxSlide;
        setProgress(currentProgress.current);
        onProgressChange?.(currentProgress.current);
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);
        stopHapticLoop();
        const prog = gestureState.dx / maxSlide;
        if (prog >= CONFIRM_THRESHOLD) {
          setProgress(1);
          onConfirmStart?.();
          Animated.timing(translateX, {
            toValue: maxSlide,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            setConfirmed(true);
            Animated.parallel([
              Animated.spring(checkmarkScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 200,
                friction: 8,
              }),
              Animated.timing(checkmarkOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onConfirm();
            });
          });
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setProgress(0);
          onProgressChange?.(0);
          translateX.setValue(0);
        }
        currentProgress.current = 0;
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        stopHapticLoop();
        setProgress(0);
        onProgressChange?.(0);
        translateX.setValue(0);
        currentProgress.current = 0;
      },
    })
  ).current;

  const releaseTextOpacity = translateX.interpolate({
    inputRange: [maxSlide * 0.5, maxSlide * 0.75],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const progressWidth = THUMB_SIZE + 8 + progress * (maxSlide - 8);

  if (confirmed) {
    return (
      <View style={slideStyles.container}>
        <View style={[slideStyles.outerWrapper, slideStyles.confirmedTrack]}>
          <View style={slideStyles.confirmedContent}>
            <Animated.Text
              style={[
                slideStyles.checkmark,
                {
                  transform: [{ scale: checkmarkScale }],
                  opacity: checkmarkOpacity,
                },
              ]}
            >
              ✓
            </Animated.Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={slideStyles.container}>
      <View style={slideStyles.outerWrapper}>
        <View style={slideStyles.track}>
          {isDragging && <View style={[slideStyles.progressFill, { width: progressWidth }]} />}
          {!isDragging && (
            <Text style={slideStyles.text}>
              Desliza para confirmar
            </Text>
          )}
          {isDragging && (
            <Animated.Text
              style={[
                slideStyles.text,
                slideStyles.releaseText,
                { opacity: releaseTextOpacity },
              ]}
            >
              ¡Suelta para confirmar!
            </Animated.Text>
          )}
          <Animated.View
            style={[
              slideStyles.thumbGlowOuter,
              {
                transform: [{ translateX }, { scale: thumbScale }],
              },
              isDragging && {
                shadowColor: "#fff",
                shadowOpacity: 0.8,
                shadowRadius: 30 + progress * 40,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                slideStyles.thumbGlowInner,
                isDragging && {
                  shadowColor: "#fff",
                  shadowOpacity: 1,
                  shadowRadius: 8 + progress * 10,
                },
              ]}
            >
              <View style={slideStyles.thumb}>
                <Text style={slideStyles.arrow}>→</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  container: {
    width: "100%",
  },
  outerWrapper: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "#047857",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: "#059669",
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: "center",
    paddingLeft: 4,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#047857",
    borderRadius: TRACK_HEIGHT / 2,
  },
  text: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  releaseText: {
    color: "#bbf7d0",
  },
  thumbGlowOuter: {
    width: THUMB_SIZE,
    height: THUMB_SIZE - 8,
    shadowOffset: { width: 0, height: 0 },
  },
  thumbGlowInner: {
    width: THUMB_SIZE,
    height: THUMB_SIZE - 8,
    borderRadius: (THUMB_SIZE - 8) / 2,
    shadowOffset: { width: 0, height: 0 },
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE - 8,
    backgroundColor: "#fff",
    borderRadius: (THUMB_SIZE - 8) / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  arrow: {
    fontSize: 24,
    fontWeight: "600",
    color: "#059669",
  },
  confirmedTrack: {
    backgroundColor: "#047857",
  },
  confirmedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
});

export function CompletedTaskModal({
  visible,
  onClose,
  onEdit,
  onConfirm,
  taskName,
  answers,
  fields,
  users,
  lookupEntities,
  mode = "view",
}: CompletedTaskModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const displayAnswers = answers.filter((a) => a.fieldType !== "displayText");
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [overlayFadeOut, setOverlayFadeOut] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<CelebrationPhase>("idle");
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      setSlideProgress(0);
      setOverlayFadeOut(false);
      setCelebrationPhase("idle");
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const handleEdit = () => {
    Alert.alert(
      "Edición No Disponible",
      "Contacte a soporte si necesita editar un campo."
    );
  };

  const handleConfirmStart = () => {
    setOverlayFadeOut(true);
  };

  const handleConfirm = async () => {
    setSlideProgress(0);
    setOverlayFadeOut(false);
    setCelebrationPhase("takeover");
    await new Promise((r) => setTimeout(r, 200));

    setCelebrationPhase("celebrating");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 1500));

    if (onConfirm) {
      await onConfirm();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {taskName}
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {mode === "confirm" && (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>
                    Una vez completada, no podrá editar esta tarea.
                  </Text>
                </View>
              )}

              <ScrollView
                style={styles.answersContainer}
                contentContainerStyle={styles.answersContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {displayAnswers.length === 0 ? (
                  <Text style={styles.noAnswersText}>
                    No hay respuestas para mostrar
                  </Text>
                ) : (
                  displayAnswers.map((answer, index) => (
                    <View key={index} style={styles.answerRow}>
                      <Text style={styles.answerLabel}>{answer.label}</Text>
                      {answer.fieldType === "attachment" && answer.attachment ? (
                        answer.attachment.fileType === "image" && answer.attachment.localUri ? (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedImageUri(answer.attachment!.localUri);
                              setViewerVisible(true);
                            }}
                          >
                            <Image
                              source={{ uri: answer.attachment.localUri }}
                              style={styles.attachmentPreview}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.documentPreview}>
                            <Text style={styles.documentIcon}>📄</Text>
                            <Text style={styles.documentName}>{answer.attachment.fileName}</Text>
                          </View>
                        )
                      ) : (
                        <Text style={styles.answerValue}>
                          {formatFieldValue(
                            answer.value,
                            answer.fieldType,
                            fields.find((f) => f.serverId === answer.fieldServerId),
                            users,
                            lookupEntities
                          )}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>

              {mode === "confirm" && (slideProgress > 0 || overlayFadeOut) && (
                <DarkOverlay progress={slideProgress} fadeOut={overlayFadeOut} />
              )}

              <View style={styles.buttonContainer}>
                {mode === "confirm" ? (
                  <>
                    <View style={styles.sliderWrapper}>
                      <SlideToConfirm onConfirm={handleConfirm} onConfirmStart={handleConfirmStart} onProgressChange={setSlideProgress} />
                    </View>
                    <TouchableOpacity style={styles.closeActionButton} onPress={handleClose}>
                      <Text style={styles.closeActionButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.editButtonDisabled} onPress={handleEdit}>
                      <Text style={styles.editButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeActionButton} onPress={handleClose}>
                      <Text style={styles.closeActionButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      {selectedImageUri && (
        <ImageViewerModal
          visible={viewerVisible}
          imageUri={selectedImageUri}
          onClose={() => {
            setViewerVisible(false);
            setSelectedImageUri(null);
          }}
        />
      )}
      {celebrationPhase !== "idle" && (
        <SuccessOverlay phase={celebrationPhase} lottieRef={lottieRef} />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
    position: "relative",
    zIndex: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  modalClose: {
    fontSize: 20,
    color: "#6b7280",
  },
  answersContainer: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  answersContent: {
    padding: 16,
  },
  noAnswersText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  answerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  answerLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600",
  },
  answerValue: {
    fontSize: 14,
    color: "#111827",
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  sliderWrapper: {
    zIndex: 10,
    elevation: 10,
  },
  editButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeActionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  closeActionButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  warningBanner: {
    backgroundColor: "#fef2f2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#fca5a5",
  },
  warningText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editButtonDisabled: {
    backgroundColor: "#9ca3af",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  attachmentPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  documentPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  documentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
});
