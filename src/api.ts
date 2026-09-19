export const SESSION_CHANGED_EVENT = 'staylinked:session-changed';
export const SESSION_USER_HEADER = 'X-Staylinked-User';
export const API_REQUEST_TIMEOUT_MS = 30_000;
let knownUserId: string | null | undefined;

export function setApiUser(userId: string | null) {
  knownUserId = userId;
}
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
export function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options, 'json');
}
export function apiBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  return request<Blob>(path, options, 'blob');
}
async function request<T>(path: string, options: RequestInit, format: 'json' | 'blob'): Promise<T> {
  const sessionRequest = path === '/session' || path.startsWith('/auth/');
  const requestUserId = knownUserId;
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  if (!sessionRequest && requestUserId !== undefined)
    headers.set(SESSION_USER_HEADER, requestUserId ?? 'anonymous');
  const mutation = !['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase());
  const uncertainChange = 'Your change may have saved. Refresh before trying again.';
  const assertCurrentAccount = () => {
    // A response from the previous account must not repopulate the new account's UI.
    if (!sessionRequest && requestUserId !== knownUserId)
      throw new ApiError('Your account changed. Please try again.', 409, 'SESSION_CHANGED');
  };
  const callerSignal = options.signal;
  if (callerSignal?.aborted)
    throw callerSignal.reason ?? new DOMException('Request cancelled', 'AbortError');
  const controller = new AbortController();
  const cancel = () => controller.abort(callerSignal?.reason);
  callerSignal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, API_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`/api${path}`, { ...options, headers, signal: controller.signal });
    assertCurrentAccount();
    if (!sessionRequest && response.status === 401)
      window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    if (response.ok && format === 'blob') {
      const blob = await response.blob();
      assertCurrentAccount();
      return blob as T;
    }
    let data: Record<string, unknown>;
    try {
      const value: unknown = await response.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      data = value as Record<string, unknown>;
    } catch {
      throw new ApiError(
        `The server returned an unreadable response. ${mutation ? uncertainChange : 'Please try again.'}`,
        response.status,
        'INVALID_RESPONSE',
      );
    }
    assertCurrentAccount();
    if (!response.ok) {
      const code = typeof data.code === 'string' ? data.code : undefined;
      if (!sessionRequest && code === 'SESSION_CHANGED' && response.status !== 401)
        window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
      throw new ApiError(
        typeof data.error === 'string' && data.error.trim()
          ? data.error
          : 'Could not complete the request. Please try again.',
        response.status,
        code,
      );
    }
    return data as T;
  } catch (error) {
    // Preserve a caller's cancellation reason so its own cleanup can suppress it.
    if (callerSignal?.aborted)
      throw callerSignal.reason ?? new DOMException('Request cancelled', 'AbortError');
    assertCurrentAccount();
    if (timedOut)
      throw new ApiError(
        `The request took too long. ${mutation ? uncertainChange : 'Please try again.'}`,
        0,
        'REQUEST_TIMEOUT',
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      mutation
        ? `Could not confirm the change. ${uncertainChange}`
        : 'Could not reach the server. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    globalThis.clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', cancel);
  }
}
export const json = (value: unknown) => JSON.stringify(value);
export const date = (value: string) => {
  const moment = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return moment.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(moment.getFullYear() !== new Date().getFullYear() ? ({ year: 'numeric' } as const) : {}),
  });
};
