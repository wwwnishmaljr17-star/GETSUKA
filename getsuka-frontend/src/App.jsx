import { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { userRoutes } from "./app/routes/userRoutes";
import { adminRoutes } from "./app/routes/adminRoutes";
import AppProviders from "./app/providers/AppProviders";

import UserNavbar from "./shared/components/UserNavbar";

// ============================================
// PAGE LOADING FALLBACK
// ============================================

const PageLoadingFallback = () => {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D8D3CF] border-t-[#6F4E37]" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
};

// ============================================
// USER NAVBAR WRAPPER
// ============================================

const UserNavbarWrapper = () => {
  const location = useLocation();

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

        <Suspense fallback={<PageLoadingFallback />}>
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
        </Suspense>

      </AppProviders>
    </BrowserRouter>
  );
}

export default App;