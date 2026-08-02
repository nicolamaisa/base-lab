import { authClient, supabasePublishableKey } from "./auth-client";

export const apiUrl = import.meta.env.VITE_API_URL?.trim() || "/api";

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await authClient.auth.getSession();
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  headers.set("apikey", supabasePublishableKey);

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorBody: ApiErrorResponse | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorResponse;
    } catch {
      errorBody = null;
    }

    throw new Error(
      errorBody?.message ?? `API request failed with status ${response.status}`
    );
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await apiFetch(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
