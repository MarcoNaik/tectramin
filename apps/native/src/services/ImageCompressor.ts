import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

export async function compressImage(uri: string): Promise<CompressedImage> {
  const { width, height } = await getImageDimensions(uri);

  const actions: ImageManipulator.Action[] = [];

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      actions.push({ resize: { width: MAX_DIMENSION } });
    } else {
      actions.push({ resize: { height: MAX_DIMENSION } });
    }
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
