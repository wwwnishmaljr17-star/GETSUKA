import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminAxios from "../../../../lib/adminAxios";

const LOW_STOCK_THRESHOLD = 5;

const InventoryManagementPage = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminAxios.get(
        "/api/admin/products",
        {
          params: {
            page,
            limit,
            search,
            sort,
          },
        }
      );

      const data = response.data;

      const productList =
        Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data?.products)
          ? data.data.products
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

      setProducts(productList);

      const pagination =
        data?.pagination ||
        data?.data?.pagination ||
        {};

      const total =
        pagination.totalProducts ??
        data?.totalProducts ??
        data?.total ??
        productList.length;

      const pages =
        pagination.totalPages ??
        data?.totalPages ??
        Math.max(1, Math.ceil(total / limit));

      setTotalProducts(Number(total) || 0);
      setTotalPages(Number(pages) || 1);
    } catch (err) {
      console.error("Inventory error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load inventory."
      );

      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, sort]);

  // =========================================================
  // HELPERS
  // =========================================================

  const getStock = (product) => {
    if (!Array.isArray(product?.variants)) {
      return 0;
    }

    return product.variants.reduce(
      (total, variant) =>
        total + Number(variant?.stock || 0),
      0
    );
  };

  const getStatus = (product) => {
    const stock = getStock(product);

    if (product?.isListed === false) {
      return "Unlisted";
    }

    if (stock === 0) {
      return "Out of Stock";
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
      return "Low Stock";
    }

    return "In Stock";
  };

  const getCategory = (product) => {
    if (typeof product?.category === "object") {
      return product?.category?.name || "—";
    }

    return product?.category || "—";
  };

  const getImage = (product) => {
    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    return null;
  };

  const getSku = (product) => {
    return product?.variants?.[0]?.sku || "—";
  };

  const getPrice = (product) => {
    const price =
      product?.salePrice ??
      product?.price ??
      0;

    return `₹${Number(price).toLocaleString("en-IN")}`;
  };

  // =========================================================
  // FILTER OPTIONS
  // =========================================================

  const categories = useMemo(() => {
    return [
      ...new Set(
        products
          .map((product) => getCategory(product))
          .filter(Boolean)
      ),
    ];
  }, [products]);

  const collections = useMemo(() => {
    return [
      ...new Set(
        products
          .map((product) => product?.anime)
          .filter(Boolean)
      ),
    ];
  }, [products]);

  // =========================================================
  // FILTERED PRODUCTS
  // =========================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const status = getStatus(product);
      const category = getCategory(product);
      const collection = product?.anime || "";

      return (
        (statusFilter === "all" ||
          status === statusFilter) &&
        (categoryFilter === "all" ||
          category === categoryFilter) &&
        (collectionFilter === "all" ||
          collection === collectionFilter)
      );
    });
  }, [
    products,
    statusFilter,
    categoryFilter,
    collectionFilter,
  ]);

  // =========================================================
  // STATS
  // =========================================================

  const stats = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((product) => {
      const status = getStatus(product);

      if (status === "In Stock") {
        inStock++;
      }

      if (status === "Low Stock") {
        lowStock++;
      }

      if (status === "Out of Stock") {
        outOfStock++;
      }
    });

    return {
      total: totalProducts,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products, totalProducts]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCollectionFilter("all");
    setSort("newest");
    setPage(1);
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (status) => {
    if (status === "In Stock") {
      return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";
    }

    if (status === "Low Stock") {
      return "border-[#f2d38b] bg-[#fff8e8] text-[#a36b00]";
    }

    if (status === "Out of Stock") {
      return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";
    }

    return "border-[#dce3ec] bg-[#f4f6f9] text-[#718096]";
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-[38px] w-[38px] animate-spin rounded-full border-[3px] border-[#dce6f7] border-t-[#1557f5]" />

          <p className="mt-[14px] text-[11px] text-[#8794a7]">
            Loading inventory...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-white px-[28px] pb-[30px] pt-[26px]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-[24px]">
        <p className="mb-[5px] text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a97aa]">
          Admin Panel
        </p>

        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#172033]">
          Inventory
        </h1>

        <p className="mt-[6px] text-[12px] text-[#8a97aa]">
          Monitor stock levels, identify inventory issues,
          and manage product stock.
        </p>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="mb-[24px] grid grid-cols-1 gap-[14px] md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">
          <p className="text-[11px] font-medium text-[#8a97aa]">
            Total Products
          </p>

          <p className="mt-[8px] text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
            {stats.total}
          </p>

          <p className="mt-[4px] text-[10px] text-[#9aa6b6]">
            Products in inventory
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">
          <p className="text-[11px] font-medium text-[#8a97aa]">
            In Stock
          </p>

          <p className="mt-[8px] text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
            {stats.inStock}
          </p>

          <p className="mt-[4px] text-[10px] text-[#11845b]">
            Available stock
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">
          <p className="text-[11px] font-medium text-[#1557f5]">
            Low Stock
          </p>

          <p className="mt-[8px] text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
            {stats.lowStock}
          </p>

          <p className="mt-[4px] text-[10px] text-[#a36b00]">
            {LOW_STOCK_THRESHOLD} or fewer units
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)] transition hover:-translate-y-[1px] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">
          <p className="text-[11px] font-medium text-[#1557f5]">
            Out of Stock
          </p>

          <p className="mt-[8px] text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
            {stats.outOfStock}
          </p>

          <p className="mt-[4px] text-[10px] text-[#d93650]">
            Requires attention
          </p>
        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_250px]">

        {/* ===================================================
            LEFT CONTENT
        =================================================== */}

        <div>

          {/* FILTERS */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[16px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 xl:grid-cols-4">

              <div>
                <p className="mb-[6px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
                  Search
                </p>

                <div className="relative">
                  <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[15px] text-[#9aa6b6]">
                    ⌕
                  </span>

                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) =>
                      setSearchInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="Search inventory..."
                    className="h-[40px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] pl-[35px] pr-[12px] text-[10px] text-[#263247] outline-none transition placeholder:text-[#a1adbd] focus:border-[#6f9cf7] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <p className="mb-[6px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
                  Stock Status
                </p>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-[40px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[11px] text-[10px] text-[#263247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                >
                  <option value="all">All</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">
                    Out of Stock
                  </option>
                </select>
              </div>

              <div>
                <p className="mb-[6px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
                  Category
                </p>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-[40px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[11px] text-[10px] text-[#263247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                >
                  <option value="all">All</option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-[6px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
                  Anime / Collection
                </p>

                <select
                  value={collectionFilter}
                  onChange={(e) => {
                    setCollectionFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-[40px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[11px] text-[10px] text-[#263247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                >
                  <option value="all">All</option>

                  {collections.map((collection) => (
                    <option
                      key={collection}
                      value={collection}
                    >
                      {collection}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-[12px] flex flex-wrap items-end gap-[12px]">

              <div className="w-full sm:w-[180px]">
                <p className="mb-[6px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
                  Sort By
                </p>

                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="h-[40px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[11px] text-[10px] text-[#263247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price-low">
                    Price Low
                  </option>
                  <option value="price-high">
                    Price High
                  </option>
                  <option value="name-az">
                    Name A-Z
                  </option>
                  <option value="name-za">
                    Name Z-A
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="h-[40px] rounded-[7px] bg-[#1557f5] px-[20px] text-[10px] font-semibold text-white transition hover:bg-[#0d46d1]"
              >
                SEARCH
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="h-[40px] rounded-[7px] border border-[#dfe6ef] bg-white px-[18px] text-[10px] font-semibold text-[#718096] transition hover:border-[#1557f5] hover:bg-[#f3f7ff] hover:text-[#1557f5]"
              >
                CLEAR
              </button>
            </div>
          </div>

          {/* TABLE */}

          <div className="mt-[18px] overflow-hidden rounded-[14px] border border-[#e6ebf3] bg-white shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <div className="border-b border-[#edf1f6] px-[18px] py-[16px]">
              <h2 className="text-[14px] font-semibold text-[#172033]">
                Stock Inventory
              </h2>

              <p className="mt-[4px] text-[10px] text-[#8a97aa]">
                Monitor product stock and inventory status.
              </p>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px] border-collapse">

                <thead>
                  <tr className="border-b border-[#edf1f6] bg-[#f8faff]">

                    {[
                      "Product",
                      "SKU",
                      "Category",
                      "Anime / Collection",
                      "Price",
                      "Stock",
                      "Threshold",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-[12px] py-[13px] text-left text-[8px] font-semibold uppercase tracking-[0.05em] text-[#7d8a9c]"
                      >
                        {heading}
                      </th>
                    ))}

                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="h-[280px] text-center"
                      >
                        <div>
                          <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#edf3ff] text-[22px] text-[#1557f5]">
                            📦
                          </div>

                          <p className="mt-[14px] text-[11px] font-medium text-[#69788b]">
                            NO INVENTORY FOUND
                          </p>

                          <p className="mt-[5px] text-[9px] text-[#9aa6b6]">
                            Try changing your search or filters.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const stock = getStock(product);
                      const status = getStatus(product);
                      const image = getImage(product);

                      return (
                        <tr
                          key={product._id}
                          className="border-b border-[#edf1f6] transition hover:bg-[#f7faff]"
                        >

                          {/* PRODUCT */}

                          <td className="px-[12px] py-[13px]">
                            <div className="flex items-center gap-[10px]">

                              <div className="h-[46px] w-[46px] flex-shrink-0 overflow-hidden rounded-[6px] border border-[#dfe6ef] bg-[#f4f7fb]">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[16px] text-[#9aa7b8]">
                                    ◇
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate text-[10px] font-medium text-[#273247]">
                                  {product.name}
                                </p>

                                <p className="mt-[4px] text-[8px] text-[#8996a8]">
                                  {product.variants?.length || 0} variants
                                </p>
                              </div>

                            </div>
                          </td>

                          {/* SKU */}

                          <td className="px-[12px] py-[13px]">
                            <span className="rounded-[4px] bg-[#f3f6fa] px-[7px] py-[5px] text-[8px] text-[#69788b]">
                              {getSku(product)}
                            </span>
                          </td>

                          {/* CATEGORY */}

                          <td className="px-[12px] py-[13px]">
                            <span className="text-[9px] text-[#69788b]">
                              {getCategory(product)}
                            </span>
                          </td>

                          {/* ANIME */}

                          <td className="px-[12px] py-[13px]">
                            <span className="text-[9px] text-[#69788b]">
                              {product.anime || "—"}
                            </span>
                          </td>

                          {/* PRICE */}

                          <td className="px-[12px] py-[13px]">
                            <span className="text-[9px] font-medium text-[#273247]">
                              {getPrice(product)}
                            </span>
                          </td>

                          {/* STOCK */}

                          <td className="px-[12px] py-[13px]">
                            <span
                              className={`text-[11px] font-semibold ${
                                stock === 0
                                  ? "text-[#d93650]"
                                  : stock <= LOW_STOCK_THRESHOLD
                                  ? "text-[#a36b00]"
                                  : "text-[#11845b]"
                              }`}
                            >
                              {stock}
                            </span>
                          </td>

                          {/* THRESHOLD */}

                          <td className="px-[12px] py-[13px]">
                            <span className="text-[9px] text-[#69788b]">
                              {LOW_STOCK_THRESHOLD}
                            </span>
                          </td>

                          {/* STATUS */}

                          <td className="px-[12px] py-[13px]">
                            <span
                              className={`inline-flex rounded-full border px-[10px] py-[6px] text-[7px] font-semibold uppercase ${getStatusStyle(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                          {/* ACTION */}

                          <td className="px-[12px] py-[13px]">
                            <button
                              type="button"
                              onClick={() =>
  navigate(`/admin/inventory/${product._id}`)
}
                              className="rounded-[6px] bg-[#edf3ff] px-[11px] py-[7px] text-[8px] font-semibold uppercase text-[#1557f5] transition hover:bg-[#1557f5] hover:text-white"
                            >
                              MANAGE
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}

          <div className="flex flex-col gap-[12px] px-[4px] py-[18px] sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[9px] text-[#8996a8]">
              Showing{" "}
              {totalProducts === 0
                ? 0
                : (page - 1) * limit + 1}
              -
              {Math.min(
                page * limit,
                totalProducts
              )}{" "}
              of {totalProducts}
            </p>

            <div className="flex gap-[6px]">

              <button
                type="button"
                disabled={page === 1}
                onClick={() =>
                  setPage((p) =>
                    Math.max(1, p - 1)
                  )
                }
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] border border-[#dfe6ef] bg-white text-[13px] text-[#718096] transition hover:border-[#1557f5] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹
              </button>

              {Array.from(
                {
                  length: Math.min(totalPages, 5),
                },
                (_, index) => {
                  const number = index + 1;

                  return (
                    <button
                      key={number}
                      type="button"
                      onClick={() => setPage(number)}
                      className={`flex h-[34px] w-[34px] items-center justify-center rounded-[7px] border text-[9px] transition ${
                        page === number
                          ? "border-[#1557f5] bg-[#1557f5] text-white"
                          : "border-[#dfe6ef] bg-white text-[#718096] hover:border-[#1557f5] hover:bg-[#f3f7ff] hover:text-[#1557f5]"
                      }`}
                    >
                      {number}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[7px] border border-[#dfe6ef] bg-white text-[13px] text-[#718096] transition hover:border-[#1557f5] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ›
              </button>

            </div>
          </div>
        </div>

        {/* ===================================================
            ALERTS
        =================================================== */}

        <div className="h-fit rounded-[14px] border border-[#e6ebf3] bg-white shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

          <div className="flex items-center justify-between border-b border-[#edf1f6] px-[16px] py-[15px]">

            <div className="flex items-center gap-[7px]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#1557f5]" />

              <h2 className="text-[12px] font-semibold uppercase text-[#273247]">
                Alerts
              </h2>
            </div>

            <span className="text-[8px] font-medium uppercase text-[#8a97aa]">
              View All →
            </span>
          </div>

          <div>
            {products
              .filter((product) => {
                return (
                  product?.isListed !== false &&
                  getStock(product) <= LOW_STOCK_THRESHOLD
                );
              })
              .slice(0, 5)
              .map((product) => (
                <button
                  key={product._id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/products/${product._id}/edit`
                    )
                  }
                  className="group w-full border-b border-[#edf1f6] px-[16px] py-[14px] text-left transition hover:bg-[#f6f9ff]"
                >
                  <div className="flex items-start gap-[8px]">

                    <span className="mt-[4px] h-[7px] w-[3px] rounded-full bg-[#1557f5]" />

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-[9px] font-medium text-[#39465a] group-hover:text-[#1557f5]">
                        {product.name}
                      </p>

                      <div className="mt-[6px] flex items-center justify-between">

                        <span className="text-[8px] text-[#8b97a8]">
                          Stock:
                          <span className="ml-[3px] font-semibold text-[#d93650]">
                            {getStock(product)}
                          </span>
                        </span>

                        <span className="text-[8px] text-[#8b97a8]">
                          Threshold: {LOW_STOCK_THRESHOLD}
                        </span>

                      </div>
                    </div>
                  </div>
                </button>
              ))}

            {products.filter(
              (product) =>
                product?.isListed !== false &&
                getStock(product) <= LOW_STOCK_THRESHOLD
            ).length === 0 && (
              <div className="px-[16px] py-[30px] text-center">
                <div className="mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#edf3ff] text-[18px] text-[#1557f5]">
                  ✓
                </div>

                <p className="mt-[10px] text-[9px] font-medium text-[#718096]">
                  No stock alerts
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-[16px] rounded-[8px] border border-[#f1c8d0] bg-[#fff5f6] px-[14px] py-[11px] text-[10px] text-[#d93650]">
          {error}
        </div>
      )}
    </div>
  );
};

export default InventoryManagementPage;