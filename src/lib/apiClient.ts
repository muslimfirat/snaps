import { auth } from './firebase';

/**
 * Error thrown by {@link apiFetch} for any non-2xx response or network failure.
 * `status === 0` means the request never reached the server.
 */
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

interface ApiFetchOptions {
  /** Abort signal for cancellation / timeout. */
  signal?: AbortSignal;
}

/**
 * POSTs JSON to a local `/api/*` endpoint.
 *
 * - Attaches `Authorization: Bearer <Firebase ID token>` when a user is signed in.
 * - Verifies `res.ok` and throws a typed {@link ApiError} with a user-facing
 *   Turkish message otherwise (401 / 429 / 5xx / network all handled).
 * - Returns the parsed JSON body on success.
 */
export async function apiFetch<T = any>(
  path: string,
  body: unknown,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const user = auth.currentUser;
  if (user) {
    try {
      headers['Authorization'] = `Bearer ${await user.getIdToken()}`;
    } catch (err) {
      console.warn('apiFetch: could not obtain ID token', err);
    }
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
      signal: options.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    const error = new ApiError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.', 0);
    notifyApiError(error);
    throw error;
  }

  const rawText = await res.text();
  let data: any;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      /* non-JSON response (proxy error page, etc.) */
    }
  }

  if (!res.ok) {
    const fallbackMessage =
      res.status === 401
        ? 'Bu özellik için giriş yapman gerekiyor.'
        : res.status === 429
          ? 'Çok fazla istek gönderildi, lütfen biraz bekle.'
          : 'İşlem sırasında bir sorun oluştu, lütfen tekrar dene.';
    const error = new ApiError(data?.message || fallbackMessage, res.status, data?.error);
    notifyApiError(error);
    throw error;
  }

  return data as T;
}

/** Broadcasts an API failure so a global toast can show it (see ApiErrorToast). */
function notifyApiError(error: ApiError) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('snaps:api-error', {
      detail: { message: error.message, status: error.status },
    }),
  );
}
