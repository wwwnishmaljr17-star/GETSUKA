import axiosInstance from "../lib/axios";

const apiClient = {
  get: (url, config = {}) => axiosInstance.get(url, config),

  post: (url, data = {}, config = {}) =>
    axiosInstance.post(url, data, config),

  put: (url, data = {}, config = {}) =>
    axiosInstance.put(url, data, config),

  patch: (url, data = {}, config = {}) =>
    axiosInstance.patch(url, data, config),

  delete: (url, config = {}) =>
    axiosInstance.delete(url, config),
};

export default apiClient;