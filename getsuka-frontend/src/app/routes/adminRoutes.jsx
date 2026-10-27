import { lazy } from "react";

import AdminProtectedRoute from "../../shared/components/AdminProtectedRoute";
import AdminLayout from "../../shared/components/AdminLayout";

// Lazy-loaded admin auth pages
const AdminLoginPage = lazy(() => import("../../features/auth/pages/AdminLoginPage"));
const AdminForgotPasswordPage = lazy(() => import("../../features/auth/pages/AdminForgotPasswordPage"));
const AdminVerifyOtpPage = lazy(() => import("../../features/auth/pages/AdminVerifyOtpPage"));
const AdminResetPasswordPage = lazy(() => import("../../features/auth/pages/AdminResetPasswordPage"));

// Lazy-loaded admin dashboard & management pages
const AdminDashboardPage = lazy(() => import("../../features/admin-side/dashboard/pages/AdminDashboardPage"));
const ProductManagementPage = lazy(() => import("../../features/admin-side/product-management/pages/ProductManagementPage"));
const AddProductPage = lazy(() => import("../../features/admin-side/product-management/pages/AddProductPage"));
const EditProductPage = lazy(() => import("../../features/admin-side/product-management/pages/EditProductPage"));
const CategoryManagementPage = lazy(() => import("../../features/admin-side/category-management/pages/CategoryManagementPage"));
const CustomerManagementPage = lazy(() => import("../../features/admin-side/customer-management/pages/CustomerManagementPage"));
const AdminOrderManagementPage = lazy(() => import("../../features/admin-side/order-management/pages/AdminOrderManagementPage"));
const AdminOrderDetailsPage = lazy(() => import("../../features/admin-side/order-management/pages/AdminOrderDetailsPage"));
const CouponManagementPage = lazy(() => import("../../features/admin-side/coupon-management/pages/CouponManagementPage"));
const CreateCouponPage = lazy(() => import("../../features/admin-side/coupon-management/pages/CreateCouponPage"));
const EditCouponPage = lazy(() => import("../../features/admin-side/coupon-management/pages/EditCouponPage"));
const InventoryManagementPage = lazy(() => import("../../features/admin-side/inventory/pages/InventoryManagementPage"));
const InventoryDetailsPage = lazy(() => import("../../features/admin-side/inventory/pages/InventoryDetailsPage"));
const AdminReturnsPage = lazy(() => import("../../features/admin-side/return-management/pages/AdminReturnsPage"));
const AdminProfilePage = lazy(() => import("../../features/admin-side/profile/pages/AdminProfilePage"));
const AdminEditProfilePage = lazy(() => import("../../features/admin-side/profile/pages/AdminEditProfilePage"));

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