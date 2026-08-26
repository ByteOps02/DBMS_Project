import type { Database } from "./database.types";
import { dataSync, SyncTopic } from "./dataSync";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

// In production this is set to the deployed backend URL (e.g. https://vms-backend.vercel.app).
// In local dev it is left empty so the Vite dev-proxy forwards /api/* to localhost:5000.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

const cache = new Map<string, { data: unknown; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 15000; // 15 seconds max stale window with active real-time invalidation

function invalidateMatchingCaches(path: string) {
  // Clear in-memory API caches
  const cleanPath = path.split("?")[0];
  for (const key of cache.keys()) {
    if (key.includes(cleanPath) || cleanPath.includes("/visits") || cleanPath.includes("/visitors")) {
      cache.delete(key);
    }
  }

  // Clear component UI caches & broadcast sync
  let topic: SyncTopic = "all";
  if (cleanPath.startsWith("/visitors")) {
    topic = "visitors";
    api.uiCache.delete("vms_blacklisted");
  } else if (cleanPath.startsWith("/visits")) {
    topic = "visits";
    api.uiCache.delete("vms_all_logs");
    api.uiCache.delete("vms_dash_recent");
    api.uiCache.delete("vms_dash_active");
    for (const key of api.uiCache.keys()) {
      if (key.startsWith("vms_filtered_")) {
        api.uiCache.delete(key);
      }
    }
    // Also invalidate stats on visit changes
    dataSync.notify("stats");
  } else if (cleanPath.startsWith("/hosts")) {
    topic = "hosts";
  }

  dataSync.notify(topic);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || "GET";
  const cacheKey = `${method}:${path}`;

  // 1. Return from cache if valid and it's a GET request
  if (method === "GET") {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }

    // 2. Return in-flight promise if identical request is pending
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
  }

  const token = localStorage.getItem("vms_token");
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  headers.set("Content-Type", "application/json");

  const fetchPromise = fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers,
  })
    .then(async (res) => {
      if (!res.ok) {
        let errorMessage = "API Error";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || res.statusText;
        } catch {
          errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      
      if (method === "GET") {
        cache.set(cacheKey, { data, timestamp: Date.now() });
      } else {
        // Automatic real-time invalidation and notification on all mutations
        invalidateMatchingCaches(path);
      }
      
      return data as T;
    })
    .finally(() => {
      if (method === "GET") {
        inFlightRequests.delete(cacheKey);
      }
    });

  if (method === "GET") {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const api = {
  // Synchronous cache reader
  getCachedData: <T>(path: string): T | null => {
    const cacheKey = `GET:${path}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
    return null;
  },

  // Manual complete cache invalidator
  invalidateAllCaches: () => {
    cache.clear();
    api.uiCache.clear();
    dataSync.notify("all");
  },

  // Synchronous UI cache for components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uiCache: new Map<string, any>(),


  departments: {
    list: (): Promise<Pick<Row<"departments">, "id" | "name">[]> => apiFetch("/departments"),
  },

  upload: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = localStorage.getItem("vms_token");
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    
    return fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers,
      body: formData,
    }).then(async (res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },

  hosts: {
    list: (search?: string): Promise<Row<"hosts">[]> => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch(`/hosts${qs}`);
    },

    get: (id: string): Promise<Row<"hosts">> => apiFetch(`/hosts/${id}`),

    create: (data: {
      name: string;
      email: string;
      role?: string;
      active?: boolean;
      department_id?: string;
    }): Promise<Row<"hosts">> => apiFetch("/hosts", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<Pick<Row<"hosts">, "role" | "active" | "name" | "department_id">>
    ): Promise<Row<"hosts">> =>
      apiFetch(`/hosts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    delete: (id: string): Promise<{ success: boolean }> =>
      apiFetch(`/hosts/${id}`, { method: "DELETE" }),
  },

  visitors: {
    list: (params?: {
      search?: string;
      blacklisted?: boolean;
      email?: string;
    }): Promise<Row<"visitors">[]> => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.blacklisted) qs.set("blacklisted", "true");
      if (params?.email) qs.set("email", params.email);
      const q = qs.toString();
      return apiFetch(`/visitors${q ? `?${q}` : ""}`);
    },

    getIdsByEmail: async (email: string): Promise<string[]> => {
      const visitors = await apiFetch<Row<"visitors">[]>(
        `/visitors?email=${encodeURIComponent(email)}`
      );
      return visitors.map((v) => v.id);
    },

    upsert: (data: {
      name: string;
      email: string;
      phone: string;
      photo_url?: string | null;
      id_proof_url?: string | null;
    }): Promise<Row<"visitors">> =>
      apiFetch("/visitors", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<Pick<Row<"visitors">, "is_blacklisted" | "blacklist_reason">>
    ): Promise<Row<"visitors">> =>
      apiFetch(`/visitors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  visits: {
    list: (params?: {
      status?: string;
      statuses?: string[];
      search?: string;
      date?: string;
      limit?: number;
      offset?: number;
      host_id?: string;
      approved_from?: string;
      approved_to?: string;
      checkout_from?: string;
      checkout_to?: string;
      created_from?: string;
      created_to?: string;
      _t?: number;
    }): Promise<
      (Row<"visits"> & {
        visitor: Row<"visitors"> | null;
        host: Pick<Row<"hosts">, "id" | "name" | "email" | "department_id"> | null;
      })[]
    > => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.statuses?.length) qs.set("statuses", params.statuses.join(","));
      if (params?.search) qs.set("search", params.search);
      if (params?.date) qs.set("date", params.date);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      if (params?.host_id) qs.set("host_id", params.host_id);
      if (params?.approved_from) qs.set("approved_from", params.approved_from);
      if (params?.approved_to) qs.set("approved_to", params.approved_to);
      if (params?.checkout_from) qs.set("checkout_from", params.checkout_from);
      if (params?.checkout_to) qs.set("checkout_to", params.checkout_to);
      if (params?.created_from) qs.set("created_from", params.created_from);
      if (params?.created_to) qs.set("created_to", params.created_to);
      if (params?._t) qs.set("_t", String(params._t));
      const q = qs.toString();
      return apiFetch(`/visits${q ? `?${q}` : ""}`);
    },

    get: (
      id: string
    ): Promise<
      Row<"visits"> & {
        visitor: Row<"visitors"> | null;
        host: Pick<Row<"hosts">, "id" | "name" | "email" | "department_id"> | null;
      }
    > => apiFetch(`/visits/${id}`),

    create: (data: {
      id?: string;
      visitor_id: string;
      host_id?: string | null;
      purpose: string;
      status?: string;
      valid_until?: string;
      valid_from?: string;
      expected_out_time?: string;
      vehicle_number?: string | null;
      vehicle_type?: string | null;
      additional_guests?: number;
      pass_type?: string;
    }): Promise<Row<"visits">> =>
      apiFetch("/visits", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<{
        status: string;
        approved_at: string | null;
        approved_by: string | null;
        check_in_time: string | null;
        check_out_time: string | null;
        exit_gate: string | null;
        entry_gate: string | null;
        updated_at: string;
      }>
    ): Promise<Row<"visits">> =>
      apiFetch(`/visits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  analytics: {
    get: (params?: { date_range?: number; department_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.date_range) qs.set("date_range", String(params.date_range));
      if (params?.department_id) qs.set("department_id", params.department_id);
      const q = qs.toString();
      return apiFetch<{
        total_visits: number;
        total_visitors: number;
        avg_visit_duration: string;
        approval_rate: number;
        denial_rate: number;
        today_visits: number;
        week_visits: number;
        month_visits: number;
        top_purposes: { purpose: string; count: number }[];
        daily_stats: { date: string; count: number }[];
      }>(`/analytics${q ? `?${q}` : ""}`);
    },
  },
};
