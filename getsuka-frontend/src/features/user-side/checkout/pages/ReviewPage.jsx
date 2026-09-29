// Frontend
// GETSUKA/getsuka-frontend/src/features/user-side/checkout/pages/ReviewPage.jsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MapPin,
  Truck,
  Package,
} from "lucide-react";

const SHIPPING_STORAGE_KEY =
  "getsukaCheckoutShipping";

const CART_KEYS = [
  "getsukaCart",
  "cart",
  "cartItems",
];

// ============================================================
// GET CART FROM STORAGE
// ============================================================

const getCartFromStorage = () => {
  for (const key of CART_KEYS) {
    try {
      const stored =
        localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      const parsed =
        JSON.parse(stored);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        Array.isArray(
          parsed?.items
        )
      ) {
        return parsed.items;
      }

      if (
        Array.isArray(
          parsed?.cartItems
        )
      ) {
        return parsed.cartItems;
      }
    } catch (error) {
      console.error(
        `Failed to read cart from ${key}:`,
        error
      );
    }
  }

  return [];
};

// ============================================================
// PRODUCT IMAGE
// ============================================================

const getProductImage = (item) => {
  if (!item) {
    return "";
  }

  if (
    Array.isArray(item.images) &&
    item.images.length > 0
  ) {
    const firstImage =
      item.images[0];

    if (
      typeof firstImage ===
      "string"
    ) {
      return firstImage;
    }

    return (
      firstImage?.url ||
      firstImage?.secure_url ||
      firstImage?.path ||
      ""
    );
  }

  if (
    typeof item.image ===
    "string"
  ) {
    return item.image;
  }

  if (
    typeof item.imageUrl ===
    "string"
  ) {
    return item.imageUrl;
  }

  if (
    typeof item.productImage ===
    "string"
  ) {
    return item.productImage;
  }

  return "";
};

// ============================================================
// PRODUCT NAME
// ============================================================

const getProductName = (item) => {
  return (
    item?.productName ||
    item?.name ||
    item?.title ||
    item?.product?.name ||
    item?.product?.title ||
    "Product"
  );
};

// ============================================================
// PRODUCT PRICE
// ============================================================

const getProductPrice = (item) => {
  const price =
    item?.finalPrice ??
    item?.price ??
    item?.product?.finalPrice ??
    item?.product?.price ??
    0;

  const numericPrice =
    Number(price);

  return Number.isFinite(
    numericPrice
  )
    ? numericPrice
    : 0;
};

// ============================================================
// PRODUCT QUANTITY
// ============================================================

const getProductQuantity = (item) => {
  const quantity =
    item?.quantity ??
    item?.qty ??
    item?.productQuantity ??
    1;

  const numericQuantity =
    Number(quantity);

  return Number.isFinite(
    numericQuantity
  ) &&
    numericQuantity > 0
    ? numericQuantity
    : 1;
};

// ============================================================
// PRODUCT SIZE
// ============================================================

const getProductSize = (item) => {
  return (
    item?.size ||
    item?.selectedSize ||
    item?.variant?.size ||
    ""
  );
};

// ============================================================
// PRODUCT COLOR
// ============================================================

const getProductColor = (item) => {
  return (
    item?.color ||
    item?.selectedColor ||
    item?.variant?.color ||
    ""
  );
};

// ============================================================
// FORMAT CURRENCY
// ============================================================

const formatCurrency = (
  value
) => {
  const amount =
    Number(value) || 0;

  return `₹${amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  )}`;
};

// ============================================================
// REVIEW PAGE
// ============================================================

const ReviewPage = () => {
  const navigate =
    useNavigate();

  const [
    checkoutData,
    setCheckoutData,
  ] = useState(null);

  const [
    cartItems,
    setCartItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ==========================================================
  // LOAD CHECKOUT DATA
  // ==========================================================

  useEffect(() => {
    try {
      const storedCheckout =
        sessionStorage.getItem(
          SHIPPING_STORAGE_KEY
        );

      if (storedCheckout) {
        const parsedCheckout =
          JSON.parse(
            storedCheckout
          );

        setCheckoutData(
          parsedCheckout
        );
      }

      const storedCart =
        getCartFromStorage();

      setCartItems(
        storedCart
      );
    } catch (error) {
      console.error(
        "Failed to load review data:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // CHECKOUT DATA
  // ==========================================================

  const selectedAddress =
    checkoutData?.selectedAddress ||
    null;

  const deliveryMethod =
    checkoutData?.deliveryMethod ||
    checkoutData?.shippingMethod ||
    "Standard Delivery";

  const shippingCharge =
    Number(
      checkoutData?.shippingCharge ??
        checkoutData?.shippingCost ??
        0
    );

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const calculatedSubtotal =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) => {
          const price =
            getProductPrice(item);

          const quantity =
            getProductQuantity(
              item
            );

          return (
            total +
            price * quantity
          );
        },
        0
      );
    }, [cartItems]);

  const subtotal = Number(
    checkoutData?.subtotal ??
      calculatedSubtotal
  );

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  const discount = Number(
    checkoutData?.discount ??
      checkoutData?.discountAmount ??
      0
  );

  // ==========================================================
  // TAX
  // ==========================================================

  const tax = Number(
    checkoutData?.tax ??
      checkoutData?.taxAmount ??
      0
  );

  // ==========================================================
  // TOTAL
  // ==========================================================

  const calculatedTotal =
    subtotal -
    discount +
    tax +
    shippingCharge;

  const total = Number(
    checkoutData?.total ??
      calculatedTotal
  );

  // ==========================================================
  // TOTAL ITEM QUANTITY
  // ==========================================================

  const totalItemQuantity =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) => {
          return (
            total +
            getProductQuantity(
              item
            )
          );
        },
        0
      );
    }, [cartItems]);

  // ==========================================================
  // BACK TO SHIPPING
  // ==========================================================

  const handleBackToShipping =
    () => {
      navigate("/checkout");
    };

  // ==========================================================
  // EDIT SHIPPING
  // ==========================================================

  const handleEditShipping =
    () => {
      navigate("/checkout");
    };

  // ==========================================================
  // CONTINUE TO PAYMENT
  // ==========================================================

  const handleContinueToPayment =
    () => {
      if (!selectedAddress) {
        alert(
          "Please select a delivery address."
        );
        return;
      }

      const paymentCheckoutData =
        {
          ...checkoutData,
          selectedAddress,
          deliveryMethod,
          shippingCharge,
          subtotal,
          discount,
          tax,
          total,
          cartItems,
        };

      sessionStorage.setItem(
        "getsukaCheckoutReview",
        JSON.stringify(
          paymentCheckoutData
        )
      );

      navigate(
        "/checkout/payment"
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] text-white/50">
          LOADING CHECKOUT...
        </p>
      </div>
    );
  }

  // ==========================================================
  // MISSING CHECKOUT DATA
  // ==========================================================

  if (
    !checkoutData ||
    !selectedAddress
  ) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <Package
          size={42}
          className="text-white/30 mb-5"
        />

        <h1 className="text-[18px] font-light tracking-[0.12em]">
          CHECKOUT INFORMATION MISSING
        </h1>

        <p className="text-[10px] tracking-[0.08em] text-white/35 text-center mt-3 mb-6">
          Please go back to shipping
          and select your delivery
          address.
        </p>

        <button
          type="button"
          onClick={
            handleBackToShipping
          }
          className="px-[28px] h-[45px] bg-white text-black text-[9px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition"
        >
          BACK TO SHIPPING
        </button>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          CHECKOUT STEPS
      ===================================================== */}

      <div className="border-b border-white/10">
        <div className="max-w-[1500px] mx-auto px-[32px] py-[24px]">

          <div className="flex items-center gap-4 text-[9px] tracking-[0.22em]">

            <span className="text-white">
              CART
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/35">
              SHIPPING
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-red-500">
              REVIEW
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/30">
              PAYMENT
            </span>

            <span className="text-white/20">
              /
            </span>

            <span className="text-white/30">
              SUCCESS
            </span>

          </div>

        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="bg-black px-[32px] py-[55px]">

        <div className="max-w-[1500px] mx-auto">

          {/* =================================================
              PAGE TITLE
          ================================================= */}

          <div className="mb-[48px]">

            <p className="text-[9px] tracking-[0.35em] text-white/35 mb-[14px]">
              GETSUKA CHECKOUT
            </p>

            <h1 className="text-[30px] font-light tracking-[0.12em]">
              REVIEW
            </h1>

            <p className="text-[11px] text-white/35 mt-[12px]">
              Confirm your shipping
              details and order before
              payment.
            </p>

          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="grid grid-cols-[1fr_390px] gap-[60px]">

            {/* ================================================
                LEFT
            ================================================ */}

            <section>

              {/* ==============================================
                  SHIPPING ADDRESS
              ============================================== */}

              <div className="mb-[42px]">

                <div className="flex items-center justify-between mb-[22px]">

                  <div>

                    <p className="text-[9px] tracking-[0.25em] text-white/30 mb-[8px]">
                      STEP 01
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      DELIVERY ADDRESS
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleEditShipping
                    }
                    className="text-[9px] tracking-[0.18em] text-red-500 hover:text-red-400 transition"
                  >
                    EDIT
                  </button>

                </div>

                <div className="border border-white/10 bg-black">

                  <div className="px-[24px] py-[24px]">

                    <div className="flex items-start justify-between gap-[20px]">

                      <div>

                        <p className="text-[12px] tracking-[0.12em] text-white uppercase">
                          {
                            selectedAddress.fullName
                          }
                        </p>

                        <p className="text-[10px] text-white/45 mt-[14px] leading-[1.9]">
                          {
                            selectedAddress.addressLine
                          }
                          <br />

                          {
                            selectedAddress.city
                          }
                          ,{" "}
                          {
                            selectedAddress.state
                          }{" "}
                          -{" "}
                          {
                            selectedAddress.pincode
                          }
                        </p>

                        {selectedAddress.phone && (
                          <div className="border-t border-white/10 mt-[18px] pt-[16px]">

                            <p className="text-[9px] text-white/45 tracking-[0.08em]">
                              {
                                selectedAddress.phone
                              }
                            </p>

                          </div>
                        )}

                      </div>

                      <MapPin
                        size={17}
                        className="text-red-500 shrink-0"
                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* ==============================================
                  DELIVERY METHOD
              ============================================== */}

              <div className="mb-[42px]">

                <div className="flex items-center justify-between mb-[22px]">

                  <div>

                    <p className="text-[9px] tracking-[0.25em] text-white/30 mb-[8px]">
                      STEP 02
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      DELIVERY METHOD
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleEditShipping
                    }
                    className="text-[9px] tracking-[0.18em] text-red-500 hover:text-red-400 transition"
                  >
                    EDIT
                  </button>

                </div>

                <div className="border border-white/10 bg-black">

                  <div className="px-[24px] py-[24px] flex items-center justify-between gap-[20px]">

                    <div>

                      <p className="text-[11px] tracking-[0.12em] text-white uppercase">
                        {deliveryMethod}
                      </p>

                      <p className="text-[9px] text-white/35 mt-[9px]">
                        Selected delivery option
                      </p>

                    </div>

                    <div className="flex items-center gap-[12px]">

                      <Truck
                        size={16}
                        className="text-red-500"
                      />

                      <p className="text-[10px] tracking-[0.08em]">

                        {shippingCharge ===
                        0
                          ? "FREE"
                          : formatCurrency(
                              shippingCharge
                            )}

                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* ==============================================
                  ORDER ITEMS
              ============================================== */}

              <div>

                <div className="flex items-center justify-between mb-[22px]">

                  <div>

                    <p className="text-[9px] tracking-[0.25em] text-white/30 mb-[8px]">
                      STEP 03
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      ORDER ITEMS
                    </h2>

                  </div>

                  <span className="text-[9px] tracking-[0.15em] text-white/30">
                    {totalItemQuantity}{" "}
                    {totalItemQuantity ===
                    1
                      ? "ITEM"
                      : "ITEMS"}
                  </span>

                </div>

                <div className="border border-white/10 bg-black">

                  {cartItems.length ===
                  0 ? (
                    <div className="px-[24px] py-[50px] text-center">

                      <Package
                        size={25}
                        className="mx-auto text-white/20"
                      />

                      <p className="text-[9px] tracking-[0.2em] text-white/30 mt-[15px]">
                        NO CART ITEMS FOUND
                      </p>

                    </div>
                  ) : (
                    <div>

                      {cartItems.map(
                        (
                          item,
                          index
                        ) => {
                          const name =
                            getProductName(
                              item
                            );

                          const price =
                            getProductPrice(
                              item
                            );

                          const quantity =
                            getProductQuantity(
                              item
                            );

                          const image =
                            getProductImage(
                              item
                            );

                          const size =
                            getProductSize(
                              item
                            );

                          const color =
                            getProductColor(
                              item
                            );

                          return (
                            <div
                              key={
                                item?._id ||
                                item?.id ||
                                `${name}-${index}`
                              }
                              className={`px-[24px] py-[20px] flex gap-[18px] ${
                                index <
                                cartItems.length -
                                  1
                                  ? "border-b border-white/10"
                                  : ""
                              }`}
                            >

                              {/* IMAGE */}

                              <div className="w-[70px] h-[88px] bg-[#111] overflow-hidden shrink-0">

                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      name
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package
                                      size={
                                        20
                                      }
                                      className="text-white/20"
                                    />
                                  </div>
                                )}

                              </div>

                              {/* PRODUCT INFO */}

                              <div className="flex-1 min-w-0">

                                <p className="text-[10px] tracking-[0.12em] text-white uppercase truncate">
                                  {
                                    name
                                  }
                                </p>

                                <div className="mt-[9px] space-y-[4px]">

                                  {size && (
                                    <p className="text-[8px] text-white/35">
                                      SIZE:{" "}
                                      {
                                        size
                                      }
                                    </p>
                                  )}

                                  {color && (
                                    <p className="text-[8px] text-white/35">
                                      COLOR:{" "}
                                      {
                                        color
                                      }
                                    </p>
                                  )}

                                  <p className="text-[8px] text-white/35">
                                    QTY:{" "}
                                    {
                                      quantity
                                    }
                                  </p>

                                </div>

                              </div>

                              {/* PRICE */}

                              <div className="text-right shrink-0">

                                <p className="text-[10px] text-white">
                                  {formatCurrency(
                                    price *
                                      quantity
                                  )}
                                </p>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>

              </div>

            </section>

            {/* ================================================
                RIGHT — ORDER SUMMARY
            ================================================ */}

            <aside className="h-fit">

              <div className="border border-white/10 bg-black">

                {/* SUMMARY HEADER */}

                <div className="px-[26px] py-[28px] border-b border-white/10 flex items-center justify-between">

                  <h2 className="text-[15px] font-light tracking-[0.16em]">
                    ORDER SUMMARY
                  </h2>

                  <span className="text-[8px] tracking-[0.18em] text-white/30">
                    {totalItemQuantity}{" "}
                    {totalItemQuantity ===
                    1
                      ? "ITEM"
                      : "ITEMS"}
                  </span>

                </div>

                {/* MINI PRODUCTS */}

                <div className="px-[26px]">

                  {cartItems.map(
                    (
                      item,
                      index
                    ) => {
                      const name =
                        getProductName(
                          item
                        );

                      const price =
                        getProductPrice(
                          item
                        );

                      const quantity =
                        getProductQuantity(
                          item
                        );

                      const image =
                        getProductImage(
                          item
                        );

                      const size =
                        getProductSize(
                          item
                        );

                      const color =
                        getProductColor(
                          item
                        );

                      return (
                        <div
                          key={
                            item?._id ||
                            item?.id ||
                            `summary-${index}`
                          }
                          className="py-[20px] flex gap-[14px] border-b border-white/10"
                        >

                          <div className="w-[58px] h-[72px] bg-[#111] overflow-hidden shrink-0">

                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  name
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package
                                  size={
                                    18
                                  }
                                  className="text-white/20"
                                />
                              </div>
                            )}

                          </div>

                          <div className="flex-1 min-w-0">

                            <p className="text-[9px] tracking-[0.08em] text-white uppercase truncate">
                              {
                                name
                              }
                            </p>

                            <p className="text-[7px] text-white/35 mt-[8px]">
                              {size
                                ? `Size: ${size}`
                                : ""}
                              {size &&
                              color
                                ? " | "
                                : ""}
                              {color
                                ? `Color: ${color}`
                                : ""}
                            </p>

                            <p className="text-[7px] text-white/30 mt-[8px]">
                              QTY{" "}
                              {
                                quantity
                              }
                            </p>

                          </div>

                          <div className="text-right shrink-0">

                            <p className="text-[9px] text-white">
                              {formatCurrency(
                                price *
                                  quantity
                              )}
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

                {/* TOTALS */}

                <div className="px-[26px] py-[25px]">

                  <div className="space-y-[18px]">

                    {/* SUBTOTAL */}

                    <div className="flex items-center justify-between text-[9px]">

                      <span className="text-white/35">
                        SUBTOTAL
                      </span>

                      <span className="text-white">
                        {formatCurrency(
                          subtotal
                        )}
                      </span>

                    </div>

                    {/* DISCOUNT */}

                    {discount >
                      0 && (
                      <div className="flex items-center justify-between text-[9px]">

                        <span className="text-white/35">
                          DISCOUNT
                        </span>

                        <span className="text-red-500">
                          -
                          {formatCurrency(
                            discount
                          )}
                        </span>

                      </div>
                    )}

                    {/* TAX */}

                    {tax > 0 && (
                      <div className="flex items-center justify-between text-[9px]">

                        <span className="text-white/35">
                          TAX
                        </span>

                        <span className="text-white">
                          {formatCurrency(
                            tax
                          )}
                        </span>

                      </div>
                    )}

                    {/* SHIPPING */}

                    <div className="flex items-center justify-between text-[9px]">

                      <span className="text-white/35">
                        SHIPPING
                      </span>

                      <span
                        className={
                          shippingCharge ===
                          0
                            ? "text-red-500"
                            : "text-white"
                        }
                      >
                        {shippingCharge ===
                        0
                          ? "FREE"
                          : formatCurrency(
                              shippingCharge
                            )}
                      </span>

                    </div>

                  </div>

                  {/* TOTAL */}

                  <div className="border-t border-white/10 mt-[22px] pt-[22px] flex items-center justify-between">

                    <span className="text-[10px] tracking-[0.16em]">
                      TOTAL
                    </span>

                    <span className="text-[17px] text-red-500">
                      {formatCurrency(
                        total
                      )}
                    </span>

                  </div>

                  {/* CONTINUE */}

                  <button
                    type="button"
                    onClick={
                      handleContinueToPayment
                    }
                    disabled={
                      cartItems.length ===
                      0
                    }
                    className="w-full h-[50px] mt-[28px] bg-white text-black text-[9px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    CONTINUE TO PAYMENT

                    <span className="ml-[12px]">
                      →
                    </span>
                  </button>

                  <p className="text-center text-[8px] text-white/20 mt-[14px] tracking-[0.12em]">
                    YOU WILL CHOOSE YOUR
                    PAYMENT METHOD ON THE
                    NEXT STEP.
                  </p>

                </div>

              </div>

            </aside>

          </div>

        </div>

      </main>

    </div>
  );
};

export default ReviewPage;