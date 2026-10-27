import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { getUserProfile } from "../../features/user-side/account/api/userProfileApi";
import wishlistApi from "../../features/user-side/wishlists/api/wishlistApi";

const CART_KEY = "getsukaCart";

const UserNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // =========================================================
  // SMART SCROLL BEHAVIOUR
  // =========================================================

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    const SCROLL_THRESHOLD = 10;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - lastScrollY;

          if (currentScrollY <= 15) {
            setIsVisible(true);
          } else if (Math.abs(delta) > SCROLL_THRESHOLD) {
            if (delta > 0 && currentScrollY > 76) {
              setIsVisible(false);
            } else if (delta < 0) {
              setIsVisible(true);
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, [location.pathname]);

  // =========================================================
  // CART COUNT
  // =========================================================

  const loadCartCount = () => {
    try {
      const storedCart =
        localStorage.getItem(CART_KEY);

      if (!storedCart) {
        setCartCount(0);
        return;
      }

      const cartItems =
        JSON.parse(storedCart);

      if (!Array.isArray(cartItems)) {
        setCartCount(0);
        return;
      }

      const uniqueVariants =
        new Set();

      cartItems.forEach((item) => {
        const productId =
          item?.productId ||
          item?.product?._id ||
          item?._id ||
          "";

        const variantId =
          item?.variantId ||
          item?.variant?._id ||
          `${item?.size || ""}-${item?.color || ""}`;

        if (productId) {
          uniqueVariants.add(
            `${productId}-${variantId}`
          );
        }
      });

      setCartCount(
        uniqueVariants.size
      );
    } catch (error) {
      console.error(
        "Cart Count Error:",
        error
      );

      setCartCount(0);
    }
  };

  // =========================================================
  // WISHLIST COUNT
  // =========================================================

  const loadWishlistCount =
    async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setWishlistCount(0);
          return;
        }

        const response =
          await wishlistApi.getWishlist();

        if (!response?.success) {
          setWishlistCount(0);
          return;
        }

        const wishlist =
          Array.isArray(
            response.wishlist
          )
            ? response.wishlist
            : [];

        setWishlistCount(
          wishlist.length
        );
      } catch (error) {
        console.error(
          "Wishlist Count Error:",
          error
        );

        setWishlistCount(0);
      }
    };

  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          return;
        }

        const data =
          await getUserProfile();

        if (data.success) {
          setUser(data.user);

          const storedUser = {
            id: data.user._id,
            fullName:
              data.user.fullName,
            email:
              data.user.email,
            profileImage:
              data.user.profileImage || "",
            isVerified:
              data.user.isVerified,
          };

          localStorage.setItem(
            "user",
            JSON.stringify(storedUser)
          );
        }
      } catch (error) {
        console.error(
          "Navbar Profile Error:",
          error
        );
      }
    };

    loadUser();
  }, []);

  // =========================================================
  // LOAD STORED USER
  // =========================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(
          JSON.parse(storedUser)
        );
      } catch (error) {
        console.error(
          "Stored User Error:",
          error
        );
      }
    }
  }, []);

  // =========================================================
  // INITIAL CART + WISHLIST COUNTS
  // =========================================================

  useEffect(() => {
    loadCartCount();
    loadWishlistCount();

    // -------------------------------------------------------
    // CART UPDATED
    // -------------------------------------------------------

    const handleCartUpdated = () => {
      loadCartCount();
    };

    // -------------------------------------------------------
    // WISHLIST UPDATED
    // -------------------------------------------------------

    const handleWishlistUpdated = (event) => {
      if (
        event?.detail?.count !== undefined &&
        typeof event.detail.count === "number"
      ) {
        setWishlistCount(event.detail.count);
      } else {
        loadWishlistCount();
      }
    };

    window.addEventListener(
      "cartUpdated",
      handleCartUpdated
    );

    window.addEventListener(
      "wishlistUpdated",
      handleWishlistUpdated
    );

    return () => {
      window.removeEventListener(
        "cartUpdated",
        handleCartUpdated
      );

      window.removeEventListener(
        "wishlistUpdated",
        handleWishlistUpdated
      );
    };
  }, []);

  // =========================================================
  // STORAGE EVENT
  // =========================================================

  useEffect(() => {
    const handleStorageChange =
      (event) => {
        if (event.key === CART_KEY) {
          loadCartCount();
        }
      };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // =========================================================
  // PROFILE
  // =========================================================

  const profileImage =
    user?.profileImage || "";

  const profileInitial =
    user?.fullName
      ?.charAt(0)
      ?.toUpperCase() || "U";

  // =========================================================
  // MENU
  // =========================================================

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const navigateTo = (path) => {
    closeMenu();
    navigate(path);
  };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <header
      className={`sticky top-0 z-50 flex h-[76px] w-full items-center border-b border-[#DFD8CE] bg-[#F5EFEB]/95 px-5 backdrop-blur-md sm:px-8 md:px-[6.5%] shadow-[0_4px_20px_rgba(111,78,55,0.06)] transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
      }`}
    >

      {/* =====================================================
          DESKTOP LOGO
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          navigateTo("/")
        }
        aria-label="GETSUKA Home"
        className="text-[21px] font-bold leading-none tracking-[0.28em] text-[#6F4E37] transition hover:text-[#5B3F2C] sm:text-[23px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded"
      >
        GETSUKA
      </button>

      {/* =====================================================
          DESKTOP NAVIGATION
      ===================================================== */}

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex lg:gap-12" aria-label="Main Navigation">

        {/* HOME */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/")
          }
          className="relative whitespace-nowrap text-[12px] font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded py-1"
        >
          HOME
        </button>

        {/* SHOP */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/shop")
          }
          className="relative whitespace-nowrap text-[12px] font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded py-1"
        >
          SHOP
        </button>

        {/* PHILOSOPHY */}

        <button
          type="button"
          onClick={() => {
            closeMenu();
            if (location.pathname === "/") {
              const el = document.getElementById("philosophy");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                return;
              }
            }
            navigate("/#philosophy");
          }}
          className="relative whitespace-nowrap text-[12px] font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded py-1"
        >
          PHILOSOPHY
        </button>

      </nav>

      {/* =====================================================
          DESKTOP RIGHT SIDE
      ===================================================== */}

      <div className="ml-auto hidden items-center gap-6 md:flex lg:gap-8">

        {/* =================================================
            WISHLIST
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/wishlist")
          }
          aria-label={`Wishlist, ${wishlistCount} items`}
          className="group flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold tracking-[0.14em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded py-1"
        >
          <span>
            WISHLIST
          </span>

          <span
            className={`
              flex
              h-[19px]
              min-w-[19px]
              items-center
              justify-center
              rounded-full
              bg-[#E6E0F0]
              border
              border-[#CDC4DF]
              px-1.5
              text-[10px]
              font-bold
              leading-none
              text-[#6F4E37]
              transition-all
              duration-200
              ${
                wishlistCount > 0
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-70"
              }
            `}
          >
            {wishlistCount}
          </span>
          <span className="sr-only">items in wishlist</span>
        </button>

        {/* =================================================
            CART
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/cart")
          }
          aria-label={`Cart, ${cartCount} items`}
          className="group flex items-center gap-2 whitespace-nowrap text-[12px] font-semibold tracking-[0.14em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded py-1"
        >
          <span>
            CART
          </span>

          <span
            className={`
              flex
              h-[19px]
              min-w-[19px]
              items-center
              justify-center
              rounded-full
              bg-[#6F4E37]
              border
              border-[#5B3F2C]
              px-1.5
              text-[10px]
              font-bold
              leading-none
              text-white
              transition-all
              duration-200
              ${
                cartCount > 0
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-70"
              }
            `}
          >
            {cartCount}
          </span>
          <span className="sr-only">items in cart</span>
        </button>

        {/* =================================================
            USER PROFILE
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/account")
          }
          className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#DFD8CE] bg-[#6F4E37] text-white shadow-xs transition hover:border-[#6F4E37] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
          aria-label="Account profile"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold tracking-wider text-white">
              {profileInitial}
            </span>
          )}
        </button>

      </div>

      {/* =====================================================
          MOBILE MENU BUTTON
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          setMenuOpen(
            (prev) => !prev
          )
        }
        className="ml-auto flex h-10 w-10 items-center justify-center text-[#4A3D36] hover:text-[#6F4E37] transition md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded"
        aria-label={
          menuOpen
            ? "Close menu"
            : "Open menu"
        }
        aria-expanded={menuOpen}
        aria-controls="user-mobile-menu"
      >
        {menuOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
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
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7h16M4 12h16M4 17h16"
            />
          </svg>
        )}
      </button>

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      {menuOpen && (
        <div id="user-mobile-menu" className="absolute left-0 top-[76px] w-full border-b border-[#DFD8CE] bg-[#F5EFEB] shadow-2xl md:hidden">

          <nav className="flex flex-col px-6 py-5" aria-label="Mobile Navigation">

            {/* HOME */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/")
              }
              className="w-full border-b border-[#E8E1D7] py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37]"
            >
              HOME
            </button>

            {/* SHOP */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/shop")
              }
              className="w-full border-b border-[#E8E1D7] py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37]"
            >
              SHOP
            </button>

            {/* PHILOSOPHY */}

            <button
              type="button"
              onClick={() => {
                closeMenu();
                if (location.pathname === "/") {
                  const el = document.getElementById("philosophy");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                    return;
                  }
                }
                navigate("/#philosophy");
              }}
              className="w-full border-b border-[#E8E1D7] py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37]"
            >
              PHILOSOPHY
            </button>

            {/* =================================================
                WISHLIST
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/wishlist")
              }
              aria-label={`Wishlist, ${wishlistCount} items`}
              className="flex w-full items-center justify-between border-b border-[#E8E1D7] py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] rounded"
            >
              <span>
                WISHLIST
              </span>

              <span
                className="
                  flex
                  h-[22px]
                  min-w-[22px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#E6E0F0]
                  border
                  border-[#CDC4DF]
                  px-2
                  text-[10px]
                  font-bold
                  leading-none
                  text-[#6F4E37]
                "
              >
                {wishlistCount}
              </span>
              <span className="sr-only">items in wishlist</span>
            </button>

            {/* =================================================
                CART
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/cart")
              }
              className="flex w-full items-center justify-between border-b border-[#E8E1D7] py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37]"
            >
              <span>
                CART
              </span>

              <span
                className="
                  flex
                  h-[22px]
                  min-w-[22px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#FAF9F7]
                  border
                  border-[#DFD8CE]
                  px-2
                  text-[10px]
                  font-bold
                  leading-none
                  text-[#6F4E37]
                "
              >
                {cartCount}
              </span>
            </button>

            {/* ACCOUNT */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/account")
              }
              className="flex w-full items-center gap-4 py-4 text-left text-xs font-semibold tracking-[0.16em] text-[#4A3D36] transition hover:text-[#6F4E37]"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DFD8CE] bg-[#6F4E37] text-white">

                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {profileInitial}
                  </span>
                )}

              </span>

              <span>
                ACCOUNT
              </span>

            </button>

          </nav>

        </div>
      )}

    </header>
  );
};

export default UserNavbar;