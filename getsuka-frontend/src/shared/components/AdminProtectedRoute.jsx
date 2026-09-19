import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }) => {
  const adminToken =
    sessionStorage.getItem("adminToken") ||
    localStorage.getItem("adminToken");

  // No admin session → admin login
  if (!adminToken) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  // Admin session exists → allow access
  return children;
};

export default AdminProtectedRoute;