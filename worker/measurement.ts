// A measurement as a scale shows it: kilograms under 500, per cent under 100, one decimal
// at most. The page reads the same bounds, so Save is offered only for what the server
// takes.
export const MAX_WEIGHT_KG = 500;
export const MAX_BODY_FAT_PCT = 100;

const SHAPE = /^\d{1,3}(\.\d)?$/;

// The number in what the person typed, if it is a measurement under `max`.
export function parseMeasurement(text: string, max: number): number | undefined {
  const trimmed = text.trim();
  if (!SHAPE.test(trimmed)) return undefined;
  const n = Number(trimmed);
  return n > 0 && n < max ? n : undefined;
}
