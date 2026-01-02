import { Text as RNText, TextProps, Platform, StyleSheet } from "react-native";

const androidTextFix = StyleSheet.create({
  base: {
    fontFamily: "Roboto",
    includeFontPadding: false,
  },
});

export function Text({ children, style, ...props }: TextProps) {
  if (Platform.OS === "android") {
    const content = typeof children === "string" ? `${children} ` : children;
    return (
      <RNText
        style={[androidTextFix.base, style]}
        textBreakStrategy="simple"
        {...props}
      >
        {content}
      </RNText>
    );
  }

  return (
    <RNText style={style} {...props}>
      {children}
    </RNText>
  );
}
