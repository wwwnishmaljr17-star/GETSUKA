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

const SHIPPING_STORAGE_KEY = "getsukaCheckoutShipping";
const REVIEW_STORAGE_KEY = "getsukaCheckoutReview";

const CART_KEYS = [
  "getsukaCart",
  "cart",
  "cartItems",
];

const getCartFromStorage = () => {
  for (const key of CART_KEYS) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (Array.isArray(parsed?.cartItems)) return parsed.cartItems;
    } catch (error) {
      console.error(`Failed to read cart from ${key}:`, error);
    }
  }
  return [];
};

const getProductImage = (item) => {
  if (!item) return "";
  if (Array.isArray(item.images) && item.images.length > 0) {
    const firstImage = item.images[0];
    if (typeof firstImage === "string") return firstImage;
    return (
      firstImage?.url ||
      firstImage?.secure_url ||
      firstImage?.path ||
      ""
    );
  }
  if (typeof item.image === "string") return item.image;
  if (typeof item.imageUrl === "string") return item.imageUrl;
  if (typeof item.productImage === "string") return item.productImage;
  return "";
};

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

const getProductPrice = (item) => {
  const price =
    item?.finalPrice ??
    item?.price ??
    item?.product?.finalPrice ??
    item?.product?.price ??
    0;

  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) ? numericPrice : 0;
};

const getProductQuantity = (item) => {
  const quantity =
    item?.quantity ??
    item?.qty ??
    item?.productQuantity ??
    1;

  const numericQuantity = Number(quantity);
  return Number.isFinite(numericQuantity) && numericQuantity > 0
    ? numericQuantity
    : 1;
};

const getProductSize = (item) => {
  return (
    item?.size ||
    item?.selectedSize ||
    item?.variant?.size ||
    ""
  );
};

const getProductColor = (item) => {
  return (
    item?.color ||
    item?.selectedColor ||
    item?.variant?.color ||
    ""
  );
};

const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const MapPinIcon = ({ size = 16, className = "" }) => (
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
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const TruckIcon = ({ size = 16, className = "" }) => (
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
    <circle cx="7" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);

const PackageIcon = ({ size = 24, className = "" }) => (
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

const ReviewPage = () => {
  const navigate = useNavigate();

  const [checkoutData, setCheckoutData] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponListLoading, setCouponListLoading] = useState(false);

  const [usedCouponCodes, setUsedCouponCodes] = useState(new Set());
  const [usedCouponsLoaded, setUsedCouponsLoaded] = useState(false);
  const [usedCouponsLoadError, setUsedCouponsLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUsedCoupons = async () => {
      try {
        const response = await axiosInstance.get("/api/user/orders");
        const orders = Array.isArray(response?.data?.orders)
          ? response.data.orders
          : [];

        const usedCodes = new Set(
          orders
            .map((order) =>
              String(order?.couponCode || "").trim().toUpperCase()
            )
            .filter(Boolean)
        );

        if (!cancelled) {
          setUsedCouponCodes(usedCodes);
        }
      } catch (error) {
        console.error("USED COUPONS LOAD ERROR:", error);
        if (!cancelled) {
          setUsedCouponsLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setUsedCouponsLoaded(true);
        }
      }
    };

    loadUsedCoupons();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const storedCheckout = sessionStorage.getItem(SHIPPING_STORAGE_KEY);
      const storedReview = sessionStorage.getItem(REVIEW_STORAGE_KEY);

      if (storedReview) {
        setCheckoutData(JSON.parse(storedReview));
      } else if (storedCheckout) {
        setCheckoutData(JSON.parse(storedCheckout));
      }

      setCartItems(getCartFromStorage());
    } catch (error) {
      console.error("Failed to load review data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedAddress = checkoutData?.selectedAddress || null;
  const deliveryMethod =
    checkoutData?.deliveryMethod ||
    checkoutData?.shippingMethod ||
    "Standard Delivery";

  const shippingCharge = Number(
    checkoutData?.shippingCharge ?? checkoutData?.shippingCost ?? 0
  );

  const calculatedSubtotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const price = getProductPrice(item);
      const quantity = getProductQuantity(item);
      return total + price * quantity;
    }, 0);
  }, [cartItems]);

  const subtotal = Number(checkoutData?.subtotal ?? calculatedSubtotal);
  const tax = Number(checkoutData?.tax ?? checkoutData?.taxAmount ?? 0);

  const discount = Number(
    appliedCoupon?.discountAmount ??
      checkoutData?.discount ??
      checkoutData?.discountAmount ??
      0
  );

  const calculatedTotal = subtotal - discount + tax + shippingCharge;
  const total = Number(
    appliedCoupon ? calculatedTotal : checkoutData?.total ?? calculatedTotal
  );

  const totalItemQuantity = useMemo(() => {
    return cartItems.reduce((total, item) => {
      return total + getProductQuantity(item);
    }, 0);
  }, [cartItems]);

  useEffect(() => {
    if (!usedCouponsLoaded || usedCouponsLoadError) return;

    try {
      const storedReview = sessionStorage.getItem(REVIEW_STORAGE_KEY);
      if (!storedReview) return;

      const parsedReview = JSON.parse(storedReview);
      const storedCouponCode = String(parsedReview?.couponCode || "")
        .trim()
        .toUpperCase();

      if (!storedCouponCode) return;

      const alreadyUsed = usedCouponCodes.has(storedCouponCode);
      const storedCoupon = parsedReview?.coupon || {};
      const storedCouponIsOneUse = storedCoupon?.oneUsePerUser === true;

      if (alreadyUsed && storedCouponIsOneUse) {
        setCouponCode("");
        setAppliedCoupon(null);

        const updatedReview = {
          ...parsedReview,
          couponCode: "",
          discount: 0,
          discountAmount: 0,
          coupon: null,
          total: subtotal + tax + shippingCharge,
        };

        sessionStorage.setItem(
          REVIEW_STORAGE_KEY,
          JSON.stringify(updatedReview)
        );
        return;
      }

      setCouponCode(storedCouponCode);

      if (Number(parsedReview?.discount) > 0) {
        setAppliedCoupon({
          code: storedCouponCode,
          discountAmount: Number(parsedReview.discount),
          coupon: parsedReview?.coupon,
        });
      }
    } catch (error) {
      console.error("Failed to restore coupon:", error);
    }
  }, [
    usedCouponsLoaded,
    usedCouponsLoadError,
    usedCouponCodes,
    subtotal,
    tax,
    shippingCharge,
  ]);

  const handleBackToShipping = () => navigate("/checkout");
  const handleEditShipping = () => navigate("/checkout");

  const openCouponModal = async () => {
    setCouponModalOpen(true);
    setCouponError("");

    try {
      setCouponListLoading(true);
      const response = await getAvailableCoupons();
      const coupons = Array.isArray(response?.coupons)
        ? response.coupons
        : Array.isArray(response?.data?.coupons)
        ? response.data.coupons
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      const now = new Date();

      const formattedCoupons = coupons
        .map((coupon) => {
          const validFrom = coupon?.validFrom ? new Date(coupon.validFrom) : null;
          const validUntil = coupon?.validUntil
            ? new Date(coupon.validUntil)
            : null;
          const usageLimit = Number(coupon?.usageLimit);
          const usedCount = Number(coupon?.usedCount || 0);
          const minOrderAmount = Number(coupon?.minOrderAmount || 0);
          const discountValue = Number(coupon?.discountValue || 0);
          const discountType = coupon?.discountType;
          const code = String(coupon?.code || "").trim().toUpperCase();

          const alreadyUsed = usedCouponCodes.has(code);
          const active = coupon?.isActive !== false;
          const withinDates =
            (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);
          const withinUsage =
            !Number.isFinite(usageLimit) ||
            usageLimit <= 0 ||
            usedCount < usageLimit;
          const oneUseBlocked =
            coupon?.oneUsePerUser === true && alreadyUsed;
          const minimumMet = subtotal >= minOrderAmount;

          let previewDiscount = 0;
          if (discountType === "percentage") {
            previewDiscount = subtotal * (discountValue / 100);
            if (coupon?.maxDiscountAmount != null) {
              previewDiscount = Math.min(
                previewDiscount,
                Number(coupon.maxDiscountAmount)
              );
            }
          } else {
            previewDiscount = discountValue;
          }

          previewDiscount = Math.max(0, Math.min(previewDiscount, subtotal));

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
        .filter((coupon) => coupon.code)
        .sort((a, b) => {
          if (a.eligible !== b.eligible) {
            return a.eligible ? -1 : 1;
          }
          return b.previewDiscount - a.previewDiscount;
        });

      setAvailableCoupons(formattedCoupons);
    } catch (error) {
      console.error("Get Available Coupons Error:", error);
      setAvailableCoupons([]);
      setCouponError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load available coupons."
      );
    } finally {
      setCouponListLoading(false);
    }
  };

  const handleApplyAvailableCoupon = async (coupon) => {
    if (!coupon?.code || !coupon.eligible || appliedCoupon) return;

    if (coupon.oneUseBlocked) {
      setCouponError(
        `${coupon.code} has already been used once and is not available again.`
      );
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError("");
      setCouponSuccess("");

      const response = await validateCoupon(coupon.code, subtotal);
      if (!response?.success) {
        throw new Error(response?.message || "Unable to apply coupon.");
      }

      const responseCoupon = response?.coupon || coupon;

      if (
        responseCoupon?.oneUsePerUser === true &&
        usedCouponCodes.has(coupon.code)
      ) {
        throw new Error(
          `${coupon.code} has already been used once and is not available again.`
        );
      }

      const discountAmount = Number(response.discountAmount || 0);
      const nextTotal = subtotal - discountAmount + tax + shippingCharge;

      setCouponCode(coupon.code);
      setAppliedCoupon({
        code: coupon.code,
        discountAmount,
        coupon: responseCoupon,
      });

      setCheckoutData((previous) => ({
        ...(previous || {}),
        couponCode: coupon.code,
        discount: discountAmount,
        discountAmount,
        total: nextTotal,
      }));

      sessionStorage.setItem(
        REVIEW_STORAGE_KEY,
        JSON.stringify({
          ...(checkoutData || {}),
          couponCode: coupon.code,
          discount: discountAmount,
          discountAmount,
          total: nextTotal,
        })
      );

      setCouponSuccess(response.message || "Coupon applied successfully.");
      setCouponModalOpen(false);
    } catch (error) {
      console.error("Apply Available Coupon Error:", error);
      setAppliedCoupon(null);
      setCouponError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to apply coupon."
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) {
      setCouponError("Please enter a valid coupon code.");
      return;
    }

    try {
      setCouponLoading(true);
      setCouponError("");
      setCouponSuccess("");

      const response = await validateCoupon(trimmed, subtotal);
      if (!response?.success) {
        throw new Error(response?.message || "Invalid coupon code.");
      }

      const coupon = response?.coupon;
      if (
        coupon?.oneUsePerUser === true &&
        usedCouponCodes.has(trimmed)
      ) {
        throw new Error(
          `${trimmed} has already been used once and is not available again.`
        );
      }

      const discountAmount = Number(response.discountAmount || 0);
      const nextTotal = subtotal - discountAmount + tax + shippingCharge;

      setAppliedCoupon({
        code: trimmed,
        discountAmount,
        coupon,
      });

      setCheckoutData((previous) => ({
        ...(previous || {}),
        couponCode: trimmed,
        discount: discountAmount,
        discountAmount,
        total: nextTotal,
      }));

      sessionStorage.setItem(
        REVIEW_STORAGE_KEY,
        JSON.stringify({
          ...(checkoutData || {}),
          couponCode: trimmed,
          discount: discountAmount,
          discountAmount,
          total: nextTotal,
        })
      );

      setCouponSuccess(response.message || "Coupon applied successfully.");
    } catch (error) {
      console.error("Apply Coupon Error:", error);
      setAppliedCoupon(null);
      setCouponError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to apply coupon."
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");

    const nextTotal = subtotal + tax + shippingCharge;

    setCheckoutData((previous) => {
      const updated = {
        ...(previous || {}),
        couponCode: "",
        discount: 0,
        discountAmount: 0,
        total: nextTotal,
      };

      sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setCouponSuccess("Coupon removed successfully.");
  };

  const handleContinueToPayment = () => {
    if (!selectedAddress) {
      setCheckoutError(
        "Please select a delivery address before proceeding to payment."
      );
      return;
    }

    setCheckoutError("");

    const paymentCheckoutData = {
      ...(checkoutData || {}),
      selectedAddress,
      deliveryMethod,
      shippingCharge,
      subtotal,
      discount,
      tax,
      total,
      couponCode: appliedCoupon?.code || "",
      cartItems,
    };

    sessionStorage.setItem(
      REVIEW_STORAGE_KEY,
      JSON.stringify(paymentCheckoutData)
    );

    navigate("/checkout/payment");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] text-[#252321]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Reviewing Order Details...
          </p>
        </div>
      </div>
    );
  }

  if (!checkoutData || !selectedAddress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F7] px-6 text-[#252321]">
        <PackageIcon size={40} className="mb-4 text-[#716C67]" />
        <h1 className="text-center text-xl font-serif font-medium text-[#252321]">
          Checkout Information Missing
        </h1>
        <p className="mb-6 mt-2 max-w-md text-center text-xs text-[#716C67]">
          Please return to shipping and select a valid delivery address to review your order.
        </p>
        <button
          type="button"
          onClick={handleBackToShipping}
          className="h-11 bg-[#6F4E37] px-7 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#211B18]"
        >
          RETURN TO SHIPPING
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* COUPON MODAL */}
      {couponModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => setCouponModalOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-[600px] overflow-hidden border border-[#E5E4E2] bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E4E2] px-6 py-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                  EXCLUSIVE PROMOTIONS
                </p>
                <h3 className="text-lg font-serif font-medium text-[#252321]">
                  Available Coupons
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="text-2xl text-[#716C67] hover:text-[#252321]"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(85vh-90px)] overflow-y-auto p-5">
              {couponListLoading ? (
                <div className="py-12 text-center text-xs text-[#716C67]">
                  Checking eligible rewards...
                </div>
              ) : availableCoupons.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#716C67]">
                  No active promotional coupons available for this order.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCoupons.map((coupon) => (
                    <div
                      key={coupon._id || coupon.id || coupon.code}
                      className={`border p-4 bg-white transition ${
                        coupon.eligible
                          ? "border-[#E5E4E2] hover:border-[#6F4E37]"
                          : "border-[#E5E4E2] opacity-60 bg-[#FAF9F7]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#252321] bg-[#FAF9F7] px-2 py-1 border border-[#E5E4E2]">
                            {coupon.code}
                          </span>
                          <p className="mt-2 text-xs font-semibold text-[#6F4E37]">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discountValue}% SAVINGS`
                              : `${formatCurrency(coupon.discountValue)} OFF`}
                          </p>
                          {coupon.previewDiscount > 0 && (
                            <p className="text-[10px] text-[#716C67] mt-0.5">
                              Saves {formatCurrency(coupon.previewDiscount)} on this order
                            </p>
                          )}
                          {coupon.minOrderAmount > 0 && (
                            <p className="text-[9px] text-[#716C67]">
                              Min order: {formatCurrency(coupon.minOrderAmount)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={
                            !coupon.eligible ||
                            couponLoading ||
                            Boolean(appliedCoupon)
                          }
                          onClick={() => handleApplyAvailableCoupon(coupon)}
                          className={`h-9 px-4 text-[9px] font-bold uppercase tracking-wider transition ${
                            coupon.eligible && !appliedCoupon
                              ? "bg-[#6F4E37] text-white hover:bg-[#211B18]"
                              : "cursor-not-allowed bg-[#D8D3CF] text-white"
                          }`}
                        >
                          {couponLoading && coupon.eligible
                            ? "APPLYING..."
                            : coupon.oneUseBlocked
                            ? "USED"
                            : !coupon.minimumMet
                            ? "NOT MET"
                            : "APPLY"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT BREADCRUMB */}
      <div className="border-b border-[#E5E4E2] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="text-[#716C67]">01 BAG</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">02 SHIPPING</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-0.5">
              03 REVIEW
            </span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">04 PAYMENT</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1440px] mx-auto px-6 py-10 lg:py-14">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
            GETSUKA CHECKOUT
          </p>
          <h1 className="mt-2 text-3xl font-serif font-medium text-[#252321] md:text-5xl">
            Review Your Order
          </h1>
          <p className="mt-2 text-xs text-[#716C67]">
            Please verify all details and promotional codes before payment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-10 lg:gap-14">
          {/* LEFT DETAILS */}
          <section className="space-y-8">
            {/* ADDRESS CARD */}
            <div className="border border-[#E5E4E2] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E4E2] pb-3">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="text-[#6F4E37]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#252321]">
                    DELIVERY ADDRESS
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleEditShipping}
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37] underline decoration-[#E5E4E2] underline-offset-4 hover:decoration-[#6F4E37]"
                >
                  CHANGE
                </button>
              </div>

              <div className="mt-4 text-xs text-[#716C67] leading-relaxed">
                <p className="font-bold text-[#252321] text-sm">
                  {selectedAddress.fullName}
                </p>
                <p className="mt-1">{selectedAddress.addressLine}</p>
                <p>
                  {selectedAddress.city}, {selectedAddress.state} —{" "}
                  {selectedAddress.pincode}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[#252321]">
                  Contact: {selectedAddress.phone}
                </p>
              </div>
            </div>

            {/* SHIPPING METHOD CARD */}
            <div className="border border-[#E5E4E2] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E4E2] pb-3">
                <div className="flex items-center gap-2">
                  <TruckIcon className="text-[#6F4E37]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#252321]">
                    SHIPPING SERVICE
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleEditShipping}
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37] underline decoration-[#E5E4E2] underline-offset-4 hover:decoration-[#6F4E37]"
                >
                  CHANGE
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                    {deliveryMethod === "express"
                      ? "EXPRESS PRIORITY AIR COURIER (2–3 DAYS)"
                      : "STANDARD COMPLIMENTARY COURIER (5–7 DAYS)"}
                  </p>
                  <p className="text-[10px] text-[#716C67] mt-0.5">
                    Includes real-time signature courier tracking
                  </p>
                </div>
                <span className="text-xs font-bold text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-1">
                  {shippingCharge === 0 ? "FREE" : formatCurrency(shippingCharge)}
                </span>
              </div>
            </div>

            {/* ORDER ITEMS LIST */}
            <div className="border border-[#E5E4E2] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E4E2] pb-4">
                <div className="flex items-center gap-2">
                  <PackageIcon className="text-[#6F4E37]" size={20} />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#252321]">
                    ORDER CONTENTS ({totalItemQuantity})
                  </h2>
                </div>
              </div>

              <div className="divide-y divide-[#E5E4E2]">
                {cartItems.map((item, index) => {
                  const name = getProductName(item);
                  const price = getProductPrice(item);
                  const quantity = getProductQuantity(item);
                  const image = getProductImage(item);
                  const size = getProductSize(item);
                  const color = getProductColor(item);

                  return (
                    <div
                      key={item?._id || item?.id || `${name}-${index}`}
                      className="py-4 flex gap-4 items-center"
                    >
                      <div className="w-16 h-20 bg-[#FAF9F7] border border-[#E5E4E2] shrink-0 overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[#716C67]">
                            GETSUKA
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#252321] truncate">
                          {name}
                        </p>
                        <div className="mt-1 flex gap-2 text-[10px] text-[#716C67]">
                          {size && <span>Size: {size}</span>}
                          {color && <span>Color: {color}</span>}
                          <span>Qty: {quantity}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-[#252321]">
                          {formatCurrency(price * quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT ASIDE: SUMMARY & PROMO */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="border border-[#E5E4E2] bg-white p-7 shadow-sm">
              <h2 className="text-lg font-serif font-medium text-[#252321] border-b border-[#E5E4E2] pb-4">
                Payment Summary
              </h2>

              {/* COUPON SECTION */}
              <div className="py-5 border-b border-[#E5E4E2]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#716C67]">
                    PROMOTIONAL CODE
                  </span>
                  {!appliedCoupon && (
                    <button
                      type="button"
                      onClick={openCouponModal}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#6F4E37] hover:underline"
                    >
                      VIEW OFFERS
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="border border-[#E6E0F0] bg-[#E6E0F0]/40 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#6F4E37]">
                        {appliedCoupon.code}
                      </p>
                      <p className="text-[10px] text-[#6F4E37]">
                        - {formatCurrency(appliedCoupon.discountAmount)} applied
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] font-bold uppercase tracking-wider text-[#716C67] hover:text-[#6F4E37]"
                    >
                      REMOVE
                    </button>
                  </div>
                ) : (
                  <div className="flex">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                        setCouponSuccess("");
                      }}
                      placeholder="ENTER CODE"
                      className="min-w-0 flex-1 border border-[#E5E4E2] bg-[#FAF9F7] px-3 py-2 text-xs uppercase font-semibold text-[#252321] outline-none focus:border-[#6F4E37]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="border border-l-0 border-[#E5E4E2] bg-white px-4 text-[9px] font-bold uppercase tracking-wider text-[#6F4E37] transition hover:bg-[#FAF9F7] disabled:opacity-40"
                    >
                      {couponLoading ? "..." : "APPLY"}
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[10px] text-[#6F4E37] font-medium mt-1.5">
                    {couponError}
                  </p>
                )}
                {couponSuccess && !couponError && (
                  <p className="text-[10px] text-[#6F4E37] font-medium mt-1.5">
                    {couponSuccess}
                  </p>
                )}
              </div>

              {/* AMOUNTS */}
              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between text-[#716C67]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#252321]">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[#6F4E37] font-medium">
                    <span>Discount</span>
                    <span>- {formatCurrency(discount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-[#716C67]">
                    <span>Taxes</span>
                    <span className="font-semibold text-[#252321]">
                      {formatCurrency(tax)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#716C67]">
                  <span>Shipping</span>
                  <span
                    className={
                      shippingCharge === 0
                        ? "text-[#6F4E37] font-bold"
                        : "font-semibold text-[#252321]"
                    }
                  >
                    {shippingCharge === 0 ? "FREE" : formatCurrency(shippingCharge)}
                  </span>
                </div>

                <div className="border-t border-[#E5E4E2] pt-4 flex items-end justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                    FINAL TOTAL
                  </span>
                  <span className="text-xl font-serif font-bold text-[#252321]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="mt-3 border border-[#6F4E37] bg-[#FAF9F7] p-3 text-center text-xs text-[#6F4E37]">
                  {checkoutError}
                </div>
              )}

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={cartItems.length === 0}
                className="w-full h-12 mt-6 bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#211B18] transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-[#D8D3CF]"
              >
                PROCEED TO PAYMENT
                <span>→</span>
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default ReviewPage;