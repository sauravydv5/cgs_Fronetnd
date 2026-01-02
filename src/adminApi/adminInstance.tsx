import axios from "axios";

const adminInstance = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

adminInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default adminInstance;