export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || 'Could not complete the request. Please try again.');
  return data as T;
}
export const json = (value: unknown) => JSON.stringify(value);
export const initials = (name: string) =>
  name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
export const date = (value: string) =>
  new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
