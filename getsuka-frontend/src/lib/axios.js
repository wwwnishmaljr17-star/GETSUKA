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

const axiosInstance = axios.create({
  baseURL: getBaseURL(),

  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const isAuthRoute =
      error.config?.url?.includes("/api/auth/") ||
      error.config?.url?.includes("/api/admin/auth/");

    // Handle network or connection failures gracefully
    if (!error.response) {
      const isTimeout =
        error.code === "ECONNABORTED" || error.message?.includes("timeout");
      const userMessage = isTimeout
        ? "Request timed out. Please check your internet connection and try again."
        : "Unable to connect to the server. Please check your internet connection and try again.";

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
        "A server error occurred. Please try again later.";
    }

    const isAccountAuthError =
      status === 401 ||
      (status === 403 &&
        (error.response?.data?.message?.toLowerCase().includes("blocked") ||
          error.response?.data?.message?.toLowerCase().includes("verify")));

    if (isAccountAuthError && !isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      const publicPaths = [
        "/login",
        "/register",
        "/verify-otp",
        "/forgot-password",
        "/reset-password",
        "/admin/login",
      ];

      if (
        typeof window !== "undefined" &&
        !publicPaths.some((p) => window.location.pathname.startsWith(p))
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;