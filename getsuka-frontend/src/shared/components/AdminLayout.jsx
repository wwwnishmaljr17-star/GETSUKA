import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AdminLogoutModal from "./AdminLogoutModal";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    <div className="h-screen w-full overflow-hidden bg-[#edf3ff]">
      {/* =====================================================
          FIXED SIDEBAR
      ===================================================== */}

      <aside className="fixed left-[22px] top-[22px] z-50 flex h-[calc(100vh-44px)] w-[205px] flex-col overflow-hidden rounded-[24px] bg-[#1557f5] shadow-[0_18px_45px_rgba(37,99,235,0.22)]">
        {/* ===================================================
            BRAND
        =================================================== */}

        <div className="shrink-0 px-[22px] pb-[22px] pt-[25px]">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="text-left"
          >
            <div className="flex items-center gap-[5px]">
              <span className="text-[20px] font-bold tracking-[-0.04em] text-white">
                GETSUKA
              </span>

              <span className="text-[15px] text-white/80">
                素
              </span>
            </div>

            <p className="mt-[4px] text-[8px] font-medium uppercase tracking-[0.2em] text-white/60">
              Admin Panel
            </p>
          </button>
        </div>

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <nav className="min-h-0 flex-1 overflow-y-auto px-[10px] scrollbar-none">
          {navItems.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`
                  group
                  mb-[5px]
                  flex
                  h-[43px]
                  w-full
                  items-center
                  gap-[11px]
                  rounded-full
                  px-[14px]
                  transition-all
                  duration-200
                  ${
                    active
                      ? "bg-white text-[#1557f5] shadow-[0_5px_16px_rgba(0,0,0,0.10)]"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <span
                  className={`
                    flex
                    h-[25px]
                    w-[25px]
                    shrink-0
                    items-center
                    justify-center
                    text-[13px]
                    ${
                      active
                        ? "text-[#1557f5]"
                        : "text-white/75"
                    }
                  `}
                >
                  {item.icon}
                </span>

                <span className="text-[12px] font-medium">
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
            onClick={() => navigate("/admin/products/new")}
            className="flex h-[40px] w-full items-center justify-center rounded-full bg-white/12 text-[10px] font-semibold text-white transition hover:bg-white/20"
          >
            + &nbsp; Add Product
          </button>
        </div>

        {/* ===================================================
            BOTTOM
        =================================================== */}

        <div className="shrink-0 border-t border-white/15 px-[10px] pb-[12px] pt-[10px]">
          {/* ADMIN PROFILE */}

          <button
            type="button"
            onClick={() => navigate("/admin/profile")}
            className={`
              mb-[4px]
              flex
              h-[42px]
              w-full
              items-center
              gap-[11px]
              rounded-full
              px-[14px]
              transition
              ${
                isActive("/admin/profile")
                  ? "bg-white text-[#1557f5]"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <span className="flex h-[25px] w-[25px] items-center justify-center text-[13px]">
              ◎
            </span>

            <span className="text-[12px] font-medium">
              Admin Profile
            </span>
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex h-[42px] w-full items-center gap-[11px] rounded-full px-[14px] text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-[25px] w-[25px] items-center justify-center text-[13px]">
              ↪
            </span>

            <span className="text-[12px] font-medium">
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN APPLICATION AREA
      ===================================================== */}

      <div className="ml-[249px] h-screen">
        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="fixed left-[249px] right-[22px] top-[22px] z-40 h-[70px] rounded-t-[24px] border-b border-[#edf1f7] bg-white">
          <div className="flex h-full items-center justify-between px-[25px]">
            {/* SEARCH */}

            <div className="relative w-full max-w-[390px]">
              <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[13px] text-[#9aa6b7]">
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search anything..."
                className="h-[38px] w-full rounded-full border border-[#e4e9f1] bg-[#f8faff] pl-[36px] pr-[55px] text-[11px] text-[#273247] outline-none placeholder:text-[#a1adbd] transition focus:border-blue-300 focus:bg-white"
              />

              <span className="absolute right-[8px] top-1/2 flex h-[23px] -translate-y-1/2 items-center rounded-full bg-white px-[7px] text-[8px] text-[#9aa6b7] shadow-sm">
                Ctrl K
              </span>
            </div>

            {/* HEADER RIGHT */}

            <div className="flex items-center gap-[13px]">
              {/* NOTIFICATION */}

              <button
                type="button"
                className="relative flex h-[35px] w-[35px] items-center justify-center rounded-full text-[14px] text-[#68768a] transition hover:bg-[#f2f6fd] hover:text-[#1557f5]"
              >
                ♧

                <span className="absolute right-[7px] top-[6px] h-[5px] w-[5px] rounded-full bg-blue-500" />
              </button>

              {/* ADMIN */}

              <button
                type="button"
                onClick={() => navigate("/admin/profile")}
                className="flex items-center gap-[8px] rounded-full px-[4px] py-[3px] transition hover:bg-[#f5f8fd]"
              >
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#1557f5] text-[11px] font-semibold text-white">
                  A
                </span>

                <span className="hidden text-[11px] font-medium text-[#29354a] sm:block">
                  Admin
                </span>

                <span className="text-[9px] text-[#a0aaba]">
                  ▾
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* ===================================================
            SCROLLABLE CONTENT
        =================================================== */}

        <main className="h-screen overflow-y-auto bg-[#edf3ff] px-[12px] pb-[22px] pt-[125px]">
          <div className="min-h-[calc(100vh-147px)] rounded-[24px] bg-white shadow-[0_15px_45px_rgba(30,64,175,0.08)]">
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