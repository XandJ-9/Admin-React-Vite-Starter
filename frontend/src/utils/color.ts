export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const FALLBACK_COLOR = '#1f7a5a';

export function normalizeHexColor(color: unknown): string | null {
  if (typeof color !== 'string') {
    return null;
  }

  const normalizedColor = color.trim();
  return HEX_COLOR_PATTERN.test(normalizedColor) ? normalizedColor.toLowerCase() : null;
}

export function mixHexColors(fromColor: string, toColor: string, weight: number): string {
  const from = hexToRgb(fromColor);
  const to = hexToRgb(toColor);

  return rgbToHex({
    r: Math.round(from.r + (to.r - from.r) * weight),
    g: Math.round(from.g + (to.g - from.g) * weight),
    b: Math.round(from.b + (to.b - from.b) * weight),
  });
}

export function toRgba(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function hexToRgb(color: string): { r: number; g: number; b: number } {
  const normalizedColor = normalizeHexColor(color) ?? FALLBACK_COLOR;
  return {
    r: Number.parseInt(normalizedColor.slice(1, 3), 16),
    g: Number.parseInt(normalizedColor.slice(3, 5), 16),
    b: Number.parseInt(normalizedColor.slice(5, 7), 16),
  };
}

export function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
