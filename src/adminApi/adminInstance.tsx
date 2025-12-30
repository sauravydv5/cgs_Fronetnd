import axios from "axios";

const adminInstance = axios.create({
  baseURL: "http://54.206.101.6:5000/api",
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