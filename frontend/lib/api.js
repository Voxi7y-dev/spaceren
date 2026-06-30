import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("spaceren_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("spaceren_token");
      localStorage.removeItem("spaceren_user");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ----- Auth -----
export const signup = (email, password) =>
  api.post("/api/auth/signup", { email, password }).then((r) => r.data);

export const login = (email, password) =>
  api.post("/api/auth/login", { email, password }).then((r) => r.data);

export const googleAuth = (googleId, email, displayName) =>
  api.post("/api/auth/google", { google_id: googleId, email, display_name: displayName }).then((r) => r.data);

export const getMe = () => api.get("/api/auth/me").then((r) => r.data);

// ----- Spaces -----
export const listSpaces = () => api.get("/api/spaces").then((r) => r.data);

export const getSpace = (id) => api.get(`/api/spaces/${id}`).then((r) => r.data);

export const createCheckout = (spaceId, pricePeriod) =>
  api.post("/api/spaces/checkout", { space_id: spaceId, price_period: pricePeriod }).then((r) => r.data);

export const customizeSpace = (spaceId, data) =>
  api.put(`/api/spaces/${spaceId}/customize`, data).then((r) => r.data);

export const uploadMedia = (spaceId, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/api/spaces/${spaceId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const cancelSubscription = (spaceId) =>
  api.post(`/api/spaces/${spaceId}/cancel`).then((r) => r.data);

// ----- Admin -----
export const getAdminDashboard = () =>
  api.get("/api/admin/dashboard").then((r) => r.data);
