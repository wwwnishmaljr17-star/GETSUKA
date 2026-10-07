import AdminLoginPage from "../../features/auth/pages/AdminLoginPage";

import AdminForgotPasswordPage from "../../features/auth/pages/AdminForgotPasswordPage";
import AdminVerifyOtpPage from "../../features/auth/pages/AdminVerifyOtpPage";
import AdminResetPasswordPage from "../../features/auth/pages/AdminResetPasswordPage";

import AdminDashboardPage from "../../features/admin-side/dashboard/pages/AdminDashboardPage";

import ProductManagementPage from "../../features/admin-side/product-management/pages/ProductManagementPage";
import AddProductPage from "../../features/admin-side/product-management/pages/AddProductPage";
import EditProductPage from "../../features/admin-side/product-management/pages/EditProductPage";

import CategoryManagementPage from "../../features/admin-side/category-management/pages/CategoryManagementPage";

import CustomerManagementPage from "../../features/admin-side/customer-management/pages/CustomerManagementPage";

import AdminOrderManagementPage from "../../features/admin-side/order-management/pages/AdminOrderManagementPage";
import AdminOrderDetailsPage from "../../features/admin-side/order-management/pages/AdminOrderDetailsPage";

import CouponManagementPage from "../../features/admin-side/coupon-management/pages/CouponManagementPage";
import CreateCouponPage from "../../features/admin-side/coupon-management/pages/CreateCouponPage";
import EditCouponPage from "../../features/admin-side/coupon-management/pages/EditCouponPage";

import InventoryManagementPage from "../../features/admin-side/inventory/pages/InventoryManagementPage";
import InventoryDetailsPage from "../../features/admin-side/inventory/pages/InventoryDetailsPage";

import AdminReturnsPage from "../../features/admin-side/return-management/pages/AdminReturnsPage";

import AdminProfilePage from "../../features/admin-side/profile/pages/AdminProfilePage";
import AdminEditProfilePage from "../../features/admin-side/profile/pages/AdminEditProfilePage";

import AdminProtectedRoute from "../../shared/components/AdminProtectedRoute";
import AdminLayout from "../../shared/components/AdminLayout";

export const adminRoutes = [
  // =========================================================
  // ADMIN AUTH
  // =========================================================

  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },

  {
    path: "/admin/forgot-password",
    element: <AdminForgotPasswordPage />,
  },

  {
    path: "/admin/verify-otp",
    element: <AdminVerifyOtpPage />,
  },

  {
    path: "/admin/reset-password",
    element: <AdminResetPasswordPage />,
  },

  // =========================================================
  // DASHBOARD
  // =========================================================

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

  // =========================================================
  // PRODUCTS
  // =========================================================

  {
    path: "/admin/products",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <ProductManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/products/new",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AddProductPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/products/:productId/edit",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <EditProductPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // CATEGORIES
  // =========================================================

  {
    path: "/admin/categories",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <CategoryManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // CUSTOMERS
  // =========================================================

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

  // =========================================================
  // ORDERS
  // =========================================================

  {
    path: "/admin/orders",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminOrderManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/orders/:orderId",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminOrderDetailsPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // COUPONS
  // =========================================================

  {
    path: "/admin/coupons",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <CouponManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/coupons/new",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <CreateCouponPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/coupons/:couponId/edit",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <EditCouponPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // INVENTORY
  // =========================================================

  {
    path: "/admin/inventory",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <InventoryManagementPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  {
    path: "/admin/inventory/:productId",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <InventoryDetailsPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // RETURNS
  // =========================================================

  {
    path: "/admin/returns",
    element: (
      <AdminProtectedRoute>
        <AdminLayout>
          <AdminReturnsPage />
        </AdminLayout>
      </AdminProtectedRoute>
    ),
  },

  // =========================================================
  // ADMIN PROFILE
  // =========================================================

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