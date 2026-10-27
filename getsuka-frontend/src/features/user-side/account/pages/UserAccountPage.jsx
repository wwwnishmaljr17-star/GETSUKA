import { useEffect, useState } from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import { getUserProfile } from "../api/userProfileApi";
import { getUserAddresses } from "../api/addressApi";
import UserLogoutModal from "../../../../shared/components/UserLogoutModal";

const UserAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ============================================
  // FETCH PROFILE + ADDRESSES
  // ============================================

  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        // ========================================
        // GET USER PROFILE
        // ========================================

        const profileData = await getUserProfile();

        if (!profileData.success) {
          setError(
            profileData.message ||
              "Failed to load profile"
          );

          return;
        }

        setUser(profileData.user);

        // ========================================
        // GET USER ADDRESSES
        // ========================================

        const addressData =
          await getUserAddresses();

        if (addressData.success) {
          setAddresses(
            addressData.addresses || []
          );
        }
      } catch (error) {
        console.error(
          "Account Fetch Error:",
          error
        );

        if (
          error.response?.status === 401
        ) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");

          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          error.response?.data?.message ||
            "Failed to load account"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAccountData();
  }, [navigate]);

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  // ============================================
  // FORMAT DATE
  // ============================================

  const formatDate = (date) => {
    if (!date) {
      return "Not added";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  // ============================================
  // GET DEFAULT ADDRESS
  // ============================================

  const defaultAddress =
    addresses.find(
      (address) => address.isDefault
    ) || addresses[0];

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex items-center justify-center px-5">
        <p className="text-sm tracking-wide text-[#716C67] text-center">
          Loading profile...
        </p>
      </div>
    );
  }

  // ============================================
  // ERROR
  // ============================================

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-4">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="px-5 py-2 bg-[#6F4E37] text-white text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // ============================================
  // PAGE
  // ============================================

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321] overflow-x-hidden">

      <div className="w-full max-w-[1400px] mx-auto min-h-[calc(100vh-78px)] flex flex-col lg:flex-row">

        {/* ======================================
            DESKTOP SIDEBAR
        ====================================== */}

        <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 border-r border-[#E5E4E2] px-8 xl:px-12 pt-[54px]">

          <p className="text-[12px] tracking-[0.25em] text-[#716C67] mb-10 whitespace-nowrap">
            MY ACCOUNT
          </p>

          <nav className="space-y-8">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate("/account")
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                location.pathname ===
                "/account"
                  ? "text-[#6F4E37] font-semibold"
                  : "text-[#716C67] hover:text-[#6F4E37]"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            {/* PERSONAL INFORMATION */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                location.pathname ===
                "/account/update-profile"
                  ? "text-[#6F4E37] font-semibold"
                  : "text-[#716C67] hover:text-[#6F4E37]"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            {/* ORDER HISTORY */}

            <button
              type="button"
              onClick={() =>
                navigate("/account/orders")
              }
              className="block text-left text-[13px] text-[#716C67] hover:text-[#6F4E37] whitespace-nowrap transition"
            >
              ORDER HISTORY
            </button>

            {/* SAVED ADDRESSES */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/addresses"
                )
              }
              className="block text-left text-[13px] text-[#716C67] hover:text-[#6F4E37] whitespace-nowrap transition"
            >
              SAVED ADDRESSES
            </button>

            {/* REFER & EARN */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/referral"
                )
              }
              className="block text-left text-[13px] text-[#716C67] hover:text-[#6F4E37] whitespace-nowrap transition"
            >
              REFER & EARN
            </button>

            {/* MY WALLET */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/wallet"
                )
              }
              className="block text-left text-[13px] text-[#716C67] hover:text-[#6F4E37] whitespace-nowrap transition"
            >
              MY WALLET
            </button>

          </nav>

          {/* SIGN OUT */}

          <div className="border-t border-[#E5E4E2] mt-14 pt-8">

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="text-[13px] text-[#6F4E37] hover:text-[#5a3e2b] font-medium transition"
            >
              SIGN OUT
            </button>

          </div>

        </aside>

        {/* ======================================
            MOBILE ACCOUNT NAVIGATION
        ====================================== */}

        <div className="lg:hidden w-full border-b border-[#E5E4E2] px-5 sm:px-8 py-5">

          <p className="text-[10px] tracking-[0.25em] text-[#716C67] mb-5">
            MY ACCOUNT
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate("/account")
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                location.pathname ===
                "/account"
                  ? "text-[#6F4E37] font-semibold"
                  : "text-[#716C67] hover:text-[#6F4E37]"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            {/* PERSONAL INFORMATION */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                location.pathname ===
                "/account/update-profile"
                  ? "text-[#6F4E37] font-semibold"
                  : "text-[#716C67] hover:text-[#6F4E37]"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            {/* ORDER HISTORY */}

            <button
              type="button"
              onClick={() =>
                navigate("/account/orders")
              }
              className="text-left text-[11px] tracking-wide py-2 text-[#716C67] hover:text-[#6F4E37] transition"
            >
              ORDER HISTORY
            </button>

            {/* SAVED ADDRESSES */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/addresses"
                )
              }
              className="text-left text-[11px] tracking-wide py-2 text-[#716C67] hover:text-[#6F4E37] transition"
            >
              SAVED ADDRESSES
            </button>

            {/* REFER & EARN */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/referral"
                )
              }
              className="text-left text-[11px] tracking-wide py-2 text-[#716C67] hover:text-[#6F4E37] transition"
            >
              REFER & EARN
            </button>

            {/* MY WALLET */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/wallet"
                )
              }
              className="text-left text-[11px] tracking-wide py-2 text-[#716C67] hover:text-[#6F4E37] transition"
            >
              MY WALLET
            </button>

          </div>

          {/* MOBILE SIGN OUT */}

          <div className="mt-4 pt-4 border-t border-[#E5E4E2]">

            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="text-[11px] tracking-wide text-[#6F4E37] hover:text-[#5a3e2b] font-medium transition"
            >
              SIGN OUT
            </button>

          </div>

        </div>

        {/* ======================================
            MAIN CONTENT
        ====================================== */}

        <main className="flex-1 min-w-0 px-5 sm:px-8 lg:px-[51px] xl:pr-[70px] pt-8 sm:pt-10 lg:pt-[54px] pb-12">

          {/* ====================================
              PAGE HEADER
          ==================================== */}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8 sm:mb-10">

            <div>

              <p className="text-[10px] sm:text-[12px] tracking-[0.3em] text-[#716C67] mb-3 sm:mb-4">
                ACCOUNT
              </p>

              <h1 className="text-[25px] sm:text-[30px] lg:text-[32px] font-light">
                Personal Information
              </h1>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className="w-full sm:w-auto h-[46px] sm:h-[48px] px-6 sm:px-7 border border-[#E5E4E2] text-[11px] sm:text-[12px] hover:bg-[#6F4E37] hover:text-white hover:border-[#6F4E37] transition"
            >
              UPDATE PROFILE
            </button>

          </div>

          {/* ====================================
              PROFILE CARD
          ==================================== */}

          <div className="border border-[#E5E4E2] bg-white rounded-md shadow-xs p-5 sm:p-6 lg:p-8">

            {/* PROFILE HEADER */}

            <div className="flex flex-col xs:flex-row sm:flex-row items-start sm:items-center gap-4 sm:gap-5 pb-6 sm:pb-8 border-b border-[#E5E4E2]">

              {/* PROFILE IMAGE */}

              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full overflow-hidden bg-[#E6E0F0] text-[#6F4E37] border border-[#CDC4DF] flex items-center justify-center text-xl sm:text-2xl font-semibold shadow-xs">

                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.fullName
                    ?.charAt(0)
                    ?.toUpperCase() || "U"
                )}

              </div>

              {/* USER NAME */}

              <div className="min-w-0">

                <h2 className="text-lg sm:text-xl truncate">
                  {user.fullName}
                </h2>

                <p className="text-xs sm:text-sm text-[#716C67] mt-1 break-all">
                  {user.email}
                </p>

              </div>

            </div>

            {/* ==================================
                USER INFORMATION
            ================================== */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-7 sm:gap-x-8 lg:gap-x-12 sm:gap-y-8 pt-7 sm:pt-8">

              {/* FULL NAME */}

              <div className="min-w-0">

                <p className="text-[10px] sm:text-xs tracking-widest text-[#716C67] mb-2">
                  FULL NAME
                </p>

                <p className="text-sm break-words">
                  {user.fullName ||
                    "Not added"}
                </p>

              </div>

              {/* EMAIL */}

              <div className="min-w-0">

                <p className="text-[10px] sm:text-xs tracking-widest text-[#716C67] mb-2">
                  EMAIL
                </p>

                <p className="text-sm break-all">
                  {user.email ||
                    "Not added"}
                </p>

              </div>

              {/* PHONE */}

              <div className="min-w-0">

                <p className="text-[10px] sm:text-xs tracking-widest text-[#716C67] mb-2">
                  PHONE
                </p>

                <p className="text-sm break-words">
                  {user.phone ||
                    "Not added"}
                </p>

              </div>

              {/* DATE OF BIRTH */}

              <div className="min-w-0">

                <p className="text-[10px] sm:text-xs tracking-widest text-[#716C67] mb-2">
                  DATE OF BIRTH
                </p>

                <p className="text-sm">
                  {formatDate(
                    user.dateOfBirth
                  )}
                </p>

              </div>

            </div>

            {/* ==================================
                SAVED ADDRESS
            ================================== */}

            <div className="border-t border-[#E5E4E2] mt-8 sm:mt-10 pt-7 sm:pt-8">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

                <div>

                  <p className="text-[10px] sm:text-xs tracking-widest text-[#716C67] mb-2">
                    DEFAULT ADDRESS
                  </p>

                  <h3 className="text-[15px] sm:text-[16px]">
                    Delivery Address
                  </h3>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/account/addresses"
                    )
                  }
                  className="self-start sm:self-auto text-[10px] tracking-[0.12em] text-[#716C67] hover:text-[#6F4E37] transition"
                >
                  MANAGE ADDRESSES
                </button>

              </div>

              {defaultAddress ? (
                <div className="border border-[#E5E4E2] px-4 sm:px-6 py-5">

                  <div className="flex flex-col gap-2">

                    <div className="flex flex-wrap items-center gap-3">

                      <p className="text-[14px]">
                        {
                          defaultAddress.fullName
                        }
                      </p>

                      {defaultAddress.isDefault && (
                        <span className="border border-[#CDC4DF] bg-[#E6E0F0] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-[#6F4E37] rounded-xs">
                          DEFAULT
                        </span>
                      )}

                    </div>

                    <p className="text-[12px] text-[#716C67]">
                      {
                        defaultAddress.phone
                      }
                    </p>

                  </div>

                  <div className="mt-4 text-[12px] text-[#716C67] leading-6 break-words">

                    <p>
                      {
                        defaultAddress.addressLine
                      }
                    </p>

                    <p>
                      {
                        defaultAddress.city
                      }
                      ,{" "}
                      {
                        defaultAddress.state
                      }{" "}
                      {
                        defaultAddress.pincode
                      }
                    </p>

                  </div>

                </div>
              ) : (
                <div className="border border-[#E5E4E2] bg-[#FAF9F7] rounded px-5 sm:px-6 py-7">

                  <p className="text-[12px] text-[#716C67]">
                    No saved address.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/account/addresses"
                      )
                    }
                    className="mt-4 text-[10px] tracking-[0.12em] font-semibold text-[#6F4E37] hover:underline transition"
                  >
                    ADD ADDRESS
                  </button>

                </div>
              )}

            </div>

          </div>

        </main>

      </div>

      <UserLogoutModal
        show={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

    </div>
  );
};

export default UserAccountPage;