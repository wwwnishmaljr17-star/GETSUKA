import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { userRoutes } from "./app/routes/userRoutes";
import { adminRoutes } from "./app/routes/adminRoutes";
import AppProviders from "./app/providers/AppProviders";

import UserNavbar from "./shared/components/UserNavbar";


// ============================================
// USER NAVBAR WRAPPER
// ============================================

const UserNavbarWrapper = () => {
  const location = useLocation();

  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  // Public authentication pages
  const publicAuthPages = [
    "/login",
    "/register",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ];

  // Admin pages
  const isAdminPage =
    location.pathname.startsWith("/admin");

  // Don't show navbar on auth pages
  const isAuthPage =
    publicAuthPages.includes(location.pathname);

  // Don't show navbar when user isn't logged in
  if (!token) {
    return null;
  }

  // Don't show user navbar on admin pages
  if (isAdminPage) {
    return null;
  }

  // Don't show navbar on login/register/OTP/etc.
  if (isAuthPage) {
    return null;
  }

  return <UserNavbar />;
};


// ============================================
// APP
// ============================================

function App() {
  return (
    <BrowserRouter>
      <AppProviders>

        {/* GLOBAL USER NAVBAR */}

        <UserNavbarWrapper />

        {/* ROUTES */}

        <Routes>

          {/* USER ROUTES */}

          {userRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}

          {/* ADMIN ROUTES */}

          {adminRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.element}
            />
          ))}

        </Routes>

      </AppProviders>
    </BrowserRouter>
  );
}

export default App;