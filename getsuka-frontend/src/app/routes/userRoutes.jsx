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






export const userRoutes = [
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

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },

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
];