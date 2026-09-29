import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import adminAxios from "../../../../lib/adminAxios";

const ProductManagementPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [searchInput, setSearchInput] = useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("");

  const [animeFilter, setAnimeFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [sort, setSort] =
    useState("newest");

  const [page, setPage] =
    useState(1);

  const [limit] =
    useState(5);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalProducts, setTotalProducts] =
    useState(0);

  const [categories, setCategories] =
    useState([]);

  const [openAction, setOpenAction] =
    useState(null);

  const [error, setError] =
    useState("");

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await adminAxios.get(
          "/api/admin/products",
          {
            params: {
              page,
              limit,
              search,
              category:
                categoryFilter,
              anime:
                animeFilter,
              sort,
            },
          }
        );

      console.log(
        "PRODUCT LIST RESPONSE:",
        response.data
      );

      const responseData =
        response.data;

      let productList = [];

      if (
        Array.isArray(
          responseData?.products
        )
      ) {
        productList =
          responseData.products;
      } else if (
        Array.isArray(
          responseData?.data
            ?.products
        )
      ) {
        productList =
          responseData.data.products;
      } else if (
        Array.isArray(
          responseData?.data
        )
      ) {
        productList =
          responseData.data;
      } else if (
        Array.isArray(
          responseData
        )
      ) {
        productList =
          responseData;
      }

      setProducts(
        productList
      );

      const total =
        responseData?.total ??
        responseData?.data
          ?.total ??
        responseData?.pagination
          ?.total ??
        responseData?.data
          ?.pagination?.total ??
        productList.length;

      const pages =
        responseData?.totalPages ??
        responseData?.data
          ?.totalPages ??
        responseData?.pagination
          ?.totalPages ??
        responseData?.data
          ?.pagination?.totalPages ??
        Math.max(
          1,
          Math.ceil(
            total / limit
          )
        );

      setTotalProducts(
        Number(total) || 0
      );

      setTotalPages(
        Number(pages) || 1
      );
    } catch (err) {
      console.error(
        "FETCH PRODUCTS ERROR:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          "Failed to load products."
      );

      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH CATEGORIES
  // =========================================================

  const fetchCategories = async () => {
    try {
      const response =
        await adminAxios.get(
          "/api/admin/categories",
          {
            params: {
              page: 1,
              limit: 100,
            },
          }
        );

      const responseData =
        response.data;

      let categoryList = [];

      if (
        Array.isArray(
          responseData?.categories
        )
      ) {
        categoryList =
          responseData.categories;
      } else if (
        Array.isArray(
          responseData?.data
            ?.categories
        )
      ) {
        categoryList =
          responseData.data.categories;
      } else if (
        Array.isArray(
          responseData?.data
        )
      ) {
        categoryList =
          responseData.data;
      } else if (
        Array.isArray(
          responseData
        )
      ) {
        categoryList =
          responseData;
      }

      setCategories(
        categoryList.filter(
          (category) =>
            !category.isDeleted
        )
      );
    } catch (err) {
      console.error(
        "FETCH CATEGORIES ERROR:",
        err
      );
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchCategories();
  }, []);

  // =========================================================
  // PRODUCT FETCH
  // =========================================================

  useEffect(() => {
    fetchProducts();
  }, [
    page,
    search,
    categoryFilter,
    animeFilter,
    sort,
  ]);

  // =========================================================
  // CLOSE ACTION MENU
  // =========================================================

  useEffect(() => {
    const closeMenu = () => {
      setOpenAction(null);
    };

    document.addEventListener(
      "click",
      closeMenu
    );

    return () => {
      document.removeEventListener(
        "click",
        closeMenu
      );
    };
  }, []);

  // =========================================================
  // STOCK CALCULATOR
  // =========================================================

  const getTotalStock = (
    product
  ) => {
    if (
      !Array.isArray(
        product?.variants
      )
    ) {
      return 0;
    }

    return product.variants.reduce(
      (
        total,
        variant
      ) =>
        total +
        Number(
          variant?.stock || 0
        ),
      0
    );
  };

  // =========================================================
  // STATUS
  // =========================================================

  const getProductStatus = (
    product
  ) => {
    const stock =
      getTotalStock(
        product
      );

    if (
      product?.isListed === false
    ) {
      return "Unlisted";
    }

    if (stock === 0) {
      return "Out of Stock";
    }

    if (stock <= 5) {
      return "Low Stock";
    }

    return "Active";
  };

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    const total =
      totalProducts ||
      products.length;

    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach(
      (product) => {
        const stock =
          getTotalStock(
            product
          );

        if (
          product?.isListed === false
        ) {
          return;
        }

        if (stock === 0) {
          outOfStock++;
        } else if (
          stock <= 5
        ) {
          lowStock++;
        } else {
          active++;
        }
      }
    );

    return {
      total,
      active,
      lowStock,
      outOfStock,
    };
  }, [
    products,
    totalProducts,
  ]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch =
    () => {
      setPage(1);
      setSearch(
        searchInput.trim()
      );
    };

  // =========================================================
  // ENTER SEARCH
  // =========================================================

  const handleSearchKeyDown =
    (event) => {
      if (
        event.key ===
        "Enter"
      ) {
        handleSearch();
      }
    };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  const clearFilters =
    () => {
      setSearchInput("");
      setSearch("");
      setCategoryFilter("");
      setAnimeFilter("");
      setStatusFilter("");
      setSort("newest");
      setPage(1);
    };

  // =========================================================
  // FILTERED PRODUCTS
  // =========================================================

  const visibleProducts =
    useMemo(() => {
      if (!statusFilter) {
        return products;
      }

      return products.filter(
        (product) =>
          getProductStatus(
            product
          ) ===
          statusFilter
      );
    }, [
      products,
      statusFilter,
    ]);

  // =========================================================
  // ANIME OPTIONS
  // =========================================================

  const animeOptions =
    useMemo(() => {
      const animeSet =
        new Set();

      products.forEach(
        (product) => {
          if (
            product?.anime
          ) {
            animeSet.add(
              product.anime
            );
          }
        }
      );

      return Array.from(
        animeSet
      ).sort();
    }, [products]);

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const handleDelete =
    async (productId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this product?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await adminAxios.delete(
          `/api/admin/products/${productId}`
        );

        setOpenAction(null);

        fetchProducts();
      } catch (err) {
        console.error(
          "DELETE PRODUCT ERROR:",
          err
        );

        alert(
          err?.response?.data
            ?.message ||
            "Failed to delete product."
        );
      }
    };

  // =========================================================
  // TOGGLE LISTING
  // =========================================================

  const handleToggleListing =
    async (
      productId
    ) => {
      try {
        await adminAxios.patch(
          `/api/admin/products/${productId}/listing`
        );

        setOpenAction(null);

        fetchProducts();
      } catch (err) {
        console.error(
          "TOGGLE LISTING ERROR:",
          err
        );

        alert(
          err?.response?.data
            ?.message ||
            "Failed to update product status."
        );
      }
    };

  // =========================================================
  // PRODUCT IMAGE
  // =========================================================

  const getProductImage =
    (product) => {
      if (
        Array.isArray(
          product?.images
        ) &&
        product.images.length
      ) {
        return product.images[0];
      }

      return null;
    };

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  const formatPrice =
    (price) => {
      return new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }
      ).format(
        Number(price) || 0
      );
    };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle =
    (status) => {
      switch (
        status
      ) {
        case "Active":
          return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

        case "Low Stock":
          return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

        case "Out of Stock":
          return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

        case "Unlisted":
          return "border-[#d5dce5] bg-[#f3f6f9] text-[#718096]";

        default:
          return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
      }
    };

  // =========================================================
  // STAT CARD
  // =========================================================

  const StatCard = ({
    title,
    value,
    type,
    icon,
    description,
  }) => {
    const styles = {
      total: {
        border:
          "border-[#e1e8f1]",
        bg:
          "bg-white",
        icon:
          "border-[#cfe0fb] bg-[#edf4ff] text-[#1557f5]",
        number:
          "text-[#172033]",
        line:
          "text-[#7c9ab5]",
      },

      active: {
        border:
          "border-[#e1e8f1]",
        bg:
          "bg-white",
        icon:
          "border-[#bcebd5] bg-[#effcf6] text-[#11845b]",
        number:
          "text-[#172033]",
        line:
          "text-[#11845b]",
      },

      low: {
        border:
          "border-[#e1e8f1]",
        bg:
          "bg-white",
        icon:
          "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]",
        number:
          "text-[#172033]",
        line:
          "text-[#a36b00]",
      },

      out: {
        border:
          "border-[#e1e8f1]",
        bg:
          "bg-white",
        icon:
          "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]",
        number:
          "text-[#172033]",
        line:
          "text-[#d93650]",
      },
    };

    const style =
      styles[type];

    return (
      <div
        className={`group relative min-h-[148px] overflow-hidden rounded-[12px] border ${style.border} ${style.bg} px-[18px] py-[17px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]`}
      >

        {/* GLOW */}

        <div
          className={`absolute -right-[25px] -top-[25px] h-[100px] w-[100px] rounded-full blur-[45px] opacity-20 ${style.line.replace(
            "text-",
            "bg-"
          )}`}
        />

        {/* ICON */}

        <div
          className={`flex h-[42px] w-[42px] items-center justify-center rounded-full border ${style.icon} transition-colors duration-200 group-hover:bg-[#1557f5] group-hover:text-white`}
        >
          <span className="text-[18px]">
            {icon}
          </span>
        </div>

        {/* TITLE */}

        <p className="mt-[13px] text-[8px] uppercase tracking-[0.08em] text-[#7e8da1]">
          {title}
        </p>

        {/* NUMBER */}

        <p
          className={`mt-[5px] text-[28px] font-semibold tracking-[-0.04em] ${style.number}`}
        >
          {value}
        </p>

        {/* DESCRIPTION */}

        <p
          className={`mt-[3px] text-[8px] ${style.line}`}
        >
          {description}
        </p>

        {/* GRAPH */}

        <div className="absolute bottom-[18px] right-[18px] flex h-[38px] items-end gap-[3px] opacity-80">
          <span
            className={`w-[3px] rounded-t ${style.line.replace(
              "text-",
              "bg-"
            )}`}
            style={{
              height:
                "35%",
            }}
          />

          <span
            className={`w-[3px] rounded-t ${style.line.replace(
              "text-",
              "bg-"
            )}`}
            style={{
              height:
                "50%",
            }}
          />

          <span
            className={`w-[3px] rounded-t ${style.line.replace(
              "text-",
              "bg-"
            )}`}
            style={{
              height:
                "42%",
            }}
          />

          <span
            className={`w-[3px] rounded-t ${style.line.replace(
              "text-",
              "bg-"
            )}`}
            style={{
              height:
                "72%",
            }}
          />

          <span
            className={`w-[3px] rounded-t ${style.line.replace(
              "text-",
              "bg-"
            )}`}
            style={{
              height:
                "100%",
            }}
          />
        </div>

      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-white text-[#172033]">

        <div className="text-center">

          <div className="mx-auto h-[38px] w-[38px] animate-spin rounded-full border-2 border-[#dce5f2] border-t-[#1557f5]" />

          <p className="mt-[12px] text-[10px] text-[#8996a8]">
            Loading products...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          HEADER / BREADCRUMB
      ===================================================== */}

      <div className="border-b border-[#edf1f6] px-[28px] pb-[18px] pt-[20px]">

        <div className="flex items-center gap-[8px] text-[9px]">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
            className="text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Dashboard
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#7e8da1]">
            Products
          </span>

        </div>

      </div>

      {/* =====================================================
          TITLE
      ===================================================== */}

      <section className="px-[28px] pt-[22px]">

        <div className="flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.04em] text-[#162033]">
              Products
            </h1>

            <p className="mt-[6px] text-[10px] text-[#8290a3]">
              Manage your GETSUKA product catalogue.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/products/new"
              )
            }
            className="h-[42px] rounded-[8px] bg-[#1557f5] px-[22px] text-[9px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_5px_15px_rgba(21,87,245,0.16)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0d49d8] hover:shadow-[0_8px_20px_rgba(21,87,245,0.22)] active:translate-y-0"
          >
            + &nbsp; ADD PRODUCT
          </button>

        </div>

      </section>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[12px] px-[28px] pt-[21px] sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Products"
          value={
            stats.total
          }
          type="total"
          icon="◇"
          description="Products in catalogue"
        />

        <StatCard
          title="Active"
          value={
            stats.active
          }
          type="active"
          icon="✓"
          description="Available for sale"
        />

        <StatCard
          title="Low Stock"
          value={
            stats.lowStock
          }
          type="low"
          icon="△"
          description="5 or fewer units"
        />

        <StatCard
          title="Out of Stock"
          value={
            stats.outOfStock
          }
          type="out"
          icon="×"
          description="Requires restocking"
        />

      </section>

      {/* =====================================================
          SEARCH + FILTERS
      ===================================================== */}

      <section className="mx-[28px] mt-[20px] rounded-[12px] border border-[#e1e8f1] bg-white p-[13px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

        {/* SEARCH */}

        <div className="flex flex-col gap-[9px] xl:flex-row">

          <div className="relative flex-1">

            <span className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[15px] text-[#9aa6b6]">
              ⌕
            </span>

            <input
              type="text"
              value={
                searchInput
              }
              onChange={(event) =>
                setSearchInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
              placeholder="Search products (name, anime, SKU...)"
              className="h-[50px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] pl-[42px] pr-[15px] text-[10px] text-[#263247] outline-none placeholder:text-[#aab4c2] transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
            />

          </div>

          <button
            type="button"
            onClick={
              handleSearch
            }
            className="h-[50px] rounded-[7px] border border-[#1557f5] bg-[#f1f6ff] px-[23px] text-[9px] font-semibold text-[#1557f5] transition-all duration-200 hover:bg-[#1557f5] hover:text-white"
          >
            ⌕ &nbsp; SEARCH
          </button>

        </div>

        {/* FILTERS */}

        <div className="mt-[10px] grid grid-cols-1 gap-[9px] md:grid-cols-2 xl:grid-cols-4">

          {/* CATEGORY */}

          <select
            value={
              categoryFilter
            }
            onChange={(event) => {
              setCategoryFilter(
                event.target.value
              );

              setPage(1);
            }}
            className="h-[46px] rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[13px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
          >

            <option value="">
              All Categories
            </option>

            {categories.map(
              (
                category
              ) => (
                <option
                  key={
                    category._id
                  }
                  value={
                    category._id
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}

          </select>

          {/* ANIME */}

          <select
            value={
              animeFilter
            }
            onChange={(event) => {
              setAnimeFilter(
                event.target.value
              );

              setPage(1);
            }}
            className="h-[46px] rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[13px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
          >

            <option value="">
              All Anime
            </option>

            {animeOptions.map(
              (anime) => (
                <option
                  key={anime}
                  value={anime}
                >
                  {anime}
                </option>
              )
            )}

          </select>

          {/* STATUS */}

          <select
            value={
              statusFilter
            }
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );

              setPage(1);
            }}
            className="h-[46px] rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[13px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
          >

            <option value="">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Low Stock">
              Low Stock
            </option>

            <option value="Out of Stock">
              Out of Stock
            </option>

            <option value="Unlisted">
              Unlisted
            </option>

          </select>

          {/* SORT */}

          <select
            value={sort}
            onChange={(event) => {
              setSort(
                event.target.value
              );

              setPage(1);
            }}
            className="h-[46px] rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[13px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
          >

            <option value="newest">
              Sort: Newest
            </option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>

            <option value="name-az">
              Name: A - Z
            </option>

            <option value="name-za">
              Name: Z - A
            </option>

          </select>

        </div>

        {/* CLEAR */}

        {(search ||
          categoryFilter ||
          animeFilter ||
          statusFilter ||
          sort !==
            "newest") && (
          <div className="flex justify-end pt-[9px]">

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="text-[8px] font-medium uppercase tracking-[0.05em] text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
            >
              CLEAR ALL
            </button>

          </div>
        )}

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mx-[28px] mt-[15px] rounded-[7px] border border-[#ffd1d8] bg-[#fff5f6] px-[15px] py-[12px] text-[9px] text-[#d93650]">
          {error}
        </div>
      )}

      {/* =====================================================
          TABLE
      ===================================================== */}

      <section className="mx-[28px] mt-[15px] overflow-visible rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[950px] border-collapse">

            <thead>

              <tr className="border-b border-[#edf1f6] bg-[#f8faff]">

                <th className="w-[48px] px-[13px] py-[16px] text-left">

                  <input
                    type="checkbox"
                    className="h-[14px] w-[14px] accent-[#1557f5]"
                  />

                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Product
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  SKU
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Anime
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Category
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Stock
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Price
                </th>

                <th className="px-[10px] py-[16px] text-left text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Status
                </th>

                <th className="w-[70px] px-[10px] py-[16px] text-center text-[8px] font-medium uppercase tracking-[0.06em] text-[#7c899b]">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {visibleProducts.length ===
              0 ? (
                <tr>

                  <td
                    colSpan="9"
                    className="h-[260px] text-center"
                  >

                    <div className="flex flex-col items-center justify-center">

                      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#dce5f2] bg-[#f1f6ff] text-[22px] text-[#8da9dc]">
                        ◇
                      </div>

                      <p className="mt-[14px] text-[11px] font-medium text-[#69788b]">
                        NO PRODUCTS FOUND
                      </p>

                      <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                        Try changing your search or filters.
                      </p>

                    </div>

                  </td>

                </tr>
              ) : (
                visibleProducts.map(
                  (
                    product
                  ) => {
                    const stock =
                      getTotalStock(
                        product
                      );

                    const status =
                      getProductStatus(
                        product
                      );

                    const image =
                      getProductImage(
                        product
                      );

                    const firstVariant =
                      Array.isArray(
                        product?.variants
                      ) &&
                      product
                        .variants
                        .length
                        ? product
                            .variants[0]
                        : null;

                    return (
                      <tr
                        key={
                          product._id
                        }
                        className="group border-b border-[#edf1f6] bg-white transition-all duration-200 hover:bg-[#eaf3ff] hover:shadow-[inset_3px_0_0_#1557f5]"
                      >

                        {/* CHECKBOX */}

                        <td className="px-[13px] py-[14px]">

                          <input
                            type="checkbox"
                            className="h-[14px] w-[14px] accent-[#1557f5]"
                          />

                        </td>

                        {/* PRODUCT */}

                        <td className="px-[10px] py-[14px]">

                          <div className="flex items-center gap-[12px]">

                            <div className="h-[54px] w-[54px] flex-shrink-0 overflow-hidden rounded-[7px] border border-[#dfe6ef] bg-[#f4f7fb] transition-all duration-200 group-hover:border-[#b8cff5]">

                              {image ? (
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    product.name
                                  }
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[18px] text-[#8da9dc]">
                                  ◇
                                </div>
                              )}

                            </div>

                            <div className="min-w-0">

                              <p className="truncate text-[10px] font-medium text-[#263247] transition-colors duration-200 group-hover:text-[#1557f5]">
                                {
                                  product.name
                                }
                              </p>

                              <p className="mt-[5px] text-[8px] text-[#8996a8]">
                                {
                                  Array.isArray(
                                    product.variants
                                  )
                                    ? `${product.variants.length} variant${
                                        product
                                          .variants
                                          .length !==
                                        1
                                          ? "s"
                                          : ""
                                      }`
                                    : "0 variants"
                                }
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* SKU */}

                        <td className="px-[10px] py-[14px]">

                          <span className="text-[8px] text-[#6f7d90]">
                            {
                              firstVariant
                                ?.sku ||
                              "—"
                            }
                          </span>

                        </td>

                        {/* ANIME */}

                        <td className="px-[10px] py-[14px]">

                          <span className="text-[8px] text-[#6f7d90]">
                            {
                              product.anime ||
                              "—"
                            }
                          </span>

                        </td>

                        {/* CATEGORY */}

                        <td className="px-[10px] py-[14px]">

                          <span className="text-[8px] text-[#6f7d90]">
                            {typeof product.category ===
                            "object"
                              ? product
                                  .category
                                  ?.name ||
                                "—"
                              : product.category ||
                                "—"}
                          </span>

                        </td>

                        {/* STOCK */}

                        <td className="px-[10px] py-[14px]">

                          <span
                            className={`text-[9px] font-medium ${
                              stock ===
                              0
                                ? "text-[#d93650]"
                                : stock <=
                                  5
                                ? "text-[#a36b00]"
                                : "text-[#11845b]"
                            }`}
                          >
                            {stock}
                          </span>

                        </td>

                        {/* PRICE */}

                        <td className="px-[10px] py-[14px]">

                          <div>

                            <p className="text-[9px] font-medium text-[#263247]">
                              {formatPrice(
                                product.salePrice ??
                                  product.price
                              )}
                            </p>

                            {product.salePrice !==
                              null &&
                              product.salePrice !==
                                undefined &&
                              Number(
                                product.salePrice
                              ) <
                                Number(
                                  product.price
                                ) && (
                                <p className="mt-[3px] text-[7px] text-[#9aa6b6] line-through">
                                  {formatPrice(
                                    product.price
                                  )}
                                </p>
                              )}

                          </div>

                        </td>

                        {/* STATUS */}

                        <td className="px-[10px] py-[14px]">

                          <span
                            className={`inline-flex min-w-[92px] items-center justify-center rounded-full border px-[10px] py-[7px] text-[7px] font-semibold uppercase tracking-[0.04em] ${getStatusStyle(
                              status
                            )}`}
                          >
                            {status ===
                              "Active" &&
                              "+ "}

                            {status ===
                              "Low Stock" &&
                              "⚠ "}

                            {status ===
                              "Out of Stock" &&
                              "× "}

                            {status}
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="relative px-[10px] py-[14px] text-center">

                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setOpenAction(
                                openAction ===
                                  product._id
                                  ? null
                                  : product._id
                              );
                            }}
                            className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[5px] border border-transparent text-[16px] text-[#8b97a8] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5]"
                          >
                            ⋮
                          </button>

                          {openAction ===
                            product._id && (
                            <div
                              onClick={(
                                event
                              ) =>
                                event.stopPropagation()
                              }
                              className="absolute right-[8px] top-[53px] z-50 w-[155px] overflow-hidden rounded-[8px] border border-[#dce4ee] bg-white shadow-[0_15px_40px_rgba(30,64,175,0.15)]"
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/admin/products/${product._id}/edit`
                                  )
                                }
                                className="flex w-full items-center px-[13px] py-[11px] text-left text-[8px] text-[#69788b] transition-colors duration-200 hover:bg-[#f3f7ff] hover:text-[#1557f5]"
                              >
                                ✎ &nbsp; Edit Product
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleListing(
                                    product._id
                                  )
                                }
                                className="flex w-full items-center px-[13px] py-[11px] text-left text-[8px] text-[#69788b] transition-colors duration-200 hover:bg-[#f3f7ff] hover:text-[#1557f5]"
                              >
                                {product.isListed ===
                                false
                                  ? "✓"
                                  : "◌"}{" "}
                                &nbsp;
                                {product.isListed ===
                                false
                                  ? "List Product"
                                  : "Unlist Product"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    product._id
                                  )
                                }
                                className="flex w-full items-center border-t border-[#edf1f6] px-[13px] py-[11px] text-left text-[8px] text-[#d93650] transition-colors duration-200 hover:bg-[#ffe9ed] hover:text-[#c52d47]"
                              >
                                × &nbsp; Delete Product
                              </button>

                            </div>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      <div className="flex flex-col gap-[15px] px-[28px] py-[17px] sm:flex-row sm:items-center sm:justify-between">

        <p className="text-[8px] uppercase tracking-[0.03em] text-[#8c98a9]">
          Showing{" "}
          {totalProducts ===
          0
            ? 0
            : (page -
                1) *
                limit +
              1}
          -
          {Math.min(
            page *
              limit,
            totalProducts
          )}{" "}
          of{" "}
          {totalProducts}{" "}
          products
        </p>

        <div className="flex items-center gap-[7px]">

          <button
            type="button"
            disabled={
              page ===
              1
            }
            onClick={() =>
              setPage(
                (previous) =>
                  Math.max(
                    1,
                    previous -
                      1
                  )
              )
            }
            className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border border-[#dfe6ef] bg-white text-[12px] text-[#718096] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>

          {Array.from(
            {
              length:
                Math.min(
                  totalPages,
                  5
                ),
            },
            (
              _,
              index
            ) => {
              const pageNumber =
                index + 1;

              return (
                <button
                  type="button"
                  key={
                    pageNumber
                  }
                  onClick={() =>
                    setPage(
                      pageNumber
                    )
                  }
                  className={`flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border text-[9px] transition-all duration-200 ${
                    page ===
                    pageNumber
                      ? "border-[#1557f5] bg-[#1557f5] text-white shadow-[0_4px_12px_rgba(21,87,245,0.18)]"
                      : "border-[#dfe6ef] bg-white text-[#718096] hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5]"
                  }`}
                >
                  {
                    pageNumber
                  }
                </button>
              );
            }
          )}

          <button
            type="button"
            disabled={
              page >=
              totalPages
            }
            onClick={() =>
              setPage(
                (previous) =>
                  Math.min(
                    totalPages,
                    previous +
                      1
                  )
              )
            }
            className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border border-[#dfe6ef] bg-white text-[12px] text-[#718096] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>

        </div>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="flex items-center justify-between border-t border-[#e7edf5] px-[28px] py-[20px]">

        <div>

          <p className="text-[12px] font-medium text-[#1557f5]">
            GETSUKA
          </p>

          <p className="mt-[4px] text-[8px] text-[#8c98a9]">
            Admin Panel
          </p>

        </div>

        <p className="text-[8px] text-[#8c98a9]">
          Built with{" "}
          <span className="text-[#1557f5]">
            ♥
          </span>{" "}
          for anime fans.
        </p>

      </footer>

    </div>
  );
};

export default ProductManagementPage;