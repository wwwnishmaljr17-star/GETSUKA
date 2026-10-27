import adminAxios from "../../../../lib/adminAxios";

// =========================================================
// GET ADMIN DASHBOARD DATA
// GET /api/admin/dashboard
// =========================================================

export const getAdminDashboard = async () => {
  try {
    const response = await adminAxios.get("/api/admin/dashboard");
    return response.data;
  } catch (error) {
    console.error("Get Admin Dashboard Error:", error);
    throw error;
  }
};
