import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import productApi from "../api/productApi";
import categoryApi from "../../categories/api/categoryApi";
import wishlistApi from "../../wishlists/api/wishlistApi";

const ANIME_OPTIONS = [
  "One Piece",
  "Jujutsu Kaisen",
  "Demon Slayer",
  "Attack on Titan",
  "Naruto",
  "Bleach",
  "Dragon Ball",
  "My Hero Academia",
  "Chainsaw Man",
  "Hunter x Hunter",
];

const SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
];

const ProductListingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialAnime = searchParams.get("anime") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState([]);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);

  const [category, setCategory] = useState(initialCategory);
  const [anime, setAnime] = useState(initialAnime);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProducts: 0,
    perPage: 12,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Sync with URL query parameters (e.g. from Shop by Anime click on Home)
  useEffect(() => {
    const paramAnime = searchParams.get("anime") || "";
    if (paramAnime !== anime) {
      setAnime(paramAnime);
      setPage(1);
    }
    const paramCategory = searchParams.get("category") || "";
    if (paramCategory !== category) {
      setCategory(paramCategory);
      setPage(1);
    }
    const paramSearch = searchParams.get("search") || "";
    if (paramSearch !== search) {
      setSearch(paramSearch);
      setSearchInput(paramSearch);
      setPage(1);
    }
  }, [searchParams]);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // =========================================================
  // WISHLIST
  // =========================================================

  const [wishlistIds, setWishlistIds] = useState(
    new Set()
  );

  const [wishlistLoadingIds, setWishlistLoadingIds] =
    useState(new Set());

  const [notification, setNotification] = useState(null);

  const showNotification = (title, message, type = "error") => {
    setNotification({ title, message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);

      const response =
        await categoryApi.getCategories();

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load categories."
        );
      }

      setCategories(
        Array.isArray(response.categories)
          ? response.categories
          : []
      );
    } catch (err) {
      console.error(
        "SHOP CATEGORY LOAD ERROR:",
        err
      );

      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // =========================================================
  // LOAD WISHLIST
  // =========================================================

  const loadWishlist = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setWishlistIds(new Set());
      return;
    }

    try {
      const response =
        await wishlistApi.getWishlist();

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load wishlist."
        );
      }

      const ids = Array.isArray(response.wishlist)
        ? response.wishlist
            .map((item) => item?.product?._id)
            .filter(Boolean)
        : [];

      setWishlistIds(new Set(ids));
    } catch (err) {
      console.error(
        "SHOP WISHLIST LOAD ERROR:",
        err
      );

      setWishlistIds(new Set());
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  // =========================================================
  // WISHLIST TOGGLE
  // =========================================================

  const handleWishlistToggle = async (
    event,
    productId
  ) => {
    event.stopPropagation();

    if (!productId) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (wishlistLoadingIds.has(productId)) {
      return;
    }

    const alreadyWishlisted =
      wishlistIds.has(productId);

    const previousWishlistIds = new Set(wishlistIds);

    // Optimistic instant UI update
    const updatedWishlistIds = new Set(wishlistIds);
    if (alreadyWishlisted) {
      updatedWishlistIds.delete(productId);
    } else {
      updatedWishlistIds.add(productId);
    }
    setWishlistIds(updatedWishlistIds);

    // Instant badge synchronization across navbar
    window.dispatchEvent(
      new CustomEvent("wishlistUpdated", {
        detail: { count: updatedWishlistIds.size },
      })
    );

    setWishlistLoadingIds((previous) => {
      const next = new Set(previous);
      next.add(productId);
      return next;
    });

    try {
      if (alreadyWishlisted) {
        const response =
          await wishlistApi.removeFromWishlist(
            productId
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Failed to remove product from wishlist."
          );
        }
      } else {
        const response =
          await wishlistApi.addToWishlist(
            productId
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Failed to add product to wishlist."
          );
        }
      }
    } catch (err) {
      console.error(
        "WISHLIST TOGGLE ERROR:",
        err
      );

      // Revert optimistic update on failure
      setWishlistIds(previousWishlistIds);
      window.dispatchEvent(
        new CustomEvent("wishlistUpdated", {
          detail: { count: previousWishlistIds.size },
        })
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to update wishlist.";

      showNotification("WISHLIST", message, "error");
    } finally {
      setWishlistLoadingIds((previous) => {
        const next = new Set(previous);
        next.delete(productId);
        return next;
      });
    }
  };

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await productApi.getProducts({
          search,
          category,
          anime,
          minPrice,
          maxPrice,
          size,
          color,
          sort,
          page,
          limit: 12,
        });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load products."
        );
      }

      setProducts(
        Array.isArray(response.products)
          ? response.products
          : []
      );

      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalProducts: 0,
          perPage: 12,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } catch (err) {
      console.error(
        "SHOP PRODUCT LOAD ERROR:",
        err
      );

      setProducts([]);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [
    search,
    category,
    anime,
    size,
    color,
    minPrice,
    maxPrice,
    sort,
    page,
  ]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
  };

  // =========================================================
  // CATEGORY
  // =========================================================

  const handleCategoryChange = (value) => {
    setPage(1);

    setCategory(value);
  };

  // =========================================================
  // ANIME
  // =========================================================

  const handleAnimeChange = (value) => {
    setPage(1);

    setAnime((previous) =>
      previous === value ? "" : value
    );
  };

  // =========================================================
  // SIZE
  // =========================================================

  const handleSizeChange = (value) => {
    setPage(1);

    setSize((previous) =>
      previous === value ? "" : value
    );
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategory("");
    setAnime("");
    setSize("");
    setColor("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setPage(1);
  };

  // =========================================================
  // AVAILABLE COLORS
  // =========================================================

  const availableColors = useMemo(() => {
    const colors = products.flatMap(
      (product) => product.colors || []
    );

    return [...new Set(colors)].filter(Boolean);
  }, [products]);

  // =========================================================
  // DISCOUNT
  // =========================================================

  const getDiscountPercentage = (product) => {
    if (
      product.salePrice === null ||
      product.salePrice === undefined ||
      Number(product.salePrice) >=
        Number(product.price)
    ) {
      return 0;
    }

    if (Number(product.price) <= 0) {
      return 0;
    }

    return Math.round(
      ((Number(product.price) -
        Number(product.salePrice)) /
        Number(product.price)) *
        100
    );
  };

  // =========================================================
  // IMAGE
  // =========================================================

  const getProductImage = (product) => {
    if (
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    return "";
  };

  // =========================================================
  // PRODUCT DETAILS NAVIGATION
  // =========================================================

  const openProductDetails = (productId) => {
    if (!productId) {
      return;
    }

    navigate(`/products/${productId}`);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-[#F4F0F7] text-[#252321] relative">

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-fade-in">
          <div className="flex items-start gap-4 rounded-md border border-[#E5E4E2] bg-white p-4 shadow-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6E0F0] text-sm font-bold text-[#6F4E37]">
              !
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                {notification.title}
              </p>
              <p className="mt-1 text-xs text-[#716C67]">
                {notification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-[#716C67] hover:text-[#252321] text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="border-b border-[#E5E4E2] bg-white">
        <div className="mx-auto max-w-[1500px] px-6 pb-12 pt-12 md:px-10 lg:px-14">

          <div className="text-center">

            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
              GETSUKA ATELIER
            </p>

            <h1 className="mt-3 text-4xl font-normal font-serif uppercase tracking-tight text-[#252321] md:text-6xl">
              SHOP ALL
            </h1>

            <p className="mx-auto mt-4 max-w-[620px] text-xs leading-relaxed text-[#716C67]">
              Explore the complete GETSUKA catalog. Luxury anime streetwear silhouettes,
              licensed art graphics, and heavyweight Japanese cottons.
            </p>

            <div className="mx-auto mt-6 inline-flex rounded border border-[#E5E4E2] bg-[#FAF9F7] px-5 py-2 text-[10px] font-bold tracking-[0.18em] text-[#6F4E37]">
              {pagination.totalProducts} ITEMS AVAILABLE
            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          CATEGORY DROPDOWN + SEARCH + SORT
          ===================================================== */}

      <section className="border-b border-[#E5E4E2] bg-[#FAF9F7]">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-6 py-5 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">

          {/* CATEGORY SELECTOR */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="category-filter"
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#716C67]"
            >
              CATEGORY:
            </label>

            <select
              id="category-filter"
              value={category}
              onChange={(event) =>
                handleCategoryChange(
                  event.target.value
                )
              }
              disabled={categoriesLoading}
              className="h-10 rounded-md border border-[#E5E4E2] bg-white px-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#252321] outline-none transition focus:border-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
            >

              <option
                value=""
                className="bg-white text-[#252321]"
              >
                {categoriesLoading
                  ? "LOADING CATEGORIES..."
                  : "ALL CATEGORIES"}
              </option>

              {categories.map((item) => (
                <option
                  key={item._id}
                  value={item._id}
                  className="bg-white text-[#252321]"
                >
                  {item.name}
                </option>
              ))}

            </select>
          </div>

          {/* SEARCH */}

          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full max-w-[420px] items-center gap-3 border-b-2 border-[#D8D3CF] pb-2 focus-within:border-[#6F4E37]"
          >
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>

            <span className="text-base text-[#716C67]" aria-hidden="true">
              ⌕
            </span>

            <input
              id="shop-search"
              type="text"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              placeholder="SEARCH PRODUCTS..."
              className="w-full bg-transparent text-xs uppercase tracking-[0.1em] text-[#252321] outline-none placeholder:text-[#716C67]"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="text-lg text-[#716C67] transition hover:text-[#6F4E37]"
              >
                ×
              </button>
            )}

          </form>

          {/* SORT */}

          <div className="flex items-center gap-3">

            <label htmlFor="shop-sort" className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#716C67]">
              SORT BY:
            </label>

            <select
              id="shop-sort"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-[#E5E4E2] bg-white px-3 text-xs font-semibold uppercase text-[#252321] outline-none transition focus:border-[#6F4E37] shadow-xs"
            >

              <option value="newest">
                FEATURED
              </option>

              <option value="price-low">
                PRICE LOW TO HIGH
              </option>

              <option value="price-high">
                PRICE HIGH TO LOW
              </option>

              <option value="a-z">
                A-Z
              </option>

              <option value="z-a">
                Z-A
              </option>

            </select>

          </div>

        </div>

      </section>

      {/* =====================================================
          SHOP CONTENT
          ===================================================== */}

      <main className="mx-auto max-w-[1500px] px-6 py-10 md:px-10 lg:px-14">

        {/* MOBILE FILTER BUTTON */}

        <div className="mb-8 flex items-center justify-between lg:hidden">

          <button
            type="button"
            onClick={() =>
              setShowMobileFilters(
                (previous) => !previous
              )
            }
            className="rounded bg-[#6F4E37] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-xs transition hover:bg-[#5B3F2C]"
          >
            {showMobileFilters
              ? "HIDE FILTERS"
              : "SHOW FILTERS"}
          </button>

          <span className="text-[10px] font-semibold uppercase text-[#716C67]">
            {pagination.totalProducts} ITEMS
          </span>

        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">

          {/* =================================================
              FILTER SIDEBAR
              ================================================= */}

          <aside
            className={`${
              showMobileFilters
                ? "block"
                : "hidden"
            } lg:block rounded-md border border-[#E5E4E2] bg-white p-6 shadow-xs`}
          >

            <div className="border-b border-[#E5E4E2] pb-4">

              <div className="flex items-center justify-between">

                <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#252321]">
                  FILTERS
                </h2>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[10px] font-semibold text-[#6F4E37] underline underline-offset-4 transition hover:text-[#5B3F2C]"
                >
                  Clear All
                </button>

              </div>

            </div>

            {/* ANIME */}

            <div className="mt-7">

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#252321]">
                ANIME SERIES
              </p>

              <div className="mt-4 space-y-3">

                {ANIME_OPTIONS.map(
                  (animeName) => (
                    <label
                      key={animeName}
                      className="flex cursor-pointer items-center gap-3 text-xs"
                    >

                      <input
                        type="checkbox"
                        checked={
                          anime === animeName
                        }
                        onChange={() =>
                          handleAnimeChange(
                            animeName
                          )
                        }
                        className="h-4 w-4 rounded border-[#D8D3CF] text-[#6F4E37] accent-[#6F4E37]"
                      />

                      <span className={`text-xs transition ${
                        anime === animeName
                          ? "font-bold text-[#6F4E37]"
                          : "text-[#716C67] hover:text-[#252321]"
                      }`}>
                        {animeName}
                      </span>

                    </label>
                  )
                )}

              </div>

            </div>

            {/* SIZE */}

            <div className="mt-8 border-t border-[#E5E4E2] pt-6">

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#252321]">
                SIZE
              </p>

              <div className="mt-3.5 flex flex-wrap gap-2">

                {SIZE_OPTIONS.map(
                  (sizeOption) => {
                    const active =
                      size === sizeOption;

                    return (
                      <button
                        key={sizeOption}
                        type="button"
                        onClick={() =>
                          handleSizeChange(
                            sizeOption
                          )
                        }
                        className={`h-8 min-w-8 rounded px-2.5 text-[10px] font-bold uppercase transition ${
                          active
                            ? "bg-[#6F4E37] text-white shadow-xs"
                            : "border border-[#E5E4E2] bg-[#FAF9F7] text-[#716C67] hover:border-[#6F4E37] hover:text-[#6F4E37]"
                        }`}
                      >
                        {sizeOption}
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            {/* COLOR */}

            <div className="mt-8 border-t border-[#E5E4E2] pt-6">

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#252321]">
                COLOR
              </p>

              <label htmlFor="shop-color" className="sr-only">
                Filter by color
              </label>

              <select
                id="shop-color"
                value={color}
                onChange={(event) => {
                  setColor(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="mt-3 h-10 w-full rounded border border-[#E5E4E2] bg-[#FAF9F7] px-3 text-xs font-semibold text-[#252321] outline-none focus:border-[#6F4E37]"
              >

                <option
                  value=""
                  className="bg-white text-[#252321]"
                >
                  ALL COLORS
                </option>

                {availableColors.map(
                  (colorName) => (
                    <option
                      key={colorName}
                      value={colorName}
                      className="bg-white text-[#252321]"
                    >
                      {colorName}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* PRICE */}

            <div className="mt-8 border-t border-[#E5E4E2] pt-6">

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#252321]">
                PRICE RANGE
              </p>

              <div className="mt-3.5 flex gap-2">

                <input
                  id="shop-min-price"
                  type="number"
                  min="0"
                  aria-label="Minimum price in rupees"
                  value={minPrice}
                  onChange={(event) => {
                    setMinPrice(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="₹ MIN"
                  className="h-10 w-full rounded border border-[#E5E4E2] bg-[#FAF9F7] px-3 text-xs text-[#252321] outline-none placeholder:text-[#716C67] focus:border-[#6F4E37]"
                />

                <input
                  id="shop-max-price"
                  type="number"
                  min="0"
                  aria-label="Maximum price in rupees"
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="₹ MAX"
                  className="h-10 w-full rounded border border-[#E5E4E2] bg-[#FAF9F7] px-3 text-xs text-[#252321] outline-none placeholder:text-[#716C67] focus:border-[#6F4E37]"
                />

              </div>

            </div>

          </aside>

          {/* =================================================
              PRODUCTS
              ================================================= */}

          <section>

            {/* LOADING */}

            {loading && (
              <div className="flex min-h-[450px] items-center justify-center rounded-md border border-[#E5E4E2] bg-white">

                <div className="text-center">

                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D8D3CF] border-t-[#6F4E37]" />

                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#716C67]">
                    Loading products...
                  </p>

                </div>

              </div>
            )}

            {/* ERROR */}

            {!loading && error && (
              <div className="rounded-md border border-[#E5E4E2] bg-white p-12 text-center shadow-xs">

                <p className="text-base font-bold uppercase text-[#252321]">
                  Unable To Load Products
                </p>

                <p className="mt-2 text-xs text-[#716C67]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadProducts}
                  className="mt-6 rounded bg-[#6F4E37] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#5B3F2C]"
                >
                  TRY AGAIN
                </button>

              </div>
            )}

            {/* EMPTY */}

            {!loading &&
              !error &&
              products.length === 0 && (
                <div className="flex min-h-[450px] items-center justify-center rounded-md border border-[#E5E4E2] bg-white p-8">

                  <div className="text-center">

                    <p className="text-lg font-bold font-serif uppercase text-[#252321]">
                      No Products Found
                    </p>

                    <p className="mt-2 text-xs text-[#716C67]">
                      Try clearing or adjusting your filter criteria.
                    </p>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 rounded bg-[#6F4E37] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#5B3F2C]"
                    >
                      CLEAR FILTERS
                    </button>

                  </div>

                </div>
              )}

            {/* PRODUCT GRID */}

            {!loading &&
              !error &&
              products.length > 0 && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 md:gap-6">

                  {products.map((product) => {
                    const image =
                      getProductImage(product);

                    const discount =
                      getDiscountPercentage(
                        product
                      );

                    const finalPrice =
                      product.finalPrice ??
                      product.price;

                    const outOfStock =
                      product.stockStatus ===
                      "OUT_OF_STOCK";

                    const isWishlisted =
                      wishlistIds.has(
                        product._id
                      );

                    const isWishlistLoading =
                      wishlistLoadingIds.has(
                        product._id
                      );

                    return (
                      <article
                        key={product._id}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${product.name}, price ${finalPrice} rupees`}
                        className="group cursor-pointer rounded-[20px] border border-transparent bg-white p-3 transition-all duration-300 hover:border-[#E5E4E2] hover:shadow-[0_16px_35px_rgba(111,78,55,0.08)] hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
                        onClick={() =>
                          openProductDetails(
                            product._id
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProductDetails(product._id);
                          }
                        }}
                      >

                        {/* IMAGE */}

                        <div className="relative aspect-[0.78] overflow-hidden rounded-[16px] bg-[#F4F0F7]">

                          {image ? (
                            <>
                              <img
                                src={image}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                className={`h-full w-full object-cover transition-all duration-500 ease-out ${
                                  product.images?.[1]
                                    ? "group-hover:opacity-0"
                                    : "group-hover:scale-105"
                                }`}
                              />
                              {product.images?.[1] && (
                                <img
                                  src={product.images[1]}
                                  alt={`${product.name} alternate view`}
                                  loading="lazy"
                                  decoding="async"
                                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-500 ease-out group-hover:opacity-100 group-hover:scale-105"
                                />
                              )}
                            </>
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-[#716C67]">
                              No Image
                            </div>
                          )}

                          {/* PALE LAVENDER SALE BADGE */}

                          {discount > 0 && (
                            <span className="absolute left-2.5 top-2.5 rounded-full border border-[#CDC4DF] bg-[#E6E0F0] px-2.5 py-0.5 text-[8px] font-bold text-[#6F4E37] shadow-xs">
                              -{discount}%
                            </span>
                          )}

                          {/* WISHLIST BUTTON */}

                          <button
                            type="button"
                            aria-label={
                              isWishlisted
                                ? `Remove ${product.name} from wishlist`
                                : `Add ${product.name} to wishlist`
                            }
                            disabled={
                              isWishlistLoading
                            }
                            onClick={(event) =>
                              handleWishlistToggle(
                                event,
                                product._id
                              )
                            }
                            className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-sm shadow-xs transition-all focus:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] ${
                              isWishlistLoading
                                ? "cursor-wait bg-[#E5E4E2] text-[#716C67] opacity-100"
                                : isWishlisted
                                ? "bg-[#6F4E37] text-white opacity-100"
                                : "bg-white/90 text-[#252321] opacity-0 group-hover:opacity-100 hover:bg-[#E6E0F0] hover:text-[#6F4E37]"
                            }`}
                          >
                            {isWishlistLoading
                              ? "..."
                              : isWishlisted
                              ? "♥"
                              : "♡"}
                          </button>

                          {/* FLOATING VIEW DETAILS PILL ON HOVER (MATCHING AJAX LUXURY REFERENCE) */}
                          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center opacity-0 transition-all duration-300 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                            <span className="w-full text-center rounded-full bg-white/95 backdrop-blur-sm py-2 px-4 text-[10px] font-bold tracking-[0.16em] uppercase text-[#252321] shadow-md">
                              VIEW DETAILS
                            </span>
                          </div>

                          {/* OUT OF STOCK */}

                          {outOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#211B18]/65">

                              <span className="rounded-full bg-white px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#252321] shadow-xs">
                                OUT OF STOCK
                              </span>

                            </div>
                          )}

                        </div>

                        {/* DETAILS */}

                        <div className="pt-3 px-1 pb-1">

                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6F4E37]">
                            {product.anime}
                          </p>

                          <h3 className="mt-1 text-xs font-semibold uppercase leading-tight text-[#252321] transition group-hover:text-[#6F4E37] truncate">
                            {product.name}
                          </h3>

                          <p className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-[#716C67]">
                            {product.category?.name ||
                              "T-Shirts"}
                          </p>

                          <div className="mt-2.5 flex items-center gap-2">

                            <span className="text-xs font-bold text-[#252321]">
                              ₹
                              {Number(
                                finalPrice
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                            {discount > 0 && (
                              <span className="text-[10px] text-[#716C67] line-through">
                                ₹
                                {Number(
                                  product.price
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </span>
                            )}

                          </div>

                          {product.stockStatus ===
                            "LOW_STOCK" && (
                            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#6F4E37]">
                              Low stock
                            </p>
                          )}

                        </div>

                      </article>
                    );
                  })}

                </div>
              )}

            {/* =================================================
                PAGINATION
                ================================================= */}

            {!loading &&
              !error &&
              pagination.totalPages > 0 && (
                <nav className="mt-16 flex items-center justify-center gap-2" aria-label="Pagination">

                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          previous - 1
                      )
                    }
                    className="flex h-9 min-w-9 items-center justify-center rounded border border-[#E5E4E2] bg-white text-xs font-bold text-[#252321] transition hover:border-[#6F4E37] hover:text-[#6F4E37] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
                  >
                    ←
                  </button>

                  {Array.from(
                    {
                      length:
                        pagination.totalPages,
                    },
                    (_, index) =>
                      index + 1
                  )
                    .slice(0, 7)
                    .map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        aria-label={`Page ${pageNumber}`}
                        aria-current={page === pageNumber ? "page" : undefined}
                        onClick={() =>
                          setPage(
                            pageNumber
                          )
                        }
                        className={`flex h-9 min-w-9 items-center justify-center rounded text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] ${
                          page === pageNumber
                            ? "bg-[#6F4E37] text-white shadow-xs"
                            : "border border-[#E5E4E2] bg-white text-[#716C67] hover:border-[#6F4E37] hover:text-[#6F4E37]"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          previous + 1
                      )
                    }
                    className="flex h-9 min-w-9 items-center justify-center rounded border border-[#E5E4E2] bg-white text-xs font-bold text-[#252321] transition hover:border-[#6F4E37] hover:text-[#6F4E37] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
                  >
                    →
                  </button>

                </nav>
              )}

          </section>

        </div>

      </main>

    </div>
  );
};

export default ProductListingPage;