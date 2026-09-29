import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const [products, setProducts] = useState([]);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [category, setCategory] = useState("");
  const [anime, setAnime] = useState("");
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

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // =========================================================
  // WISHLIST
  // =========================================================

  const [wishlistIds, setWishlistIds] = useState(
    new Set()
  );

  const [wishlistLoadingIds, setWishlistLoadingIds] =
    useState(new Set());

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
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token");

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

    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (wishlistLoadingIds.has(productId)) {
      return;
    }

    const alreadyWishlisted =
      wishlistIds.has(productId);

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

        setWishlistIds((previous) => {
          const next = new Set(previous);
          next.delete(productId);
          return next;
        });
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

        setWishlistIds((previous) => {
          const next = new Set(previous);
          next.add(productId);
          return next;
        });
      }
    } catch (err) {
      console.error(
        "WISHLIST TOGGLE ERROR:",
        err
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to update wishlist.";

      window.alert(message);
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
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="border-b border-[#222] bg-black">
        <div className="mx-auto max-w-[1500px] px-6 pb-14 pt-14 md:px-10 lg:px-14">

          <div className="text-center">

            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#e9002d]">
              GETSUKA COLLECTION
            </p>

            <h1 className="mt-5 text-5xl font-bold uppercase tracking-[-0.05em] text-white md:text-7xl">
              SHOP ALL
            </h1>

            <p className="mx-auto mt-6 max-w-[650px] text-sm leading-6 text-[#999]">
              Explore the complete GETSUKA collection.
              High-fashion silhouettes meet with curated
              anime aesthetics for the modern otaku.
            </p>

            <div className="mx-auto mt-8 inline-flex border border-[#333] bg-black px-6 py-3 text-[10px] font-bold tracking-[0.18em] text-white">
              {pagination.totalProducts} PRODUCTS
            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          CATEGORY DROPDOWN
          ===================================================== */}

      <section className="border-b border-[#222] bg-black">

        <div className="mx-auto max-w-[1500px] px-6 py-6 md:px-10 lg:px-14">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <label
              htmlFor="category-filter"
              className="text-[10px] font-bold uppercase tracking-[0.14em] text-white"
            >
              CATEGORY
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
              className="h-12 w-full max-w-[320px] border border-[#333] bg-black px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-white outline-none transition focus:border-[#e9002d] disabled:cursor-not-allowed disabled:opacity-60"
            >

              <option
                value=""
                className="bg-black text-white"
              >
                {categoriesLoading
                  ? "LOADING CATEGORIES..."
                  : "ALL CATEGORIES"}
              </option>

              {categories.map((item) => (
                <option
                  key={item._id}
                  value={item._id}
                  className="bg-black text-white"
                >
                  {item.name}
                </option>
              ))}

            </select>

          </div>

        </div>

      </section>

      {/* =====================================================
          SEARCH + SORT
          ===================================================== */}

      <section className="border-b border-[#222] bg-black">

        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-6 py-6 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">

          {/* SEARCH */}

          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full max-w-[500px] items-center gap-4 border-b-2 border-[#555] pb-3 focus-within:border-[#e9002d]"
          >

            <span className="text-xl text-[#777]">
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
              className="w-full bg-transparent text-sm uppercase tracking-[0.08em] text-white outline-none placeholder:text-[#666]"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="text-xl text-[#777] transition hover:text-[#e9002d]"
              >
                ×
              </button>
            )}

          </form>

          {/* SORT */}

          <div className="flex items-center gap-3">

            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777]">
              SORT BY:
            </span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="min-w-[180px] border-b-2 border-[#555] bg-black py-2 text-[10px] font-bold uppercase text-white outline-none focus:border-[#e9002d]"
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

      <main className="mx-auto max-w-[1500px] px-6 py-12 md:px-10 lg:px-14">

        {/* MOBILE FILTER BUTTON */}

        <div className="mb-8 flex items-center justify-between lg:hidden">

          <button
            type="button"
            onClick={() =>
              setShowMobileFilters(
                (previous) => !previous
              )
            }
            className="bg-[#e9002d] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
          >
            {showMobileFilters
              ? "HIDE FILTERS"
              : "SHOW FILTERS"}
          </button>

          <span className="text-[10px] font-semibold uppercase text-[#777]">
            {pagination.totalProducts} ITEMS
          </span>

        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[240px_1fr]">

          {/* =================================================
              FILTER SIDEBAR
              ================================================= */}

          <aside
            className={`${
              showMobileFilters
                ? "block"
                : "hidden"
            } lg:block`}
          >

            <div className="border-b border-[#333] pb-5">

              <div className="flex items-center justify-between">

                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-white">
                  FILTERS
                </h2>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[10px] font-medium text-[#999] underline underline-offset-4 transition hover:text-[#e9002d]"
                >
                  Clear All
                </button>

              </div>

            </div>

            {/* ANIME */}

            <div className="mt-9">

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                ANIME SERIES
              </p>

              <div className="mt-5 space-y-4">

                {ANIME_OPTIONS.map(
                  (animeName) => (
                    <label
                      key={animeName}
                      className="flex cursor-pointer items-center gap-3"
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
                        className="h-4 w-4 accent-[#e9002d]"
                      />

                      <span className="text-sm text-[#999] transition hover:text-white">
                        {animeName}
                      </span>

                    </label>
                  )
                )}

              </div>

            </div>

            {/* SIZE */}

            <div className="mt-10">

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                SIZE
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

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
                        className={`h-9 min-w-9 px-2 text-[10px] font-bold transition ${
                          active
                            ? "bg-[#e9002d] text-white"
                            : "border border-[#333] bg-[#111] text-[#aaa] hover:border-[#e9002d] hover:text-white"
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

            <div className="mt-10">

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                COLOR
              </p>

              <select
                value={color}
                onChange={(event) => {
                  setColor(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="mt-4 h-11 w-full border border-[#333] bg-black px-3 text-xs text-white outline-none focus:border-[#e9002d]"
              >

                <option
                  value=""
                  className="bg-black text-white"
                >
                  ALL COLORS
                </option>

                {availableColors.map(
                  (colorName) => (
                    <option
                      key={colorName}
                      value={colorName}
                      className="bg-black text-white"
                    >
                      {colorName}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* PRICE */}

            <div className="mt-10">

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                PRICE RANGE
              </p>

              <div className="mt-4 flex gap-2">

                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) => {
                    setMinPrice(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="₹ MIN"
                  className="h-11 w-full border border-[#333] bg-[#111] px-3 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#e9002d]"
                />

                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => {
                    setMaxPrice(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="₹ MAX"
                  className="h-11 w-full border border-[#333] bg-[#111] px-3 text-xs text-white outline-none placeholder:text-[#666] focus:border-[#e9002d]"
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
              <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#333] border-t-[#e9002d]" />

                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#777]">
                    Loading products...
                  </p>

                </div>

              </div>
            )}

            {/* ERROR */}

            {!loading && error && (
              <div className="border border-[#333] bg-[#080808] p-12 text-center">

                <p className="text-lg font-bold uppercase text-white">
                  Unable To Load Products
                </p>

                <p className="mt-3 text-sm text-[#777]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadProducts}
                  className="mt-7 bg-[#e9002d] px-7 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
                >
                  TRY AGAIN
                </button>

              </div>
            )}

            {/* EMPTY */}

            {!loading &&
              !error &&
              products.length === 0 && (
                <div className="flex min-h-[500px] items-center justify-center border border-[#222] bg-[#080808]">

                  <div className="text-center">

                    <p className="text-xl font-bold uppercase text-white">
                      No Products Found
                    </p>

                    <p className="mt-3 text-sm text-[#777]">
                      Try changing your filters.
                    </p>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-7 bg-[#e9002d] px-7 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
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
                <div className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 xl:grid-cols-4">

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
                        className="group cursor-pointer"
                        onClick={() =>
                          openProductDetails(
                            product._id
                          )
                        }
                      >

                        {/* IMAGE */}

                        <div className="relative aspect-[0.78] overflow-hidden border border-[#222] bg-[#080808]">

                          {image ? (
                            <img
                              src={image}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.16]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-semibold uppercase text-[#555]">
                              No Image
                            </div>
                          )}

                          {/* RED SALE BADGE */}

                          {discount > 0 && (
                            <span className="absolute left-3 top-3 bg-[#e9002d] px-3 py-2 text-[9px] font-bold text-white">
                              -{discount}%
                            </span>
                          )}

                          {/* WISHLIST */}

                          <button
                            type="button"
                            aria-label={
                              isWishlisted
                                ? "Remove from wishlist"
                                : "Add to wishlist"
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
                            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-sm transition-all ${
                              isWishlistLoading
                                ? "cursor-wait bg-[#555] text-white opacity-100"
                                : isWishlisted
                                ? "bg-[#e9002d] text-white opacity-100 hover:bg-white hover:text-black"
                                : "bg-white text-black opacity-0 group-hover:opacity-100 hover:bg-[#e9002d] hover:text-white"
                            }`}
                          >
                            {isWishlistLoading
                              ? "..."
                              : isWishlisted
                              ? "♥"
                              : "♡"}
                          </button>

                          {/* OUT OF STOCK */}

                          {outOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/65">

                              <span className="bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-black">
                                OUT OF STOCK
                              </span>

                            </div>
                          )}

                        </div>

                        {/* DETAILS */}

                        <div className="mt-5">

                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e9002d]">
                            {product.anime}
                          </p>

                          <h3 className="mt-2 min-h-[44px] text-[13px] font-semibold uppercase leading-5 text-white transition group-hover:text-[#e9002d]">
                            {product.name}
                          </h3>

                          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#666]">
                            {product.category?.name ||
                              "T-Shirts"}
                          </p>

                          <div className="mt-3 flex items-center gap-3">

                            <span className="text-[14px] font-bold text-white">
                              ₹
                              {Number(
                                finalPrice
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </span>

                            {discount > 0 && (
                              <span className="text-[11px] text-[#555] line-through">
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
                            <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#e9002d]">
                              Low stock
                            </p>
                          )}

                          {/* VIEW DETAILS */}

                          <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#555] transition group-hover:text-white">
                            VIEW DETAILS →
                          </p>

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
                <div className="mt-20 flex items-center justify-center gap-2">

                  <button
                    type="button"
                    disabled={
                      !pagination.hasPreviousPage
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          previous - 1
                      )
                    }
                    className="flex h-10 min-w-10 items-center justify-center border border-[#333] text-xs text-white transition hover:border-[#e9002d] hover:text-[#e9002d] disabled:opacity-30"
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
                        onClick={() =>
                          setPage(
                            pageNumber
                          )
                        }
                        className={`flex h-10 min-w-10 items-center justify-center text-xs font-bold transition ${
                          page === pageNumber
                            ? "bg-[#e9002d] text-white"
                            : "border border-[#333] text-[#aaa] hover:border-[#e9002d] hover:text-white"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                  <button
                    type="button"
                    disabled={
                      !pagination.hasNextPage
                    }
                    onClick={() =>
                      setPage(
                        (previous) =>
                          previous + 1
                      )
                    }
                    className="flex h-10 min-w-10 items-center justify-center border border-[#333] text-xs text-white transition hover:border-[#e9002d] hover:text-[#e9002d] disabled:opacity-30"
                  >
                    →
                  </button>

                </div>
              )}

          </section>

        </div>

      </main>

    </div>
  );
};

export default ProductListingPage;