import axios from "axios";
import { toast } from "react-hot-toast";

export const api = axios.create({
  // import.meta.env.VITE_API_BASE_URL 
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",

  withCredentials: true,
  headers: {
    "Cache-Control": "no-cache", // ✅ ADD THIS
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      toast.error("Session expired. Please login again.");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }

    return Promise.reject(error);
  }
);