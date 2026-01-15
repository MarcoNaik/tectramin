export function parseCoordinatesFromOCR(
  ocrText: string
): { latitude: string; longitude: string } | null {
  const normalized = ocrText.replace(/\s+/g, " ").trim();

  const latMatch = normalized.match(/([SN])\s*(\d+\.?\d*)°/i);
  const lngMatch = normalized.match(/([OEW])\s*(\d+\.?\d*)°/i);

  if (!latMatch || !lngMatch) return null;

  const latSign = latMatch[1].toUpperCase() === "S" ? "-" : "";
  const lngSign =
    lngMatch[1].toUpperCase() === "O" || lngMatch[1].toUpperCase() === "W"
      ? "-"
      : "";

  return {
    latitude: `${latSign}${latMatch[2]}`,
    longitude: `${lngSign}${lngMatch[2]}`,
  };
}
