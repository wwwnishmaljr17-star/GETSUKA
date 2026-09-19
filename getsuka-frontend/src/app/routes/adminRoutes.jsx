import AdminLoginPage from "../../features/auth/pages/AdminLoginPage";

import AdminForgotPasswordPage from "../../features/auth/pages/AdminForgotPasswordPage";
import AdminVerifyOtpPage from "../../features/auth/pages/AdminVerifyOtpPage";
import AdminResetPasswordPage from "../../features/auth/pages/AdminResetPasswordPage";

import AdminDashboardPage from "../../features/admin-side/dashboard/pages/AdminDashboardPage";
import CustomerManagementPage from "../../features/admin-side/customer-management/pages/CustomerManagementPage";

import AdminProfilePage from "../../features/admin-side/profile/pages/AdminProfilePage";
import AdminEditProfilePage from "../../features/admin-side/profile/pages/AdminEditProfilePage";

import AdminProtectedRoute from "../../shared/components/AdminProtectedRoute";
import AdminLayout from "../../shared/components/AdminLayout";


export const adminRoutes = [

  /* =========================================
     ADMIN LOGIN
  ========================================= */

  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },


  /* =========================================
     ADMIN FORGOT PASSWORD
  ========================================= */

  {
    path: "/admin/forgot-password",
    element: <AdminForgotPasswordPage />,
  },


  /* =========================================
     ADMIN VERIFY OTP
  ========================================= */

  {
    path: "/admin/verify-otp",
    element: <AdminVerifyOtpPage />,
  },


  /* =========================================
     ADMIN RESET PASSWORD
  ========================================= */

  {
    path: "/admin/reset-password",
    element: <AdminResetPasswordPage />,
  },


  /* =========================================
     ADMIN DASHBOARD
  ========================================= */

  {
    path: "/admin/dashboard",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },


  /* =========================================
     CUSTOMER MANAGEMENT
  ========================================= */

  {
    path: "/admin/customers",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <CustomerManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },


  /* =========================================
     ADMIN PROFILE
  ========================================= */

  {
    path: "/admin/profile",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminProfilePage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },


  /* =========================================
     EDIT ADMIN PROFILE
  ========================================= */

  {
    path: "/admin/profile/edit",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminEditProfilePage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

];