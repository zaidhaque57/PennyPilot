
export type ApiConfig = RequestInit & {
  params?: Record<string, string | number | boolean>;
};

export type ApiResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
};

const baseURL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api"
).replace(/\/+$/, "");

async function request<T = unknown>(
  method: string,
  path: string,
  data?: unknown,
  config: ApiConfig = {},
): Promise<ApiResponse<T>> {
  // Remove leading slashes so "/health" keeps the "/api" base path.
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(`${baseURL}/${cleanPath}`);

  Object.entries(config.params ?? {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const headers = new Headers(config.headers);

  if (data !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("pennypilot_token");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...config,
    method,
    headers,
    body: data === undefined ? config.body : JSON.stringify(data),
  });

  const text = await response.text();
  let responseData: unknown = text;

  if (text) {
    try {
      responseData = JSON.parse(text);
    } catch {
      // Preserve non-JSON responses as text.
    }
  }

  const result: ApiResponse<T> = {
    data: responseData as T,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };

  if (!response.ok) {
    console.error("PennyPilot request failed:", {
      method,
      url: url.toString(),
      status: response.status,
      response: responseData,
    });

    throw Object.assign(
      new Error(`HTTP ${response.status}: ${url.pathname}`),
      { response: result },
    );
  }

  return result;
}

const api = {
  get: <T = unknown>(path: string, config?: ApiConfig) =>
    request<T>("GET", path, undefined, config),

  delete: <T = unknown>(path: string, config?: ApiConfig) =>
    request<T>("DELETE", path, undefined, config),

  post: <T = unknown>(
    path: string,
    data?: unknown,
    config?: ApiConfig,
  ) => request<T>("POST", path, data, config),

  put: <T = unknown>(
    path: string,
    data?: unknown,
    config?: ApiConfig,
  ) => request<T>("PUT", path, data, config),

  patch: <T = unknown>(
    path: string,
    data?: unknown,
    config?: ApiConfig,
  ) => request<T>("PATCH", path, data, config),
};

export default api;
