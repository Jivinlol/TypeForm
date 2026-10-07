import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000", // Change 127.0.0.1 to localhost
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});