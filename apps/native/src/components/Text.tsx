import { Text as RNText, TextProps, Platform, StyleSheet, Dimensions, StyleProp, TextStyle } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_TABLET = SCREEN_WIDTH >= 768;
const TABLET_FONT_SCALE = 1.3;

const androidTextFix = StyleSheet.create({
  base: {
    fontFamily: "Roboto",
    includeFontPadding: false,
  },
});

function scaleStyle(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!IS_TABLET || !style) return style;

  const flatStyle = StyleSheet.flatten(style);
  if (!flatStyle?.fontSize) return style;

  return [style, { fontSize: flatStyle.fontSize * TABLET_FONT_SCALE }];
}

export function Text({ children, style, ...props }: TextProps) {
  const scaledStyle = scaleStyle(style);

  if (Platform.OS === "android") {
    const content = typeof children === "string" ? `${children} ` : children;
    return (
      <RNText
        style={[androidTextFix.base, scaledStyle]}
        textBreakStrategy="simple"
        {...props}
      >
        {content}
      </RNText>
    );
  }

  return (
    <RNText style={scaledStyle} {...props}>
      {children}
    </RNText>
  );
}
