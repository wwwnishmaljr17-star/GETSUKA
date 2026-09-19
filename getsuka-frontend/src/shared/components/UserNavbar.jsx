import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "../../features/user-side/account/api/userProfileApi";

const UserNavbar = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token =
          sessionStorage.getItem("token") ||
          localStorage.getItem("token");

        if (!token) return;

        const data = await getUserProfile();

        if (data.success) {
          setUser(data.user);

          const storedUser = {
            id: data.user._id,
            fullName: data.user.fullName,
            email: data.user.email,
            profileImage: data.user.profileImage || "",
            isVerified: data.user.isVerified,
          };

          if (sessionStorage.getItem("token")) {
            sessionStorage.setItem(
              "user",
              JSON.stringify(storedUser)
            );
          } else {
            localStorage.setItem(
              "user",
              JSON.stringify(storedUser)
            );
          }
        }
      } catch (error) {
        console.error("Navbar Profile Error:", error);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const storedUser =
      sessionStorage.getItem("user") ||
      localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Stored User Error:", error);
      }
    }
  }, []);

  const profileImage = user?.profileImage || "";

  const profileInitial =
    user?.fullName?.charAt(0)?.toUpperCase() || "U";

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const navigateTo = (path) => {
    closeMenu();
    navigate(path);
  };

  return (
    <header className="relative z-50 w-full h-[78px] bg-black border-b border-white/10 flex items-center px-5 sm:px-8 md:px-[6.5%]">

      {/* =========================
          DESKTOP LOGO
      ========================== */}
      <button
        type="button"
        onClick={() => navigateTo("/")}
        className="text-white text-[22px] sm:text-[25px] font-semibold tracking-[0.28em] leading-none"
      >
        GETSUKA
      </button>

      {/* =========================
          DESKTOP NAVIGATION
      ========================== */}
      <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-7 lg:gap-11">

        <button
          type="button"
          onClick={() => navigateTo("/")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          HOME
        </button>

        <button
          type="button"
          onClick={() => navigateTo("/shop")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          SHOP
        </button>

        <button
          type="button"
          onClick={() => navigateTo("/new-arrivals")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          NEW ARRIVALS
        </button>

        <button
          type="button"
          onClick={() => navigateTo("/shop-by-anime")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          SHOP BY ANIME
        </button>

      </nav>

      {/* =========================
          DESKTOP RIGHT SIDE
      ========================== */}
      <div className="hidden md:flex ml-auto items-center gap-5 lg:gap-7">

        {/* SEARCH */}
        <button
          type="button"
          onClick={() => {
            // Search functionality later
          }}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          SEARCH
        </button>

        {/* WISHLIST */}
        <button
          type="button"
          onClick={() => navigateTo("/wishlist")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          WISHLIST
        </button>

        {/* CART */}
        <button
          type="button"
          onClick={() => navigateTo("/cart")}
          className="text-[13px] text-white tracking-wide hover:text-gray-400 transition whitespace-nowrap"
        >
          CART
        </button>

        {/* USER PROFILE */}
        <button
          type="button"
          onClick={() => navigateTo("/account")}
          className="w-9 h-9 rounded-full overflow-hidden bg-white flex items-center justify-center ml-1 hover:opacity-80 transition"
          aria-label="Account"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-black text-sm font-medium">
              {profileInitial}
            </span>
          )}
        </button>

      </div>

      {/* =========================
          MOBILE MENU BUTTON
      ========================== */}
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="md:hidden ml-auto w-10 h-10 flex items-center justify-center text-white"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7h16M4 12h16M4 17h16"
            />
          </svg>
        )}
      </button>

      {/* =========================
          MOBILE MENU
      ========================== */}
      {menuOpen && (
        <div className="md:hidden absolute top-[78px] left-0 w-full bg-black border-b border-white/10 shadow-2xl">

          <nav className="flex flex-col px-6 py-5">

            {/* HOME */}
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              HOME
            </button>

            {/* SHOP */}
            <button
              type="button"
              onClick={() => navigateTo("/shop")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              SHOP
            </button>

            {/* NEW ARRIVALS */}
            <button
              type="button"
              onClick={() => navigateTo("/new-arrivals")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              NEW ARRIVALS
            </button>

            {/* SHOP BY ANIME */}
            <button
              type="button"
              onClick={() => navigateTo("/shop-by-anime")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              SHOP BY ANIME
            </button>

            {/* SEARCH */}
            <button
              type="button"
              onClick={() => {
                closeMenu();
                // Search functionality later
              }}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              SEARCH
            </button>

            {/* WISHLIST */}
            <button
              type="button"
              onClick={() => navigateTo("/wishlist")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              WISHLIST
            </button>

            {/* CART */}
            <button
              type="button"
              onClick={() => navigateTo("/cart")}
              className="w-full text-left py-4 text-sm text-white tracking-[0.15em] border-b border-white/10 hover:text-gray-400 transition"
            >
              CART
            </button>

            {/* ACCOUNT */}
            <button
              type="button"
              onClick={() => navigateTo("/account")}
              className="w-full flex items-center gap-4 py-4 text-left text-sm text-white tracking-[0.15em] hover:text-gray-400 transition"
            >
              <span className="w-9 h-9 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-black text-sm font-medium">
                    {profileInitial}
                  </span>
                )}
              </span>

              <span>ACCOUNT</span>
            </button>

          </nav>
        </div>
      )}
    </header>
  );
};

export default UserNavbar;