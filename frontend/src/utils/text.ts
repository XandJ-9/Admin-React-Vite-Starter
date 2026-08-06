export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}
