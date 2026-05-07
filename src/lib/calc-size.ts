// Parse size string like "3x4", "3×4", "3*4" and return square meters
export function calcSquareMeters(size: string): number {
  if (!size) return 0;
  // Match number x number with various separators
  const match = size.match(/([\d.]+)\s*[xX×*]\s*([\d.]+)/);
  if (!match) return 0;
  const a = parseFloat(match[1]);
  const b = parseFloat(match[2]);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round(a * b * 100) / 100;
}
