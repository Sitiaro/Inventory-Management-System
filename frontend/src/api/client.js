import axios from "axios";

// VITE_API_URL is baked in at build time. Falls back to localhost for dev.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Normalise backend error messages so the UI always has a readable string.
export function extractError(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors -> "field: message"
    return detail
      .map((d) => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`)
      .join("; ");
  }
  if (typeof detail === "string") return detail;
  return error?.message || "Something went wrong";
}

// ---- Products ----
export const ProductsApi = {
  list: () => api.get("/products").then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (data) => api.post("/products", data).then((r) => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`),
};

// ---- Customers ----
export const CustomersApi = {
  list: () => api.get("/customers").then((r) => r.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data) => api.post("/customers", data).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`),
};

// ---- Orders ----
export const OrdersApi = {
  list: () => api.get("/orders").then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (data) => api.post("/orders", data).then((r) => r.data),
  remove: (id) => api.delete(`/orders/${id}`),
};

// ---- Dashboard ----
export const DashboardApi = {
  get: () => api.get("/dashboard").then((r) => r.data),
};

export default api;
