import axios from "axios";

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return "";
  }
  return "http://localhost:3001";
};

const adminAxios = axios.create({
  baseURL: getBaseURL(),

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

adminAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const isAuthRoute = error.config?.url?.includes("/api/admin/auth/login");

    // Handle network or connection failures gracefully
    if (!error.response) {
      const isTimeout =
        error.code === "ECONNABORTED" || error.message?.includes("timeout");
      const userMessage = isTimeout
        ? "Admin request timed out. Please check your network connection."
        : "Unable to connect to the admin server. Please check your network connection.";

      error.userMessage = userMessage;
      error.response = {
        status: 0,
        data: {
          success: false,
          message: userMessage,
        },
      };
      return Promise.reject(error);
    }

    // Suppress any raw server stack trace or internal error from displaying directly
    if (
      typeof error.response?.data?.message === "string" &&
      (error.response.data.message.includes("Error:") ||
        error.response.data.message.includes("at ") ||
        error.response.data.message.includes("node_modules"))
    ) {
      error.response.data.message =
        "An admin server error occurred. Please try again later.";
    }

    // Handle session expiration or unauthorized admin access
    if ((status === 401 || status === 403) && !isAuthRoute) {
      sessionStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");

      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/admin") &&
        !window.location.pathname.startsWith("/admin/login")
      ) {
        window.location.href = "/admin/login";
      }
    }

    return Promise.reject(error);
  }
);

export default adminAxios;