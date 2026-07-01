export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** Narrow an unknown thrown value to a message, falling back to `fallback`. */
export function getErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

// Auth now lives in httpOnly cookies — the browser attaches them automatically
// when we send credentials. The optional `token` param is kept for backward
// compatibility (and server-side callers) but is no longer required.

function rawFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, { ...init, credentials: "include" });
}

// De-dupe concurrent refresh attempts: many requests can 401 at once, but we
// only want a single /auth/refresh in flight.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawFetch("/auth/refresh", { method: "POST" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit,
  opts?: { token?: string | null }
): Promise<T> {
  const headers = new Headers(init.headers);
  if (opts?.token) headers.set("Authorization", `Bearer ${opts.token}`);
  const withHeaders: RequestInit = { ...init, headers };

  let res = await rawFetch(path, withHeaders);

  // Access token expired? Attempt a one-time silent refresh, then retry.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await rawFetch(path, withHeaders);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail ?? data ?? "Request failed";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export async function apiFetch<T>(
  path: string,
  opts?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
  }
): Promise<T> {
  return request<T>(
    path,
    {
      method: opts?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    },
    { token: opts?.token }
  );
}

export async function apiForm<T>(
  path: string,
  form: Record<string, string>,
  opts?: { token?: string | null }
): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
    },
    { token: opts?.token }
  );
}
