import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminLogoutModal from "./AdminLogoutModal";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

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

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#111111] text-white">

      <div className="flex w-full h-full">

        {/* ========================================= */}
        {/* SIDEBAR */}
        {/* ========================================= */}

        <aside className="w-[172px] h-full bg-[#0d0d0d] border-r border-[#292929] flex flex-col">

          {/* BRAND */}

          <div className="h-[63px] border-b border-[#292929] px-3 flex flex-col justify-center">

            <h1 className="text-[18px] font-medium tracking-[-0.04em] text-[#ff163d]">
              GETSUKA
            </h1>

            <p className="text-[7px] tracking-[0.12em] text-white mt-0.5">
              ADMIN TERMINAL
            </p>

          </div>


          {/* NAVIGATION */}

          <nav className="mt-0">

            {/* DASHBOARD */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/dashboard")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[14px]">
                ⊞
              </span>

              <span className="text-[8px] tracking-wide">
                Dashboard
              </span>
            </button>


            {/* PRODUCTS */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/products")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                ▣
              </span>

              <span className="text-[8px] tracking-wide">
                Products
              </span>
            </button>


            {/* ORDERS */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/orders")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                🛒
              </span>

              <span className="text-[8px] tracking-wide">
                Orders
              </span>
            </button>


            {/* CUSTOMERS */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/customers")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                ♧
              </span>

              <span className="text-[8px] tracking-wide">
                Customers
              </span>
            </button>


            {/* INVENTORY */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/inventory")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                ⌂
              </span>

              <span className="text-[8px] tracking-wide">
                Inventory
              </span>
            </button>


            {/* COUPONS */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/coupons")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                ▤
              </span>

              <span className="text-[8px] tracking-wide">
                Coupons
              </span>
            </button>


            {/* RETURNS */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/returns")
              }
              className="w-full h-[33px] px-4 flex items-center gap-3 text-gray-300 hover:bg-[#191919] transition"
            >
              <span className="text-[13px]">
                ▣
              </span>

              <span className="text-[8px] tracking-wide">
                Returns
              </span>
            </button>

          </nav>


          {/* ========================================= */}
          {/* NEW PRODUCT */}
          {/* ========================================= */}

          <div className="px-3 mt-3">

            <button
              type="button"
              className="w-full h-[26px] bg-[#e9002d] text-white text-[7px] tracking-[0.08em] font-medium hover:bg-[#ff1645] transition"
            >
              + &nbsp; New Product
            </button>

          </div>


          {/* ========================================= */}
          {/* BOTTOM */}
          {/* ========================================= */}

          <div className="mt-auto mb-3">

            {/* ADMIN PROFILE */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/profile")
              }
              className="w-full h-[30px] px-4 flex items-center gap-3 text-gray-300 hover:text-white transition"
            >

              <span className="text-[13px]">
                ◎
              </span>

              <span className="text-[8px] tracking-wide">
                Admin Profile
              </span>

            </button>


            {/* LOG OUT */}

            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(true)
              }
              className="w-full h-[30px] px-4 flex items-center gap-3 text-gray-300 hover:text-white transition"
            >

              <span className="text-[13px]">
                ↪
              </span>

              <span className="text-[8px] tracking-wide">
                Log Out
              </span>

            </button>

          </div>

        </aside>


        {/* ========================================= */}
        {/* PAGE CONTENT */}
        {/* ========================================= */}

        <main className="flex-1 h-full overflow-y-auto">
          {children}
        </main>


        {/* ========================================= */}
        {/* GLOBAL LOGOUT MODAL */}
        {/* ========================================= */}

        <AdminLogoutModal
          show={showLogoutModal}
          onCancel={() =>
            setShowLogoutModal(false)
          }
          onConfirm={handleLogout}
        />

      </div>

    </div>
  );
};

export default AdminLayout;