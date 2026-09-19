// Extract an ID only. The scanner resolves it on this origin before offering navigation.
export function eventFromCode(value: string) {
  if (value.length > 4096) return null;
  const text = value.trim();
  let path = text;
  if (!text.startsWith('/connect/')) {
    try {
      const url = new URL(text);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      path = url.pathname;
    } catch {
      return null;
    }
  }
  return /^\/connect\/([a-zA-Z0-9_-]{1,180})\/?$/.exec(path)?.[1] || null;
}
