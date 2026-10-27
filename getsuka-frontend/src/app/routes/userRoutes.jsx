import { lazy } from "react";
import { Navigate } from "react-router-dom";

import ProtectedRoute from "../../shared/components/ProtectedRoute";
import PublicRoute from "../../shared/components/PublicRoute";

const HomePage = lazy(() => import("../../features/user-side/home/pages/HomePage"));

// Lazy-loaded auth pages
const RegisterPage = lazy(() => import("../../features/auth/pages/RegisterPage"));
const VerifyOtpPage = lazy(() => import("../../features/auth/pages/VerifyOtpPage"));
const LoginPage = lazy(() => import("../../features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../../features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../../features/auth/pages/ResetPasswordPage"));

// Lazy-loaded storefront & product pages
const ProductListingPage = lazy(() => import("../../features/user-side/products/pages/ProductListingPage"));
const ProductDetailsPage = lazy(() => import("../../features/user-side/products/pages/ProductDetailsPage"));
const CartPage = lazy(() => import("../../features/user-side/cart/pages/CartPage"));
const WishlistPage = lazy(() => import("../../features/user-side/wishlists/pages/WishlistPage"));

// Lazy-loaded philosophy editorial pages
const PhilosophyPage = lazy(() => import("../../features/user-side/philosophy/pages/PhilosophyPage"));
const HeritagePage = lazy(() => import("../../features/user-side/philosophy/pages/HeritagePage"));
const UniversePage = lazy(() => import("../../features/user-side/philosophy/pages/UniversePage"));

// Lazy-loaded checkout pages
const ShippingPage = lazy(() => import("../../features/user-side/checkout/pages/ShippingPage"));
const ReviewPage = lazy(() => import("../../features/user-side/checkout/pages/ReviewPage"));
const PaymentPage = lazy(() => import("../../features/user-side/checkout/pages/PaymentPage"));
const PaymentFailedPage = lazy(() => import("../../features/user-side/checkout/pages/PaymentFailedPage"));
const OrderPlacedPage = lazy(() => import("../../features/user-side/orders/pages/OrderPlacedPage"));

// Lazy-loaded order pages
const OrdersPage = lazy(() => import("../../features/user-side/orders/pages/OrdersPage"));
const OrderDetailsPage = lazy(() => import("../../features/user-side/orders/pages/OrderDetailsPage"));

// Lazy-loaded user account pages
const UserAccountPage = lazy(() => import("../../features/user-side/account/pages/UserAccountPage"));
const UpdateProfilePage = lazy(() => import("../../features/user-side/account/pages/UpdateProfilePage"));
const AddressesPage = lazy(() => import("../../features/user-side/account/pages/AddressesPage"));
const WalletPage = lazy(() => import("../../features/user-side/wallet/pages/WalletPage"));
const ReferralPage = lazy(() => import("../../features/user-side/referral/pages/ReferralPage"));

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
    element: <HomePage />,
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
    path: "/checkout/payment-failed",
    element: (
      <ProtectedRoute>
        <PaymentFailedPage />
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

  {
    path: "/account/wallet",
    element: (
      <ProtectedRoute>
        <WalletPage />
      </ProtectedRoute>
    ),
  },

  // =========================================================
  // REFER & EARN
  // =========================================================

  {
    path: "/account/referral",
    element: (
      <ProtectedRoute>
        <ReferralPage />
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

  // =========================================================
  // PHILOSOPHY & BRAND STORY
  // =========================================================

  {
    path: "/philosophy",
    element: <PhilosophyPage />,
  },

  {
    path: "/philosophy/heritage",
    element: <HeritagePage />,
  },

  {
    path: "/philosophy/universe",
    element: <UniversePage />,
  },
];