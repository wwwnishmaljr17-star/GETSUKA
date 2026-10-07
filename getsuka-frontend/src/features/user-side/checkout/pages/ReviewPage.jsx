
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  validateCoupon,
  getAvailableCoupons,
} from "../api/couponApi";
import axiosInstance from "../../../../lib/axios";

const SHIPPING_STORAGE_KEY =
  "getsukaCheckoutShipping";

const REVIEW_STORAGE_KEY =
  "getsukaCheckoutReview";

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
      const stored = localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (Array.isArray(parsed?.items)) {
        return parsed.items;
      }

      if (Array.isArray(parsed?.cartItems)) {
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
    const firstImage = item.images[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    return (
      firstImage?.url ||
      firstImage?.secure_url ||
      firstImage?.path ||
      ""
    );
  }

  if (typeof item.image === "string") {
    return item.image;
  }

  if (typeof item.imageUrl === "string") {
    return item.imageUrl;
  }

  if (typeof item.productImage === "string") {
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

  const numericPrice = Number(price);

  return Number.isFinite(numericPrice)
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

  const numericQuantity = Number(quantity);

  return Number.isFinite(numericQuantity) &&
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

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// ============================================================
// INLINE ICONS
// ============================================================

const MapPinIcon = ({
  size = 17,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle
      cx="12"
      cy="10"
      r="2.5"
    />
  </svg>
);

const TruckIcon = ({
  size = 16,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 6h11v10H3z" />
    <path d="M14 9h4l3 3v4h-7z" />
    <circle
      cx="7"
      cy="18"
      r="2"
    />
    <circle
      cx="18"
      cy="18"
      r="2"
    />
  </svg>
);

const PackageIcon = ({
  size = 25,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
    aria-hidden="true"
  >
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4.5 7.5 12 12l7.5-4.5" />
    <path d="M12 12v9" />
  </svg>
);

// ============================================================
// REVIEW PAGE
// ============================================================

const ReviewPage = () => {
  const navigate = useNavigate();

  // ==========================================================
  // STATES
  // ==========================================================

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

  const [
    couponCode,
    setCouponCode,
  ] = useState("");

  const [
    appliedCoupon,
    setAppliedCoupon,
  ] = useState(null);

  const [
    couponLoading,
    setCouponLoading,
  ] = useState(false);

  const [
    couponError,
    setCouponError,
  ] = useState("");

  const [
    couponSuccess,
    setCouponSuccess,
  ] = useState("");

  const [
    couponModalOpen,
    setCouponModalOpen,
  ] = useState(false);

  const [
    availableCoupons,
    setAvailableCoupons,
  ] = useState([]);

  const [
    couponListLoading,
    setCouponListLoading,
  ] = useState(false);

  const [
    usedCouponCodes,
    setUsedCouponCodes,
  ] = useState(new Set());

  const [
    usedCouponsLoaded,
    setUsedCouponsLoaded,
  ] = useState(false);

  const [
    usedCouponsLoadError,
    setUsedCouponsLoadError,
  ] = useState(false);

  // ==========================================================
  // LOAD USED COUPONS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadUsedCoupons = async () => {
      try {
        const response =
          await axiosInstance.get(
            "/api/user/orders"
          );

        const orders =
          Array.isArray(
            response?.data?.orders
          )
            ? response.data.orders
            : [];

        const usedCodes =
          new Set(
            orders
              .map((order) =>
                String(
                  order?.couponCode ||
                    ""
                )
                  .trim()
                  .toUpperCase()
              )
              .filter(Boolean)
          );

        if (!cancelled) {
          setUsedCouponCodes(
            usedCodes
          );
        }
      } catch (error) {
        console.error(
          "USED COUPONS LOAD ERROR:",
          error
        );

        if (!cancelled) {
          setUsedCouponsLoadError(
            true
          );
        }
      } finally {
        if (!cancelled) {
          setUsedCouponsLoaded(
            true
          );
        }
      }
    };

    loadUsedCoupons();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD CHECKOUT DATA
  // ==========================================================

  useEffect(() => {
    try {
      const storedCheckout =
        sessionStorage.getItem(
          SHIPPING_STORAGE_KEY
        );

      const storedReview =
        sessionStorage.getItem(
          REVIEW_STORAGE_KEY
        );

      if (storedReview) {
        const parsedReview =
          JSON.parse(
            storedReview
          );

        setCheckoutData(
          parsedReview
        );
      } else if (
        storedCheckout
      ) {
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
  // TAX
  // ==========================================================

  const tax = Number(
    checkoutData?.tax ??
      checkoutData?.taxAmount ??
      0
  );

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  const discount = Number(
    appliedCoupon?.discountAmount ??
      checkoutData?.discount ??
      checkoutData?.discountAmount ??
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
    appliedCoupon
      ? calculatedTotal
      : checkoutData?.total ??
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
  // RESTORE COUPON
  // ==========================================================

  useEffect(() => {
    if (
      !usedCouponsLoaded ||
      usedCouponsLoadError
    ) {
      return;
    }

    try {
      const storedReview =
        sessionStorage.getItem(
          REVIEW_STORAGE_KEY
        );

      if (!storedReview) {
        return;
      }

      const parsedReview =
        JSON.parse(
          storedReview
        );

      const storedCouponCode =
        String(
          parsedReview?.couponCode ||
            ""
        )
          .trim()
          .toUpperCase();

      if (!storedCouponCode) {
        return;
      }

      const alreadyUsed =
        usedCouponCodes.has(
          storedCouponCode
        );

      const storedCoupon =
        parsedReview?.coupon ||
        {};

      const storedCouponIsOneUse =
        storedCoupon?.oneUsePerUser ===
        true;

      if (
        alreadyUsed &&
        storedCouponIsOneUse
      ) {
        setCouponCode("");
        setAppliedCoupon(null);

        const updatedReview = {
          ...parsedReview,
          couponCode: "",
          discount: 0,
          discountAmount: 0,
          coupon: null,
          total:
            subtotal +
            tax +
            shippingCharge,
        };

        sessionStorage.setItem(
          REVIEW_STORAGE_KEY,
          JSON.stringify(
            updatedReview
          )
        );

        return;
      }

      setCouponCode(
        storedCouponCode
      );

      if (
        Number(
          parsedReview?.discount
        ) > 0
      ) {
        setAppliedCoupon({
          code:
            storedCouponCode,
          discountAmount:
            Number(
              parsedReview.discount
            ),
          coupon:
            parsedReview?.coupon,
        });
      }
    } catch (error) {
      console.error(
        "Failed to restore coupon:",
        error
      );
    }
  }, [
    usedCouponsLoaded,
    usedCouponsLoadError,
    usedCouponCodes,
    subtotal,
    tax,
    shippingCharge,
  ]);

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
  // OPEN AVAILABLE COUPONS
  // ==========================================================

  const openCouponModal =
    async () => {
      setCouponModalOpen(true);
      setCouponError("");

      try {
        setCouponListLoading(
          true
        );

        const response =
          await getAvailableCoupons();

        const coupons =
          Array.isArray(
            response?.coupons
          )
            ? response.coupons
            : Array.isArray(
                  response?.data
                    ?.coupons
                )
              ? response.data
                  .coupons
              : Array.isArray(
                    response?.data
                  )
                ? response.data
                : Array.isArray(
                      response
                    )
                  ? response
                  : [];

        const now =
          new Date();

        const formattedCoupons =
          coupons
            .map((coupon) => {
              const validFrom =
                coupon?.validFrom
                  ? new Date(
                      coupon.validFrom
                    )
                  : null;

              const validUntil =
                coupon?.validUntil
                  ? new Date(
                      coupon.validUntil
                    )
                  : null;

              const usageLimit =
                Number(
                  coupon?.usageLimit
                );

              const usedCount =
                Number(
                  coupon?.usedCount ||
                    0
                );

              const minOrderAmount =
                Number(
                  coupon?.minOrderAmount ||
                    0
                );

              const discountValue =
                Number(
                  coupon?.discountValue ||
                    0
                );

              const discountType =
                coupon?.discountType;

              const code =
                String(
                  coupon?.code ||
                    ""
                )
                  .trim()
                  .toUpperCase();

              const alreadyUsed =
                usedCouponCodes.has(
                  code
                );

              const active =
                coupon?.isActive !==
                false;

              const withinDates =
                (!validFrom ||
                  now >=
                    validFrom) &&
                (!validUntil ||
                  now <=
                    validUntil);

              const withinUsage =
                !Number.isFinite(
                  usageLimit
                ) ||
                usageLimit <= 0 ||
                usedCount <
                  usageLimit;

              const oneUseBlocked =
                coupon?.oneUsePerUser ===
                  true &&
                alreadyUsed;

              const minimumMet =
                subtotal >=
                minOrderAmount;

              let previewDiscount =
                0;

              if (
                discountType ===
                "percentage"
              ) {
                previewDiscount =
                  subtotal *
                  (discountValue /
                    100);

                if (
                  coupon?.maxDiscountAmount !=
                  null
                ) {
                  previewDiscount =
                    Math.min(
                      previewDiscount,
                      Number(
                        coupon.maxDiscountAmount
                      )
                    );
                }
              } else {
                previewDiscount =
                  discountValue;
              }

              previewDiscount =
                Math.max(
                  0,
                  Math.min(
                    previewDiscount,
                    subtotal
                  )
                );

              return {
                ...coupon,
                code,
                minOrderAmount,
                discountValue,
                previewDiscount,
                alreadyUsed,
                oneUseBlocked,
                minimumMet,
                eligible:
                  active &&
                  withinDates &&
                  withinUsage &&
                  minimumMet &&
                  !oneUseBlocked,
              };
            })
            .filter(
              (coupon) =>
                coupon.code
            )
            .sort((a, b) => {
              if (
                a.eligible !==
                b.eligible
              ) {
                return a.eligible
                  ? -1
                  : 1;
              }

              return (
                b.previewDiscount -
                a.previewDiscount
              );
            });

        setAvailableCoupons(
          formattedCoupons
        );
      } catch (error) {
        console.error(
          "Get Available Coupons Error:",
          error
        );

        setAvailableCoupons(
          []
        );

        setCouponError(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to load available coupons."
        );
      } finally {
        setCouponListLoading(
          false
        );
      }
    };

  // ==========================================================
  // APPLY AVAILABLE COUPON
  // ==========================================================

  const handleApplyAvailableCoupon =
    async (coupon) => {
      if (
        !coupon?.code ||
        !coupon.eligible ||
        appliedCoupon
      ) {
        return;
      }

      if (coupon.oneUseBlocked) {
        setCouponError(
          `${coupon.code} has already been used once and is not available again.`
        );
        return;
      }

      try {
        setCouponLoading(
          true
        );
        setCouponError("");
        setCouponSuccess("");

        const response =
          await validateCoupon(
            coupon.code,
            subtotal
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to apply coupon."
          );
        }

        const responseCoupon =
          response?.coupon ||
          coupon;

        if (
          responseCoupon?.oneUsePerUser ===
            true &&
          usedCouponCodes.has(
            coupon.code
          )
        ) {
          throw new Error(
            `${coupon.code} has already been used once and is not available again.`
          );
        }

        const discountAmount =
          Number(
            response.discountAmount ||
              0
          );

        const nextTotal =
          subtotal -
          discountAmount +
          tax +
          shippingCharge;

        setCouponCode(
          coupon.code
        );

        setAppliedCoupon({
          code: coupon.code,
          discountAmount,
          coupon:
            responseCoupon,
        });

        setCheckoutData(
          (previous) => ({
            ...(previous || {}),
            couponCode:
              coupon.code,
            discount:
              discountAmount,
            discountAmount,
            total: nextTotal,
          })
        );

        sessionStorage.setItem(
          REVIEW_STORAGE_KEY,
          JSON.stringify({
            ...(checkoutData ||
              {}),
            couponCode:
              coupon.code,
            discount:
              discountAmount,
            discountAmount,
            total: nextTotal,
            selectedAddress,
            deliveryMethod,
            shippingCharge,
            subtotal,
            tax,
            cartItems,
            coupon:
              responseCoupon,
          })
        );

        setCouponSuccess(
          response.message ||
            "Coupon applied successfully."
        );

        setCouponModalOpen(
          false
        );
      } catch (error) {
        console.error(
          "Apply Available Coupon Error:",
          error
        );

        setCouponError(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to apply coupon."
        );
      } finally {
        setCouponLoading(
          false
        );
      }
    };

  // ==========================================================
  // APPLY MANUAL COUPON
  // ==========================================================

  const handleApplyCoupon =
    async () => {
      const normalizedCode =
        couponCode
          .trim()
          .toUpperCase();

      setCouponError("");
      setCouponSuccess("");

      if (!normalizedCode) {
        setCouponError(
          "Please enter a coupon code."
        );
        return;
      }

      if (appliedCoupon) {
        setCouponError(
          "A coupon is already applied. Remove it before applying another coupon."
        );
        return;
      }

      try {
        setCouponLoading(
          true
        );

        const response =
          await validateCoupon(
            normalizedCode,
            subtotal
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to apply coupon."
          );
        }

        const coupon =
          response?.coupon || {};

        if (
          coupon?.oneUsePerUser ===
            true &&
          usedCouponCodes.has(
            normalizedCode
          )
        ) {
          throw new Error(
            `${normalizedCode} has already been used once and is not available again.`
          );
        }

        const discountAmount =
          Number(
            response.discountAmount ||
              0
          );

        const nextTotal =
          subtotal -
          discountAmount +
          tax +
          shippingCharge;

        setCouponCode(
          normalizedCode
        );

        setAppliedCoupon({
          code:
            normalizedCode,
          discountAmount,
          coupon,
        });

        setCheckoutData(
          (previous) => ({
            ...(previous || {}),
            couponCode:
              normalizedCode,
            discount:
              discountAmount,
            discountAmount,
            total: nextTotal,
          })
        );

        sessionStorage.setItem(
          REVIEW_STORAGE_KEY,
          JSON.stringify({
            ...(checkoutData ||
              {}),
            couponCode:
              normalizedCode,
            discount:
              discountAmount,
            discountAmount,
            total: nextTotal,
            selectedAddress,
            deliveryMethod,
            shippingCharge,
            subtotal,
            tax,
            cartItems,
            coupon,
          })
        );

        setCouponSuccess(
          response.message ||
            "Coupon applied successfully."
        );
      } catch (error) {
        console.error(
          "Apply Coupon Error:",
          error
        );

        setAppliedCoupon(null);

        setCouponError(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to apply coupon."
        );
      } finally {
        setCouponLoading(
          false
        );
      }
    };

  // ==========================================================
  // REMOVE COUPON
  // ==========================================================

  const handleRemoveCoupon =
    () => {
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");

      const nextTotal =
        subtotal +
        tax +
        shippingCharge;

      setCheckoutData(
        (previous) => {
          const updated = {
            ...(previous || {}),
            couponCode: "",
            discount: 0,
            discountAmount: 0,
            total: nextTotal,
          };

          sessionStorage.setItem(
            REVIEW_STORAGE_KEY,
            JSON.stringify(
              updated
            )
          );

          return updated;
        }
      );

      setCouponSuccess(
        "Coupon removed successfully."
      );
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

      const paymentCheckoutData = {
        ...(checkoutData || {}),
        selectedAddress,
        deliveryMethod,
        shippingCharge,
        subtotal,
        discount,
        tax,
        total,
        couponCode:
          appliedCoupon?.code ||
          "",
        cartItems,
      };

      sessionStorage.setItem(
        REVIEW_STORAGE_KEY,
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
        <PackageIcon
          size={42}
          className="mb-5 text-white/30"
        />

        <h1 className="text-center text-[18px] font-light tracking-[0.12em]">
          CHECKOUT INFORMATION
          MISSING
        </h1>

        <p className="mb-6 mt-3 max-w-md text-center text-[10px] tracking-[0.08em] text-white/35">
          Please go back to shipping
          and select your delivery
          address.
        </p>

        <button
          type="button"
          onClick={
            handleBackToShipping
          }
          className="h-[45px] bg-white px-[28px] text-[9px] tracking-[0.2em] text-black transition hover:bg-red-500 hover:text-white"
        >
          BACK TO SHIPPING
        </button>
      </div>
    );
  }

  // ==========================================================
  // COUPON MODAL
  // ==========================================================

  const couponModal =
    couponModalOpen ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-5"
        onClick={() =>
          setCouponModalOpen(false)
        }
      >
        <div
          className="max-h-[85vh] w-full max-w-[620px] overflow-hidden border border-white/10 bg-[#050505]"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          {/* MODAL HEADER */}

          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-[25px] sm:py-[22px]">
            <div>
              <p className="mb-[7px] text-[8px] tracking-[0.3em] text-white/30">
                GETSUKA OFFERS
              </p>

              <h3 className="text-[14px] font-light tracking-[0.1em] sm:text-[16px] sm:tracking-[0.12em]">
                AVAILABLE COUPONS
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setCouponModalOpen(
                  false
                )
              }
              className="shrink-0 text-[9px] tracking-[0.2em] text-white/40 transition hover:text-white"
            >
              CLOSE
            </button>
          </div>

          {/* COUPON LIST */}

          <div className="max-h-[calc(85vh-90px)] overflow-y-auto p-4 sm:p-[20px]">
            {couponListLoading ? (
              <div className="py-[55px] text-center">
                <p className="text-[9px] tracking-[0.25em] text-white/40">
                  LOADING COUPONS...
                </p>
              </div>
            ) : availableCoupons.length ===
              0 ? (
              <div className="py-[55px] text-center">
                <p className="text-[9px] tracking-[0.25em] text-white/40">
                  NO COUPONS AVAILABLE
                </p>
              </div>
            ) : (
              <div className="space-y-[12px]">
                {availableCoupons.map(
                  (coupon) => (
                    <div
                      key={
                        coupon._id ||
                        coupon.id ||
                        coupon.code
                      }
                      className={`border p-4 sm:p-[18px] ${
                        coupon.eligible
                          ? "border-white/15 bg-white/[0.02]"
                          : "border-white/8 bg-white/[0.01] opacity-60"
                      }`}
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-[18px]">

                        {/* COUPON DETAILS */}

                        <div className="min-w-0">
                          <p className="break-all text-[13px] tracking-[0.18em] text-white">
                            {
                              coupon.code
                            }
                          </p>

                          <p className="mt-[8px] text-[10px] tracking-[0.08em] text-red-500">
                            {coupon.discountType ===
                            "percentage"
                              ? `${coupon.discountValue}% OFF`
                              : `${formatCurrency(
                                  coupon.discountValue
                                )} OFF`}
                          </p>

                          {coupon.previewDiscount >
                            0 && (
                            <p className="mt-[7px] text-[9px] text-white/40">
                              SAVE{" "}
                              {formatCurrency(
                                coupon.previewDiscount
                              )}{" "}
                              ON THIS
                              ORDER
                            </p>
                          )}

                          {coupon.minOrderAmount >
                            0 && (
                            <p className="mt-[7px] text-[9px] text-white/30">
                              MINIMUM
                              ORDER{" "}
                              {formatCurrency(
                                coupon.minOrderAmount
                              )}
                            </p>
                          )}

                          {/* ALREADY USED STATUS */}

                          {coupon.alreadyUsed && (
                            <p className="mt-[10px] text-[8px] font-semibold tracking-[0.12em] text-red-500">
                              ALREADY USED
                              {coupon.oneUseBlocked
                                ? " ONCE — NOT AVAILABLE"
                                : " — REUSABLE COUPON"}
                            </p>
                          )}

                          {!coupon.minimumMet &&
                            coupon.minOrderAmount >
                              0 && (
                              <p className="mt-[10px] text-[8px] tracking-[0.1em] text-white/35">
                                ADD{" "}
                                {formatCurrency(
                                  Math.max(
                                    coupon.minOrderAmount -
                                      subtotal,
                                    0
                                  )
                                )}{" "}
                                MORE
                                TO USE
                              </p>
                            )}

                          {!coupon.minimumMet &&
                            coupon.minOrderAmount ===
                              0 &&
                            !coupon.oneUseBlocked && (
                              <p className="mt-[10px] text-[8px] tracking-[0.1em] text-white/35">
                                NOT
                                AVAILABLE
                              </p>
                            )}
                        </div>

                        {/* APPLY BUTTON */}

                        <button
                          type="button"
                          disabled={
                            !coupon.eligible ||
                            couponLoading ||
                            Boolean(
                              appliedCoupon
                            )
                          }
                          onClick={() =>
                            handleApplyAvailableCoupon(
                              coupon
                            )
                          }
                          className={`w-full shrink-0 px-[12px] py-3 text-[8px] tracking-[0.16em] transition sm:h-[38px] sm:w-auto sm:min-w-[92px] sm:py-0 ${
                            coupon.eligible &&
                            !appliedCoupon
                              ? "bg-white text-black hover:bg-red-500 hover:text-white"
                              : "cursor-not-allowed bg-white/10 text-white/25"
                          }`}
                        >
                          {couponLoading &&
                          coupon.eligible
                            ? "APPLYING..."
                            : coupon.oneUseBlocked
                              ? "USED"
                              : !coupon.minimumMet
                                ? "NOT ELIGIBLE"
                                : "APPLY"}
                        </button>

                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {couponModal}

      {/* =====================================================
          CHECKOUT STEPS
      ===================================================== */}

      <div className="border-b border-white/10">
        <div className="mx-auto w-full max-w-[1500px] px-5 py-5 sm:px-7 lg:px-[32px] lg:py-[24px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[8px] tracking-[0.18em] sm:gap-4 sm:text-[9px] sm:tracking-[0.22em]">

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

      <main className="bg-black px-5 py-10 sm:px-7 sm:py-12 lg:px-[32px] lg:py-[55px]">

        <div className="mx-auto w-full max-w-[1500px]">

          {/* PAGE TITLE */}

          <div className="mb-9 sm:mb-[48px]">

            <p className="mb-[14px] text-[9px] tracking-[0.35em] text-white/35">
              GETSUKA CHECKOUT
            </p>

            <h1 className="text-[26px] font-light tracking-[0.1em] sm:text-[30px] sm:tracking-[0.12em]">
              REVIEW
            </h1>

            <p className="mt-[12px] text-[11px] text-white/35">
              Confirm your shipping
              details and order before
              payment.
            </p>

          </div>

          {/* CONTENT */}

          <div className="grid grid-cols-1 gap-[36px] lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-[60px]">

            {/* =================================================
                LEFT
            ================================================= */}

            <section>

              {/* =================================================
                  DELIVERY ADDRESS
              ================================================= */}

              <div className="mb-[42px]">

                <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">

                  <div>
                    <p className="mb-[8px] text-[9px] tracking-[0.25em] text-white/30">
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
                    className="text-[9px] tracking-[0.18em] text-red-500 transition hover:text-red-400"
                  >
                    EDIT
                  </button>

                </div>

                <div className="border border-white/10 bg-black">

                  <div className="px-4 py-5 sm:px-[24px] sm:py-[24px]">

                    <div className="flex items-start justify-between gap-[20px]">

                      <div className="min-w-0">

                        <p className="break-words text-[12px] uppercase tracking-[0.12em] text-white">
                          {
                            selectedAddress.fullName
                          }
                        </p>

                        <p className="mt-[14px] break-words text-[10px] leading-[1.9] text-white/45">
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
                          <div className="mt-[18px] border-t border-white/10 pt-[16px]">
                            <p className="text-[9px] tracking-[0.08em] text-white/45">
                              {
                                selectedAddress.phone
                              }
                            </p>
                          </div>
                        )}

                      </div>

                      <MapPinIcon
                        size={17}
                        className="shrink-0 text-red-500"
                      />

                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
                  DELIVERY METHOD
              ================================================= */}

              <div className="mb-[42px]">

                <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="mb-[8px] text-[9px] tracking-[0.25em] text-white/30">
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
                    className="text-[9px] tracking-[0.18em] text-red-500 transition hover:text-red-400"
                  >
                    EDIT
                  </button>

                </div>

                <div className="border border-white/10 bg-black">

                  <div className="flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-[20px] sm:px-[24px] sm:py-[24px]">

                    <div>

                      <p className="text-[11px] uppercase tracking-[0.12em] text-white">
                        {
                          deliveryMethod
                        }
                      </p>

                      <p className="mt-[9px] text-[9px] text-white/35">
                        Selected delivery
                        option
                      </p>

                    </div>

                    <div className="flex items-center gap-[12px]">

                      <TruckIcon
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

              {/* =================================================
                  ORDER ITEMS
              ================================================= */}

              <div>

                <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">

                  <div>

                    <p className="mb-[8px] text-[9px] tracking-[0.25em] text-white/30">
                      STEP 03
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      ORDER ITEMS
                    </h2>

                  </div>

                  <span className="text-[9px] tracking-[0.15em] text-white/30">
                    {
                      totalItemQuantity
                    }{" "}
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

                      <PackageIcon
                        size={25}
                        className="mx-auto text-white/20"
                      />

                      <p className="mt-[15px] text-[9px] tracking-[0.2em] text-white/30">
                        NO CART ITEMS
                        FOUND
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
                              className={`flex flex-col gap-4 px-4 py-5 sm:flex-row sm:gap-[18px] sm:px-[24px] sm:py-[20px] ${
                                index <
                                cartItems.length -
                                  1
                                  ? "border-b border-white/10"
                                  : ""
                              }`}
                            >

                              <div className="h-[88px] w-[70px] shrink-0 overflow-hidden bg-[#111]">

                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={
                                      name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <PackageIcon
                                      size={20}
                                      className="text-white/20"
                                    />
                                  </div>
                                )}

                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white">
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

                              <div className="shrink-0 text-left sm:text-right">

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

            {/* =================================================
                RIGHT — ORDER SUMMARY
            ================================================= */}

            <aside className="h-fit lg:sticky lg:top-8">

              <div className="border border-white/10 bg-black">

                {/* SUMMARY HEADER */}

                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-6 sm:px-[26px] sm:py-[28px]">

                  <h2 className="text-[15px] font-light tracking-[0.16em]">
                    ORDER SUMMARY
                  </h2>

                  <span className="text-[8px] tracking-[0.18em] text-white/30">
                    {
                      totalItemQuantity
                    }{" "}
                    {totalItemQuantity ===
                    1
                      ? "ITEM"
                      : "ITEMS"}
                  </span>

                </div>

                {/* MINI PRODUCTS */}

                <div className="px-5 sm:px-[26px]">

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
                          className="flex gap-[14px] border-b border-white/10 py-[20px]"
                        >

                          <div className="h-[72px] w-[58px] shrink-0 overflow-hidden bg-[#111]">

                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={
                                  name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <PackageIcon
                                  size={18}
                                  className="text-white/20"
                                />
                              </div>
                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-[8px] uppercase tracking-[0.1em] text-white">
                              {
                                name
                              }
                            </p>

                            <p className="mt-[8px] text-[7px] text-white/35">
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

                            <p className="mt-[8px] text-[7px] text-white/30">
                              QTY{" "}
                              {
                                quantity
                              }
                            </p>

                          </div>

                          <div className="shrink-0 text-left sm:text-right">

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

                {/* =================================================
                    COUPON
                ================================================= */}

                <div className="border-b border-white/10 px-5 py-5 sm:px-[26px] sm:py-[24px]">

                  <div className="mb-[12px] flex items-center justify-between gap-3">

                    <p className="text-[9px] tracking-[0.2em] text-white/35">
                      COUPON CODE
                    </p>

                    {!appliedCoupon && (
                      <button
                        type="button"
                        onClick={
                          openCouponModal
                        }
                        className="text-[8px] tracking-[0.15em] text-red-500 transition hover:text-red-400"
                      >
                        VIEW ALL
                      </button>
                    )}

                  </div>

                  {appliedCoupon ? (
                    <div className="border border-red-500/30 bg-red-500/5 px-[14px] py-[13px]">

                      <div className="flex items-center justify-between gap-[12px]">

                        <div className="min-w-0">

                          <p className="break-all text-[10px] tracking-[0.14em] text-white">
                            {
                              appliedCoupon.code
                            }
                          </p>

                          <p className="mt-[7px] text-[8px] tracking-[0.08em] text-red-500">
                            -
                            {formatCurrency(
                              appliedCoupon.discountAmount
                            )}{" "}
                            DISCOUNT
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={
                            handleRemoveCoupon
                          }
                          className="shrink-0 text-[8px] tracking-[0.16em] text-white/40 transition hover:text-red-500"
                        >
                          REMOVE
                        </button>

                      </div>

                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-[8px] sm:flex-row">

                        <input
                          type="text"
                          value={
                            couponCode
                          }
                          onChange={(
                            event
                          ) => {
                            setCouponCode(
                              event.target.value.toUpperCase()
                            );

                            setCouponError(
                              ""
                            );

                            setCouponSuccess(
                              ""
                            );
                          }}
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                              "Enter"
                            ) {
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="ENTER CODE"
                          className="h-[43px] min-w-0 flex-1 border border-white/10 bg-transparent px-[12px] text-[9px] tracking-[0.12em] text-white outline-none placeholder:text-white/20 focus:border-white/30"
                        />

                        <button
                          type="button"
                          onClick={
                            handleApplyCoupon
                          }
                          disabled={
                            couponLoading ||
                            !couponCode.trim()
                          }
                          className="h-[43px] w-full shrink-0 bg-white px-[15px] text-[8px] tracking-[0.16em] text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
                        >
                          {couponLoading
                            ? "CHECKING..."
                            : "APPLY"}
                        </button>

                      </div>

                      <button
                        type="button"
                        onClick={
                          openCouponModal
                        }
                        className="mt-[12px] h-[38px] w-full border border-white/10 text-[8px] tracking-[0.18em] text-white/45 transition hover:border-white/25 hover:text-white"
                      >
                        VIEW ALL
                        COUPONS
                      </button>
                    </>
                  )}

                  {couponError && (
                    <p className="mt-[10px] text-[8px] tracking-[0.04em] text-red-500">
                      {
                        couponError
                      }
                    </p>
                  )}

                  {couponSuccess &&
                    !couponError && (
                      <p className="mt-[10px] text-[8px] tracking-[0.04em] text-white/40">
                        {
                          couponSuccess
                        }
                      </p>
                    )}

                </div>

                {/* =================================================
                    TOTALS
                ================================================= */}

                <div className="px-5 py-5 sm:px-[26px] sm:py-[25px]">

                  <div className="space-y-[18px]">

                    {/* SUBTOTAL */}

                    <div className="flex items-center justify-between gap-4 text-[9px]">

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

                    {discount > 0 && (
                      <div className="flex items-center justify-between gap-4 text-[9px]">

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
                      <div className="flex items-center justify-between gap-4 text-[9px]">

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

                    <div className="flex items-center justify-between gap-4 text-[9px]">

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

                  <div className="mt-[22px] flex items-center justify-between gap-4 border-t border-white/10 pt-[22px]">

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
                    className="mt-[28px] h-[50px] w-full bg-white text-[9px] tracking-[0.2em] text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    CONTINUE TO
                    PAYMENT

                    <span className="ml-[12px]">
                      →
                    </span>
                  </button>

                  <p className="mt-[14px] text-center text-[8px] tracking-[0.12em] text-white/20">
                    YOU WILL CHOOSE
                    YOUR PAYMENT
                    METHOD ON THE NEXT
                    STEP.
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