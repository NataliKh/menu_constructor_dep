export interface ApiError extends Error {
  status?: number;
}

const rawBaseUrl = (import.meta as any).env?.VITE_API_URL;
const baseUrl = typeof rawBaseUrl === "string" ? rawBaseUrl.replace(/\/$/, "") : ""; // e.g. http://localhost:3000
let authToken: string | null = null;
let unauthorizedHandler: ((status: number) => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (token) localStorage.setItem('auth-token', token);
    else localStorage.removeItem('auth-token');
  } catch {}
}

export function getAuthToken() {
  return authToken;
}

export function setUnauthorizedHandler(handler: ((status: number) => void) | null) {
  unauthorizedHandler = handler;
}

// init from localStorage
try { authToken = localStorage.getItem('auth-token'); } catch {}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) {
    return normalizedPath;
  }
  return `${baseUrl}${normalizedPath}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(resolveApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  let data: any = null;
  let text: string | null = null;
  try {
    text = await resp.text();
    data = text ? JSON.parse(text) : null;
  } catch (parseError) {
    if (resp.ok) {
      return null as T;
    }
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      unauthorizedHandler?.(resp.status);
    }
    const message = data?.message || (text ?? '').trim() || `HTTP ${resp.status}`;
    const err: ApiError = new Error(message);
    err.status = resp.status;
    throw err;
  }
  return (data ?? null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  setUnauthorizedHandler,
};
