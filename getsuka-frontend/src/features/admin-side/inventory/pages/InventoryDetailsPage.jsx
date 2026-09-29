import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import adminAxios from "../../../../lib/adminAxios";

const LOW_STOCK_THRESHOLD = 5;

const InventoryDetailsPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedVariantId, setSelectedVariantId] =
    useState("");

  const [adjustmentType, setAdjustmentType] =
    useState("add");

  const [quantity, setQuantity] = useState(1);

  const [reason, setReason] = useState(
    "New Stock Received"
  );

  const [adminNote, setAdminNote] = useState("");

  const [saving, setSaving] = useState(false);

  // =========================================================
  // FETCH PRODUCT
  // =========================================================

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await adminAxios.get(
        `/api/admin/products/${productId}`
      );

      const data = response.data;

      const productData =
        data?.product ||
        data?.data?.product ||
        data?.data ||
        data;

      setProduct(productData);

      if (
        productData?.variants?.length > 0
      ) {
        setSelectedVariantId(
          productData.variants[0]._id
        );
      }
    } catch (err) {
      console.error(
        "FETCH INVENTORY DETAILS ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load product inventory."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  // =========================================================
  // SELECTED VARIANT
  // =========================================================

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          String(variant._id) ===
          String(selectedVariantId)
      ) ||
      product.variants[0]
    );
  }, [
    product,
    selectedVariantId,
  ]);

  // =========================================================
  // CURRENT STOCK
  // =========================================================

  const currentStock = Number(
    selectedVariant?.stock || 0
  );

  // =========================================================
  // PREVIEW STOCK
  // =========================================================

  const previewStock = useMemo(() => {
    const amount = Math.max(
      0,
      Number(quantity) || 0
    );

    if (adjustmentType === "add") {
      return currentStock + amount;
    }

    return Math.max(
      0,
      currentStock - amount
    );
  }, [
    currentStock,
    quantity,
    adjustmentType,
  ]);

  // =========================================================
  // PRODUCT TOTAL STOCK
  // =========================================================

  const totalProductStock = useMemo(() => {
    if (!product?.variants?.length) {
      return 0;
    }

    return product.variants.reduce(
      (total, variant) =>
        total +
        Number(variant?.stock || 0),
      0
    );
  }, [product]);

  // =========================================================
  // STATUS
  // =========================================================

  const stockStatus = useMemo(() => {
    if (
      product?.isListed === false
    ) {
      return "Unlisted";
    }

    if (currentStock === 0) {
      return "Out of Stock";
    }

    if (
      currentStock <=
      LOW_STOCK_THRESHOLD
    ) {
      return "Low Stock";
    }

    return "In Stock";
  }, [
    product,
    currentStock,
  ]);

  // =========================================================
  // PRICE
  // =========================================================

  const getPrice = (productData) => {
    const price =
      productData?.salePrice ??
      productData?.price ??
      0;

    return `₹${Number(price).toLocaleString(
      "en-IN"
    )}`;
  };

  // =========================================================
  // SAVE STOCK
  // =========================================================
const handleSaveAdjustment = async () => {
  if (!selectedVariant) {
    return;
  }

  const amount = Number(quantity);

  if (!amount || amount < 1) {
    setError("Enter a valid quantity.");
    return;
  }

  if (
    adjustmentType === "remove" &&
    amount > currentStock
  ) {
    setError(
      "You cannot remove more stock than currently available."
    );
    return;
  }

  try {
    setSaving(true);
    setError("");

    const updatedVariants = product.variants.map(
      (variant) => {
        if (
          String(variant._id) !==
          String(selectedVariant._id)
        ) {
          return {
            color: variant.color,
            size: variant.size,
            sku: variant.sku,
            stock: Number(variant.stock || 0),
          };
        }

        const newStock =
          adjustmentType === "add"
            ? Number(variant.stock || 0) + amount
            : Math.max(
                0,
                Number(variant.stock || 0) - amount
              );

        return {
          color: variant.color,
          size: variant.size,
          sku: variant.sku,
          stock: newStock,
        };
      }
    );

    const categoryId =
      typeof product.category === "object"
        ? product.category?._id
        : product.category;

    const details = {
      material:
        product.details?.material || "",

      fit:
        product.details?.fit || "",

      careInstructions:
        product.details?.careInstructions || "",

      shippingInfo:
        product.details?.shippingInfo || "",

      returnInfo:
        product.details?.returnInfo || "",

      productDetails:
        product.details?.productDetails || "",

      highlights:
        Array.isArray(product.details?.highlights)
          ? product.details.highlights
          : [],
    };

    await adminAxios.put(
      `/api/admin/products/${productId}`,
      {
        name: product.name || "",
        productCode:
          product.productCode || "",
        description:
          product.description || "",
        category: categoryId,
        anime: product.anime || "",
        images:
          Array.isArray(product.images)
            ? product.images
            : [],
        price: Number(product.price || 0),
        salePrice:
          product.salePrice === null ||
          product.salePrice === undefined
            ? null
            : Number(product.salePrice),
        variants: updatedVariants,
        details,
      }
    );

    setQuantity(1);
    setAdminNote("");

    await fetchProduct();
  } catch (err) {
    console.error(
      "UPDATE STOCK ERROR:",
      err
    );

    setError(
      err?.response?.data?.message ||
        "Failed to update stock."
    );
  } finally {
    setSaving(false);
  }
};

  // =========================================================
  // IMAGE
  // =========================================================

  const productImage =
    product?.images?.[0] || "";

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-[38px] w-[38px] animate-spin rounded-full border-[3px] border-[#dce6f7] border-t-[#1557f5]" />

          <p className="mt-[14px] text-[11px] text-[#8794a7]">
            Loading inventory details...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (!product) {
    return (
      <div className="p-[28px]">
        <button
          type="button"
          onClick={() =>
            navigate("/admin/inventory")
          }
          className="mb-[20px] text-[11px] font-medium text-[#1557f5] hover:underline"
        >
          ← Back to Inventory
        </button>

        <div className="rounded-[14px] border border-[#f1c8d0] bg-[#fff5f6] p-[20px] text-[11px] text-[#d93650]">
          {error ||
            "Product inventory not found."}
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
          TOP
      ===================================================== */}

      <div className="mb-[20px]">

        <button
          type="button"
          onClick={() =>
            navigate("/admin/inventory")
          }
          className="mb-[12px] text-[10px] font-medium text-[#718096] transition hover:text-[#1557f5]"
        >
          ← BACK TO INVENTORY
        </button>

        <div className="flex flex-col justify-between gap-[10px] lg:flex-row lg:items-end">

          <div>
            <p className="mb-[5px] text-[9px] uppercase tracking-[0.1em] text-[#8a97aa]">
              Inventory Details
            </p>

            <div className="flex flex-wrap items-center gap-[9px]">

              <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#172033]">
                {product.name}
              </h1>

              <span
                className={`rounded-full border px-[9px] py-[5px] text-[7px] font-semibold uppercase ${
                  stockStatus === "In Stock"
                    ? "border-[#bcebd5] bg-[#effcf6] text-[#11845b]"
                    : stockStatus === "Low Stock"
                    ? "border-[#f2d38b] bg-[#fff8e8] text-[#a36b00]"
                    : "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]"
                }`}
              >
                {stockStatus}
              </span>

            </div>

            <p className="mt-[5px] text-[10px] text-[#8a97aa]">
              SKU:{" "}
              <span className="text-[#5d6b7e]">
                {selectedVariant?.sku ||
                  "—"}
              </span>
            </p>
          </div>

          <p className="text-[9px] text-[#8a97aa]">
            {product.updatedAt
              ? `Last updated: ${new Date(
                  product.updatedAt
                ).toLocaleString("en-IN")}`
              : ""}
          </p>

        </div>
      </div>

      {/* =====================================================
          STOCK SUMMARY
      ===================================================== */}

      <div className="mb-[20px] grid grid-cols-1 gap-[14px] md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">
          <p className="text-[10px] font-medium uppercase text-[#8a97aa]">
            Current Stock
          </p>

          <p className="mt-[8px] text-[27px] font-semibold text-[#172033]">
            {currentStock}
          </p>

          <p className="mt-[4px] text-[9px] text-[#8a97aa]">
            Selected variant
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">
          <p className="text-[10px] font-medium uppercase text-[#8a97aa]">
            Low Stock Threshold
          </p>

          <p className="mt-[8px] text-[27px] font-semibold text-[#172033]">
            {LOW_STOCK_THRESHOLD}
          </p>

          <p className="mt-[4px] text-[9px] text-[#a36b00]">
            Alert threshold
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">
          <p className="text-[10px] font-medium uppercase text-[#8a97aa]">
            Status
          </p>

          <p className="mt-[8px] text-[21px] font-semibold text-[#172033]">
            {stockStatus}
          </p>

          <p className="mt-[6px] text-[9px] text-[#8a97aa]">
            Current inventory state
          </p>
        </div>

        <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">
          <p className="text-[10px] font-medium uppercase text-[#8a97aa]">
            Total Product Stock
          </p>

          <p className="mt-[8px] text-[27px] font-semibold text-[#172033]">
            {totalProductStock}
          </p>

          <p className="mt-[4px] text-[9px] text-[#8a97aa]">
            All variants combined
          </p>
        </div>

      </div>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_290px]">

        {/* ===================================================
            LEFT
        =================================================== */}

        <div>

          {/* VARIANT SELECTOR */}

          <div className="mb-[18px] rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <p className="mb-[9px] text-[10px] font-medium uppercase tracking-[0.04em] text-[#7d8a9c]">
              Select Variant
            </p>

            <div className="grid grid-cols-1 gap-[9px] sm:grid-cols-2 lg:grid-cols-3">

              {product.variants?.map(
                (variant) => (
                  <button
                    key={variant._id}
                    type="button"
                    onClick={() =>
                      setSelectedVariantId(
                        variant._id
                      )
                    }
                    className={`rounded-[9px] border p-[12px] text-left transition ${
                      String(
                        selectedVariantId
                      ) ===
                      String(
                        variant._id
                      )
                        ? "border-[#1557f5] bg-[#edf3ff]"
                        : "border-[#e1e7ef] bg-white hover:border-[#aac3f1] hover:bg-[#f8faff]"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-[10px] font-semibold text-[#273247]">
                        {variant.size ||
                          "—"}
                      </span>

                      <span className="text-[9px] font-medium text-[#1557f5]">
                        {variant.stock}
                      </span>

                    </div>

                    <p className="mt-[5px] text-[8px] text-[#7d8a9c]">
                      {variant.color ||
                        "—"}
                    </p>

                    <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                      {variant.sku ||
                        "—"}
                    </p>

                  </button>
                )
              )}

            </div>
          </div>

          {/* ADJUST STOCK */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[20px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <div className="mb-[18px] flex items-center justify-between">

              <div>
                <h2 className="text-[15px] font-semibold text-[#172033]">
                  Adjust Stock
                </h2>

                <p className="mt-[4px] text-[10px] text-[#8a97aa]">
                  Update stock for the selected product variant.
                </p>
              </div>

              <span className="rounded-[6px] bg-[#edf3ff] px-[9px] py-[6px] text-[8px] font-semibold text-[#1557f5]">
                CURRENT STOCK:{" "}
                {currentStock}
              </span>

            </div>

            {/* ACTION TYPE */}

            <div className="mb-[17px]">

              <p className="mb-[7px] text-[9px] font-medium uppercase text-[#7d8a9c]">
                Action Type
              </p>

              <div className="grid grid-cols-2 overflow-hidden rounded-[7px] border border-[#dfe6ef]">

                <button
                  type="button"
                  onClick={() =>
                    setAdjustmentType("add")
                  }
                  className={`h-[42px] text-[9px] font-semibold transition ${
                    adjustmentType ===
                    "add"
                      ? "bg-[#1557f5] text-white"
                      : "bg-white text-[#718096] hover:bg-[#f5f8ff]"
                  }`}
                >
                  + ADD STOCK
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAdjustmentType(
                      "remove"
                    )
                  }
                  className={`h-[42px] text-[9px] font-semibold transition ${
                    adjustmentType ===
                    "remove"
                      ? "bg-[#1557f5] text-white"
                      : "bg-white text-[#718096] hover:bg-[#f5f8ff]"
                  }`}
                >
                  − REMOVE STOCK
                </button>

              </div>
            </div>

            {/* QUANTITY + REASON */}

            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">

              <div>
                <p className="mb-[7px] text-[9px] font-medium uppercase text-[#7d8a9c]">
                  Quantity
                </p>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value
                    )
                  }
                  className="h-[42px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[10px] text-[#273247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                />
              </div>

              <div>
                <p className="mb-[7px] text-[9px] font-medium uppercase text-[#7d8a9c]">
                  Reason Code
                </p>

                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(
                      e.target.value
                    )
                  }
                  className="h-[42px] w-full rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[10px] text-[#273247] outline-none focus:border-[#6f9cf7] focus:bg-white"
                >
                  <option>
                    New Stock Received
                  </option>

                  <option>
                    Damaged Stock
                  </option>

                  <option>
                    Stock Correction
                  </option>

                  <option>
                    Returned Stock
                  </option>

                  <option>
                    Manual Adjustment
                  </option>
                </select>
              </div>

            </div>

            {/* NOTE */}

            <div className="mt-[14px]">

              <p className="mb-[7px] text-[9px] font-medium uppercase text-[#7d8a9c]">
                Admin Note (Optional)
              </p>

              <textarea
                value={adminNote}
                onChange={(e) =>
                  setAdminNote(
                    e.target.value
                  )
                }
                rows="3"
                placeholder="Enter details about this adjustment..."
                className="w-full resize-none rounded-[7px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] py-[10px] text-[10px] text-[#273247] outline-none placeholder:text-[#a1adbd] focus:border-[#6f9cf7] focus:bg-white"
              />

            </div>

            {/* PREVIEW */}

            <div className="mt-[15px] rounded-[8px] bg-[#f7f9fd] px-[15px] py-[14px]">

              <div className="flex flex-wrap items-center justify-between gap-[10px]">

                <div className="flex items-center gap-[8px]">

                  <span className="text-[10px] text-[#718096]">
                    {currentStock}
                  </span>

                  <span className="text-[10px] text-[#9aa6b6]">
                    {adjustmentType ===
                    "add"
                      ? "+"
                      : "−"}
                  </span>

                  <span className="text-[10px] text-[#718096]">
                    {quantity || 0}
                  </span>

                  <span className="text-[10px] text-[#9aa6b6]">
                    =
                  </span>

                  <span className="text-[17px] font-semibold text-[#1557f5]">
                    {previewStock}
                  </span>

                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    handleSaveAdjustment
                  }
                  className="h-[40px] rounded-[7px] bg-[#1557f5] px-[20px] text-[9px] font-semibold text-white transition hover:bg-[#0d46d1] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "SAVING..."
                    : "SAVE STOCK ADJUSTMENT"}
                </button>

              </div>

            </div>

          </div>

          {/* LOW STOCK THRESHOLD */}

          <div className="mt-[18px] rounded-[14px] border border-[#e6ebf3] bg-white p-[18px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <div className="flex flex-col justify-between gap-[12px] sm:flex-row sm:items-center">

              <div>
                <h3 className="text-[12px] font-semibold text-[#273247]">
                  Low Stock Threshold
                </h3>

                <p className="mt-[4px] text-[9px] text-[#8a97aa]">
                  Products at or below this quantity are considered low stock.
                </p>
              </div>

              <div className="flex items-center gap-[8px]">

                <input
                  type="number"
                  min="0"
                  value={LOW_STOCK_THRESHOLD}
                  readOnly
                  className="h-[38px] w-[70px] rounded-[6px] border border-[#dfe6ef] bg-[#f9fbfe] px-[10px] text-center text-[10px] text-[#273247] outline-none"
                />

                <span className="text-[8px] font-semibold text-[#1557f5]">
                  CURRENT
                </span>

              </div>

            </div>

          </div>

          {error && (
            <div className="mt-[14px] rounded-[8px] border border-[#f1c8d0] bg-[#fff5f6] px-[14px] py-[11px] text-[10px] text-[#d93650]">
              {error}
            </div>
          )}

        </div>

        {/* ===================================================
            RIGHT
        =================================================== */}

        <div className="space-y-[18px]">

          {/* PRODUCT INFORMATION */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[16px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <h3 className="mb-[12px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#7d8a9c]">
              Product Information
            </h3>

            <div className="flex gap-[10px]">

              <div className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[7px] border border-[#dfe6ef] bg-[#f4f7fb]">

                {productImage ? (
                  <img
                    src={productImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[20px] text-[#9aa7b8]">
                    ◇
                  </div>
                )}

              </div>

              <div className="min-w-0">

                <p className="text-[10px] font-semibold text-[#273247]">
                  {product.name}
                </p>

                <p className="mt-[4px] text-[8px] text-[#8a97aa]">
                  {product.anime ||
                    "—"}
                </p>

                <p className="mt-[5px] text-[10px] font-medium text-[#1557f5]">
                  {getPrice(product)}
                </p>

              </div>

            </div>

            <div className="mt-[15px] space-y-[9px] border-t border-[#edf1f6] pt-[13px]">

              <div className="flex justify-between gap-[10px]">
                <span className="text-[8px] text-[#8a97aa]">
                  SKU
                </span>

                <span className="text-[8px] font-medium text-[#4f5e72]">
                  {selectedVariant?.sku ||
                    "—"}
                </span>
              </div>

              <div className="flex justify-between gap-[10px]">
                <span className="text-[8px] text-[#8a97aa]">
                  COLOR
                </span>

                <span className="text-[8px] font-medium text-[#4f5e72]">
                  {selectedVariant?.color ||
                    "—"}
                </span>
              </div>

              <div className="flex justify-between gap-[10px]">
                <span className="text-[8px] text-[#8a97aa]">
                  SIZE
                </span>

                <span className="text-[8px] font-medium text-[#4f5e72]">
                  {selectedVariant?.size ||
                    "—"}
                </span>
              </div>

              <div className="flex justify-between gap-[10px]">
                <span className="text-[8px] text-[#8a97aa]">
                  CATEGORY
                </span>

                <span className="text-[8px] font-medium text-[#4f5e72]">
                  {typeof product.category ===
                  "object"
                    ? product.category?.name ||
                      "—"
                    : product.category ||
                      "—"}
                </span>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/products/${productId}/edit`
                )
              }
              className="mt-[15px] w-full rounded-[6px] border border-[#dfe6ef] bg-white py-[9px] text-[8px] font-semibold uppercase text-[#1557f5] transition hover:border-[#1557f5] hover:bg-[#edf3ff]"
            >
              Edit Product Details
            </button>

          </div>

          {/* STOCK HEALTH */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[16px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <h3 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#7d8a9c]">
              Stock Health
            </h3>

            <div className="mt-[12px] flex items-end justify-between">

              <div>
                <span className="text-[25px] font-semibold text-[#172033]">
                  {currentStock}
                </span>

                <span className="ml-[5px] text-[9px] text-[#8a97aa]">
                  / {LOW_STOCK_THRESHOLD} threshold
                </span>
              </div>

            </div>

            <div className="mt-[12px] h-[7px] overflow-hidden rounded-full bg-[#edf1f6]">

              <div
                className={`h-full rounded-full ${
                  currentStock === 0
                    ? "bg-[#d93650]"
                    : currentStock <=
                      LOW_STOCK_THRESHOLD
                    ? "bg-[#e2a72b]"
                    : "bg-[#1557f5]"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      5,
                      (currentStock /
                        Math.max(
                          LOW_STOCK_THRESHOLD *
                            4,
                          1
                        )) *
                        100
                    )
                  )}%`,
                }}
              />

            </div>

            <p className="mt-[9px] text-[8px] text-[#8a97aa]">
              {currentStock === 0
                ? "Stock is currently unavailable."
                : currentStock <=
                  LOW_STOCK_THRESHOLD
                ? "Stock is low and may require attention."
                : "Stock level is healthy."}
            </p>

          </div>

          {/* VARIANTS */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-white p-[16px] shadow-[0_5px_20px_rgba(30,64,175,0.04)]">

            <h3 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#7d8a9c]">
              Product Variants
            </h3>

            <div className="mt-[10px] space-y-[7px]">

              {product.variants?.map(
                (variant) => (
                  <button
                    key={variant._id}
                    type="button"
                    onClick={() =>
                      setSelectedVariantId(
                        variant._id
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-[7px] border px-[10px] py-[9px] text-left transition ${
                      String(
                        selectedVariantId
                      ) ===
                      String(
                        variant._id
                      )
                        ? "border-[#1557f5] bg-[#edf3ff]"
                        : "border-[#edf1f6] bg-[#fafbfd] hover:border-[#bfd1ef]"
                    }`}
                  >

                    <div>
                      <p className="text-[8px] font-medium text-[#39465a]">
                        {variant.color} /{" "}
                        {variant.size}
                      </p>

                      <p className="mt-[3px] text-[7px] text-[#9aa6b6]">
                        {variant.sku}
                      </p>
                    </div>

                    <span className="text-[10px] font-semibold text-[#1557f5]">
                      {variant.stock}
                    </span>

                  </button>
                )
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default InventoryDetailsPage;