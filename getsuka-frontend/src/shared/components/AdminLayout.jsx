import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AdminLogoutModal from "./AdminLogoutModal";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileSidebarOpen]);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");

    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("admin");

    setShowLogoutModal(false);

    navigate("/admin/login", {
      replace: true,
    });
  };

  // =========================================================
  // ACTIVE ROUTE
  // =========================================================

  const isActive = (path) => {
    if (path === "/admin/products") {
      return (
        location.pathname === "/admin/products" ||
        location.pathname.startsWith("/admin/products/")
      );
    }

    if (path === "/admin/orders") {
      return (
        location.pathname === "/admin/orders" ||
        location.pathname.startsWith("/admin/orders/")
      );
    }

    if (path === "/admin/inventory") {
      return (
        location.pathname === "/admin/inventory" ||
        location.pathname.startsWith("/admin/inventory/")
      );
    }

    if (path === "/admin/profile") {
      return (
        location.pathname === "/admin/profile" ||
        location.pathname.startsWith("/admin/profile/")
      );
    }

    return location.pathname === path;
  };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "▦",
    },

    {
      label: "Products",
      path: "/admin/products",
      icon: "▣",
    },

    {
      label: "Categories",
      path: "/admin/categories",
      icon: "▤",
    },

    {
      label: "Orders",
      path: "/admin/orders",
      icon: "🛒",
    },

    {
      label: "Inventory",
      path: "/admin/inventory",
      icon: "📦",
    },

    {
      label: "Customers",
      path: "/admin/customers",
      icon: "♧",
    },

    {
      label: "Coupons",
      path: "/admin/coupons",
      icon: "◇",
    },

    {
      label: "Returns",
      path: "/admin/returns",
      icon: "↩",
    },
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#FAF9F7]">
      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#211B18]/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* =====================================================
          RESPONSIVE SIDEBAR
      ===================================================== */}

      <aside
        id="admin-sidebar"
        className={`fixed left-[12px] top-[12px] lg:left-[20px] lg:top-[20px] z-50 flex h-[calc(100vh-24px)] lg:h-[calc(100vh-40px)] w-[220px] lg:w-[210px] flex-col overflow-hidden rounded-[16px] border border-[#6F4E37]/20 bg-[#211B18] shadow-[0_20px_45px_rgba(33,27,24,0.25)] transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen
            ? "translate-x-0"
            : "-translate-x-[calc(100%+24px)] lg:translate-x-0"
        }`}
        aria-label="Admin navigation"
      >
        {/* ===================================================
            BRAND
        =================================================== */}

        <div className="shrink-0 px-[22px] pb-[20px] pt-[24px] border-b border-[#E5E4E2]/10">
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              navigate("/admin/dashboard");
            }}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded"
          >
            <div className="flex items-center gap-[6px]">
              <span className="text-[19px] font-bold tracking-[0.16em] text-white">
                GETSUKA
              </span>

              <span className="text-[13px] text-[#E6E0F0]">
                素
              </span>
            </div>

            <p className="mt-[4px] text-[8px] font-semibold uppercase tracking-[0.25em] text-[#E5E4E2]/60">
              Admin Suite
            </p>
          </button>
        </div>

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="min-h-0 flex-1 overflow-y-auto px-[10px] py-[14px] scrollbar-none" aria-label="Admin pages">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate(item.path);
                }}
                className={`
                  group
                  mb-[4px]
                  flex
                  h-[42px]
                  w-full
                  items-center
                  gap-[11px]
                  rounded-lg
                  px-[14px]
                  transition-all
                  duration-200
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#6F4E37]
                  ${
                    active
                      ? "bg-[#6F4E37] text-white shadow-[0_4px_14px_rgba(111,78,55,0.35)] font-semibold"
                      : "text-[#E5E4E2]/75 hover:bg-[#6F4E37]/15 hover:text-white"
                  }
                `}
              >
                <span
                  className={`
                    flex
                    h-[24px]
                    w-[24px]
                    shrink-0
                    items-center
                    justify-center
                    text-[13px]
                    ${
                      active
                        ? "text-white"
                        : "text-[#E6E0F0]/60 group-hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span className="text-[11px] tracking-wider uppercase">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ===================================================
            ADD PRODUCT
        =================================================== */}

        <div className="shrink-0 px-[12px] pb-[12px]">
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              navigate("/admin/products/new");
            }}
            className="flex h-[38px] w-full items-center justify-center rounded-lg border border-[#6F4E37]/40 bg-[#6F4E37]/20 text-[10px] font-bold uppercase tracking-[0.14em] text-[#E6E0F0] transition hover:bg-[#6F4E37] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
          >
            + &nbsp; Add Product
          </button>
        </div>

        {/* ===================================================
            BOTTOM
        =================================================== */}

        <div className="shrink-0 border-t border-[#E5E4E2]/10 px-[10px] pb-[12px] pt-[10px]">
          {/* ADMIN PROFILE */}

          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              navigate("/admin/profile");
            }}
            className={`
              mb-[4px]
              flex
              h-[40px]
              w-full
              items-center
              gap-[11px]
              rounded-lg
              px-[14px]
              transition
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#6F4E37]
              ${
                isActive("/admin/profile")
                  ? "bg-[#6F4E37] text-white shadow-xs"
                  : "text-[#E5E4E2]/75 hover:bg-[#6F4E37]/15 hover:text-white"
              }
            `}
          >
            <span className="flex h-[24px] w-[24px] items-center justify-center text-[13px]">
              ◎
            </span>

            <span className="text-[11px] tracking-wider uppercase font-medium">
              Admin Profile
            </span>
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex h-[40px] w-full items-center gap-[11px] rounded-lg px-[14px] text-[#E5E4E2]/70 transition hover:bg-[#E6E0F0]/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
          >
            <span className="flex h-[24px] w-[24px] items-center justify-center text-[13px]">
              ↪
            </span>

            <span className="text-[11px] tracking-wider uppercase font-medium">
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN APPLICATION AREA
      ===================================================== */}

      <div className="ml-0 lg:ml-[250px] h-screen">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="fixed left-[12px] right-[12px] top-[12px] lg:left-[250px] lg:right-[20px] lg:top-[20px] z-40 h-[68px] rounded-t-[16px] border border-[#E5E4E2] bg-white shadow-xs">
          <div className="flex h-full items-center justify-between px-[16px] sm:px-[25px]">
            {/* MOBILE HAMBURGER TOGGLE */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              aria-label={mobileSidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileSidebarOpen}
              aria-controls="admin-sidebar"
              className="mr-3 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-[#252321] transition hover:bg-[#FAF9F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* SEARCH */}

            <div className="relative w-full max-w-[390px]">
              <label htmlFor="admin-search-input" className="sr-only">
                Search admin
              </label>

              <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[13px] text-[#716C67]">
                ⌕
              </span>

              <input
                id="admin-search-input"
                type="text"
                placeholder="Search administration..."
                className="h-[38px] w-full rounded-md border border-[#E5E4E2] bg-[#FAF9F7] pl-[36px] pr-[55px] text-[11px] text-[#252321] outline-none placeholder:text-[#716C67] transition focus:border-[#6F4E37] focus:bg-white"
              />

              <span className="hidden sm:flex absolute right-[8px] top-1/2 h-[22px] -translate-y-1/2 items-center rounded border border-[#E5E4E2] bg-white px-[7px] text-[8px] font-semibold text-[#716C67] shadow-xs">
                Ctrl K
              </span>
            </div>

            {/* HEADER RIGHT */}

            <div className="flex items-center gap-[10px] sm:gap-[14px]">
              {/* ADMIN */}

              <button
                type="button"
                onClick={() => navigate("/admin/profile")}
                aria-label="Admin Profile"
                className="flex items-center gap-[9px] rounded-lg border border-[#E5E4E2] px-[8px] py-[4px] transition hover:border-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-[#6F4E37] text-[11px] font-bold text-white">
                  A
                </span>

                <span className="hidden text-[11px] font-semibold text-[#252321] sm:block">
                  Admin
                </span>

                <span className="text-[9px] text-[#716C67]">
                  ▾
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* ===================================================
            SCROLLABLE CONTENT
        =================================================== */}

        <main className="h-screen overflow-y-auto bg-[#FAF9F7] px-[8px] sm:px-[12px] pb-[22px] pt-[95px] lg:pt-[115px]">
          <div className="min-h-[calc(100vh-117px)] lg:min-h-[calc(100vh-137px)] rounded-[16px] border border-[#E5E4E2] bg-white p-5 sm:p-7 shadow-[0_4px_25px_rgba(33,27,24,0.03)]">
            {children}
          </div>
        </main>
      </div>

      {/* =====================================================
          LOGOUT MODAL
      ===================================================== */}

      <AdminLogoutModal
        show={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default AdminLayout;