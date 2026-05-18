import { apiClient } from "@/api/client";
import { appParams } from "@/lib/app-params";

const GALLERY_PATH = "/entities/Gallery";

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = apiClient.auth.getToken?.() || appParams.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const request = async (path = "", options = {}) => {
  const baseUrl = appParams.appBaseUrl || "";
  const response = await fetch(`${baseUrl}${GALLERY_PATH}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Gallery request failed with ${response.status}`);
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

export const galleriesApi = {
  list: (options = {}) => {
    if (typeof options === "string") {
      return apiClient.entities.Gallery.list(options);
    }
    return request(buildQuery(options));
  },
  create: (data) => apiClient.entities.Gallery.create(data),
  deleteMany: (query = {}) => apiClient.entities.Gallery.deleteMany(query),
  bulkCreate: (records) => apiClient.entities.Gallery.bulkCreate(records),
  bulkUpdate: (records) => request("/bulk", { method: "PUT", body: JSON.stringify(records) }),
  updateMany: ({ query = {}, data = {} }) =>
    request("/update-many", { method: "PATCH", body: JSON.stringify({ query, data }) }),
  get: (id) => apiClient.entities.Gallery.get(id),
  update: (id, data) => apiClient.entities.Gallery.update(id, data),
  delete: (id) => apiClient.entities.Gallery.delete(id),
  restore: (id) => apiClient.entities.Gallery.restore(id),
  filter: (query, sort) => apiClient.entities.Gallery.filter(query, sort),
};
