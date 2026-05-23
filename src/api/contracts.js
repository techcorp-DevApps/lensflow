import { apiClient } from "@/api/client";
import { appParams } from "@/lib/app-params";

const CONTRACT_PATH = "/entities/Contract";

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = apiClient.auth.getToken?.() || appParams.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const request = async (path = "", options = {}) => {
  const baseUrl = appParams.appBaseUrl || "";
  const response = await fetch(`${baseUrl}${CONTRACT_PATH}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Contract request failed with ${response.status}`);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

/** @param {{ q?: any, limit?: number, skip?: number, sort_by?: string }} [opts] */
const buildQuery = ({ q, limit, skip, sort_by } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", typeof q === "string" ? q : JSON.stringify(q));
  if (typeof limit === "number") params.set("limit", String(limit));
  if (typeof skip === "number") params.set("skip", String(skip));
  if (sort_by) params.set("sort_by", sort_by);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const contractsApi = {
  list: (options = {}) => {
    if (typeof options === "string") {
      return apiClient.entities.Contract.list(options);
    }
    return request(buildQuery(options));
  },
  create: (data) => apiClient.entities.Contract.create(data),
  deleteMany: (query = {}) => apiClient.entities.Contract.deleteMany(query),
  bulkCreate: (records) => apiClient.entities.Contract.bulkCreate(records),
  bulkUpdate: (records) => request("/bulk", { method: "PUT", body: JSON.stringify(records) }),
  updateMany: ({ query = {}, data = {} }) =>
    request("/update-many", { method: "PATCH", body: JSON.stringify({ query, data }) }),
  get: (id) => apiClient.entities.Contract.get(id),
  update: (id, data) => apiClient.entities.Contract.update(id, data),
  delete: (id) => apiClient.entities.Contract.delete(id),
  restore: (id) => apiClient.entities.Contract.restore(id),
};
