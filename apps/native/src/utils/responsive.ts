import { useWindowDimensions } from "react-native";

const TABLET_BREAKPOINT = 600;
const PHONE_PADDING = 16;
const TABLET_PADDING = 32;
const PHONE_FIELD_GAP = 16;
const TABLET_FIELD_GAP = 24;

export function useResponsivePadding() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  return isTablet ? TABLET_PADDING : PHONE_PADDING;
}

export function useResponsiveFieldGap() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  return isTablet ? TABLET_FIELD_GAP : PHONE_FIELD_GAP;
}
