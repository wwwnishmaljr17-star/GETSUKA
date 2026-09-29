import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUserProfile } from "../../features/user-side/account/api/userProfileApi";
import wishlistApi from "../../features/user-side/wishlists/api/wishlistApi";

const CART_KEY = "getsukaCart";

const UserNavbar = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

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

      /*
       * Count UNIQUE product + variant combinations.
       *
       * Example:
       *
       * Luffy Small x 3
       * = 1
       *
       * Luffy Small x 3
       * Luffy Medium x 1
       * = 2
       */

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
        const token =
          sessionStorage.getItem("token") ||
          localStorage.getItem("token");

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

          if (
            sessionStorage.getItem(
              "token"
            )
          ) {
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
      sessionStorage.getItem("user") ||
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

    const handleWishlistUpdated =
      () => {
        loadWishlistCount();
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

  const navigateTo = (path) => {
    closeMenu();
    navigate(path);
  };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <header className="relative z-50 flex h-[78px] w-full items-center border-b border-white/10 bg-black px-5 sm:px-8 md:px-[6.5%]">

      {/* =====================================================
          DESKTOP LOGO
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          navigateTo("/")
        }
        className="text-[22px] font-semibold leading-none tracking-[0.28em] text-white sm:text-[25px]"
      >
        GETSUKA
      </button>

      {/* =====================================================
          DESKTOP NAVIGATION
      ===================================================== */}

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex lg:gap-11">

        {/* HOME */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/")
          }
          className="whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          HOME
        </button>

        {/* SHOP */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/shop")
          }
          className="whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          SHOP
        </button>

        {/* NEW ARRIVALS */}

        <button
          type="button"
          onClick={() =>
            navigateTo(
              "/new-arrivals"
            )
          }
          className="whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          NEW ARRIVALS
        </button>

        {/* SHOP BY ANIME */}

        <button
          type="button"
          onClick={() =>
            navigateTo(
              "/shop-by-anime"
            )
          }
          className="whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          SHOP BY ANIME
        </button>

      </nav>

      {/* =====================================================
          DESKTOP RIGHT SIDE
      ===================================================== */}

      <div className="ml-auto hidden items-center gap-5 md:flex lg:gap-7">

        {/* SEARCH */}

        <button
          type="button"
          onClick={() => {
            // Search functionality later
          }}
          className="whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          SEARCH
        </button>

        {/* =================================================
            WISHLIST
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/wishlist")
          }
          className="flex items-center gap-1.5 whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          <span>
            WISHLIST
          </span>

          <span
            className={`
              flex
              h-[18px]
              min-w-[18px]
              items-center
              justify-center
              rounded-full
              bg-white
              px-1
              text-[10px]
              font-semibold
              leading-none
              text-black
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
        </button>

        {/* =================================================
            CART
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/cart")
          }
          className="flex items-center gap-1.5 whitespace-nowrap text-[13px] tracking-wide text-white transition hover:text-gray-400"
        >
          <span>
            CART
          </span>

          <span
            className={`
              flex
              h-[18px]
              min-w-[18px]
              items-center
              justify-center
              rounded-full
              bg-white
              px-1
              text-[10px]
              font-semibold
              leading-none
              text-black
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
        </button>

        {/* =================================================
            USER PROFILE
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigateTo("/account")
          }
          className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white transition hover:opacity-80"
          aria-label="Account"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-black">
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
        className="ml-auto flex h-10 w-10 items-center justify-center text-white md:hidden"
        aria-label={
          menuOpen
            ? "Close menu"
            : "Open menu"
        }
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
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
            className="h-7 w-7"
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

      {/* =====================================================
          MOBILE MENU
      ===================================================== */}

      {menuOpen && (
        <div className="absolute left-0 top-[78px] w-full border-b border-white/10 bg-black shadow-2xl md:hidden">

          <nav className="flex flex-col px-6 py-5">

            {/* HOME */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/")
              }
              className="w-full border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
            >
              HOME
            </button>

            {/* SHOP */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/shop")
              }
              className="w-full border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
            >
              SHOP
            </button>

            {/* NEW ARRIVALS */}

            <button
              type="button"
              onClick={() =>
                navigateTo(
                  "/new-arrivals"
                )
              }
              className="w-full border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
            >
              NEW ARRIVALS
            </button>

            {/* SHOP BY ANIME */}

            <button
              type="button"
              onClick={() =>
                navigateTo(
                  "/shop-by-anime"
                )
              }
              className="w-full border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
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
              className="w-full border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
            >
              SEARCH
            </button>

            {/* =================================================
                WISHLIST
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                navigateTo(
                  "/wishlist"
                )
              }
              className="flex w-full items-center justify-between border-b border-white/10 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
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
                  bg-white
                  px-1.5
                  text-[10px]
                  font-semibold
                  leading-none
                  text-black
                "
              >
                {wishlistCount}
              </span>
            </button>

            {/* =================================================
                CART
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                navigateTo("/cart")
              }
              className="flex w-full items-center justify-between border-b border-white/10 py-4 text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
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
                  bg-white
                  px-1.5
                  text-[10px]
                  font-semibold
                  leading-none
                  text-black
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
              className="flex w-full items-center gap-4 py-4 text-left text-sm tracking-[0.15em] text-white transition hover:text-gray-400"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">

                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-black">
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