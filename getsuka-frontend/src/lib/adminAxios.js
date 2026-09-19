import axios from "axios";

const adminAxios = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001",

  headers: {
    "Content-Type": "application/json",
  },
});

adminAxios.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default adminAxios;