import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export async function compressImage(uri: string): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION, height: MAX_DIMENSION } }],
    {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
