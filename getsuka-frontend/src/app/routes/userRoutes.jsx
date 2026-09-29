import { Navigate } from "react-router-dom";

import RegisterPage from "../../features/auth/pages/RegisterPage";
import VerifyOtpPage from "../../features/auth/pages/VerifyOtpPage";
import LoginPage from "../../features/auth/pages/LoginPage";
import ForgotPasswordPage from "../../features/auth/pages/ForgotPasswordPage";
import HomePage from "../../features/user-side/home/pages/HomePage";
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage";

import ProtectedRoute from "../../shared/components/ProtectedRoute";
import PublicRoute from "../../shared/components/PublicRoute";

import UserAccountPage from "../../features/user-side/account/pages/UserAccountPage";
import UpdateProfilePage from "../../features/user-side/account/pages/UpdateProfilePage";
import AddressesPage from "../../features/user-side/account/pages/AddressesPage";

import ProductListingPage from "../../features/user-side/products/pages/ProductListingPage";
import ProductDetailsPage from "../../features/user-side/products/pages/ProductDetailsPage";

import CartPage from "../../features/user-side/cart/pages/CartPage";

import WishlistPage from "../../features/user-side/wishlists/pages/WishlistPage";

import ShippingPage from "../../features/user-side/checkout/pages/ShippingPage";
import ReviewPage from "../../features/user-side/checkout/pages/ReviewPage";
import PaymentPage from "../../features/user-side/checkout/pages/PaymentPage";

import OrderPlacedPage from "../../features/user-side/checkout/pages/OrderPlacedPage";

import OrdersPage from "../../features/user-side/orders/pages/OrdersPage";
import OrderDetailsPage from "../../features/user-side/orders/pages/OrderDetailsPage";

export const userRoutes = [
  // =========================================================
  // AUTH
  // =========================================================

  {
    path: "/register",
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },

  {
    path: "/verify-otp",
    element: (
      <PublicRoute>
        <VerifyOtpPage />
      </PublicRoute>
    ),
  },

  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },

  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },

  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },

  // =========================================================
  // HOME
  // =========================================================

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // PRODUCTS
  // =========================================================

  {
    path: "/shop",
    element: <ProductListingPage />,
  },

  {
    path: "/products/:productId",
    element: <ProductDetailsPage />,
  },

  {
    path: "/products",
    element: (
      <Navigate
        to="/shop"
        replace
      />
    ),
  },

  // =========================================================
  // CART
  // =========================================================

  {
    path: "/cart",
    element: <CartPage />,
  },

  // =========================================================
  // WISHLIST
  // =========================================================

  {
    path: "/wishlist",
    element: (
      <ProtectedRoute>
        <WishlistPage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // CHECKOUT
  // =========================================================

  {
    path: "/checkout",
    element: (
      <ProtectedRoute>
        <ShippingPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/checkout/review",
    element: (
      <ProtectedRoute>
        <ReviewPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/checkout/payment",
    element: (
      <ProtectedRoute>
        <PaymentPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/checkout/order-placed",
    element: (
      <ProtectedRoute>
        <OrderPlacedPage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // ORDERS
  // =========================================================

  {
    path: "/orders",
    element: (
      <ProtectedRoute>
        <OrdersPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/orders/:orderId",
    element: (
      <ProtectedRoute>
        <OrderDetailsPage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // ACCOUNT
  // =========================================================

  {
    path: "/account",
    element: (
      <ProtectedRoute>
        <UserAccountPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/account/update-profile",
    element: (
      <ProtectedRoute>
        <UpdateProfilePage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/account/addresses",
    element: (
      <ProtectedRoute>
        <AddressesPage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // ACCOUNT ORDERS
  // =========================================================

  {
    path: "/account/orders",
    element: (
      <ProtectedRoute>
        <OrdersPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/account/orders/:orderId",
    element: (
      <ProtectedRoute>
        <OrderDetailsPage />
      </ProtectedRoute>
    ),
  },
];