export function normalizeRoutePath(path?: string | null): string | null {
  if (!path) {
    return null;
  }

  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return null;
  }

  const withLeadingSlash = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
}
