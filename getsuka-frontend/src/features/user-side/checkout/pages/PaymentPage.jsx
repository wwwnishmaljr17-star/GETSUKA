import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../../orders/api/orderApi";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api/paymentApi";
import { getWallet } from "../../wallet/api/walletApi";
import { loadRazorpay } from "../utils/loadRazorpay";

const PaymentPage = () => {
  const navigate = useNavigate();

  const [checkoutData, setCheckoutData] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(true);

  const selectedAddress = checkoutData?.selectedAddress || null;
  const deliveryMethod = checkoutData?.deliveryMethod || "standard";
  const shippingCost =
    Number(
      checkoutData?.shippingCharge ??
        (deliveryMethod === "express" ? 149 : 0)
    ) || 0;

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletLoaded, setWalletLoaded] = useState(false);

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("getsukaCart");
      if (!storedCart) {
        setCartItems([]);
        return;
      }

      const parsedCart = JSON.parse(storedCart);
      if (Array.isArray(parsedCart)) {
        setCartItems(parsedCart);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error("Payment Cart Error:", err);
      setCartItems([]);
    }
  }, []);

  useEffect(() => {
    const loadCheckoutData = () => {
      try {
        const savedReview = sessionStorage.getItem("getsukaCheckoutReview");
        if (!savedReview) {
          setCheckoutData(null);
          return;
        }

        const parsedReview = JSON.parse(savedReview);
        const resolvedAddress =
          parsedReview?.selectedAddress || parsedReview?.address || null;

        setCheckoutData({
          ...parsedReview,
          selectedAddress: resolvedAddress,
        });

        const savedPayment = sessionStorage.getItem("getsukaCheckoutPayment");
        if (savedPayment) {
          try {
            const paymentData = JSON.parse(savedPayment);
            if (
              paymentData?.paymentMethod === "razorpay" ||
              paymentData?.paymentMethod === "cod" ||
              paymentData?.paymentMethod === "wallet"
            ) {
              setPaymentMethod(paymentData.paymentMethod);
            }
          } catch (storageErr) {
            console.error("Payment Storage Parse Error:", storageErr);
          }
        }
      } catch (err) {
        console.error("Load Checkout Data Error:", err);
        setCheckoutData(null);
      } finally {
        setCheckoutLoading(false);
      }
    };

    loadCheckoutData();
  }, []);

  useEffect(() => {
    if (paymentMethod !== "wallet") return;

    let cancelled = false;

    const fetchWalletBalance = async () => {
      try {
        setWalletLoading(true);
        setWalletLoaded(false);
        setError("");

        const response = await getWallet();
        if (cancelled) return;

        if (!response?.success) {
          throw new Error(
            response?.message || "Unable to load wallet balance."
          );
        }

        setWalletBalance(Number(response?.wallet?.balance) || 0);
        setWalletLoaded(true);
      } catch (err) {
        if (cancelled) return;
        console.error("Payment Wallet Error:", err);
        setWalletBalance(0);
        setWalletLoaded(false);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load wallet balance."
        );
      } finally {
        if (!cancelled) {
          setWalletLoading(false);
        }
      }
    };

    fetchWalletBalance();

    return () => {
      cancelled = true;
    };
  }, [paymentMethod]);

  const subtotal = useMemo(() => {
    if (checkoutData?.subtotal !== undefined) {
      return Number(checkoutData.subtotal) || 0;
    }

    return cartItems.reduce((total, item) => {
      const price = Number(item?.price || 0);
      const quantity = Number(item?.quantity || 1);
      return total + price * quantity;
    }, 0);
  }, [cartItems, checkoutData]);

  const discount =
    Number(
      checkoutData?.discount || checkoutData?.discountAmount || 0
    ) || 0;

  const tax =
    Number(checkoutData?.tax || checkoutData?.taxAmount || 0) || 0;

  const total =
    Number(checkoutData?.total) ||
    subtotal - discount + tax + shippingCost;

  const walletInsufficient =
    paymentMethod === "wallet" && walletLoaded && walletBalance < total;

  const walletSufficient =
    paymentMethod === "wallet" && walletLoaded && walletBalance >= total;

  const formatPrice = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const getProductName = (item) => {
    return (
      item?.name ||
      item?.productName ||
      item?.product?.name ||
      item?.title ||
      "GETSUKA PRODUCT"
    );
  };

  const getProductImage = (item) => {
    if (item?.image) return item.image;
    if (Array.isArray(item?.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      if (typeof firstImage === "string") return firstImage;
      return firstImage?.url || firstImage?.secure_url || "";
    }
    if (
      Array.isArray(item?.product?.images) &&
      item.product.images.length > 0
    ) {
      const firstImage = item.product.images[0];
      if (typeof firstImage === "string") return firstImage;
      return firstImage?.url || firstImage?.secure_url || "";
    }
    return item?.imageUrl || item?.product?.image || "";
  };

  const getProductPrice = (item) => {
    return Number(
      item?.price ??
        item?.productPrice ??
        item?.product?.price ??
        0
    );
  };

  const getQuantity = (item) => {
    return Number(item?.quantity ?? item?.qty ?? 1);
  };

  const getSize = (item) => {
    return (
      item?.size ||
      item?.selectedSize ||
      item?.variant?.size ||
      "—"
    );
  };

  const getColor = (item) => {
    return (
      item?.color ||
      item?.selectedColor ||
      item?.variant?.color ||
      "—"
    );
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setError("");

    try {
      sessionStorage.setItem(
        "getsukaCheckoutPayment",
        JSON.stringify({ paymentMethod: method })
      );
    } catch (err) {
      console.error("Payment Session Error:", err);
    }
  };

  const savePendingPayment = ({ razorpayOrderId, orderData }) => {
    const pendingPayment = {
      razorpayOrderId,
      orderData,
      total,
      paymentMethod: "razorpay",
      createdAt: new Date().toISOString(),
      failedCartItems: Array.isArray(cartItems) ? cartItems : [],
    };

    sessionStorage.setItem(
      "getsukaPendingPayment",
      JSON.stringify(pendingPayment)
    );
  };

  const clearCompletedCheckout = () => {
    sessionStorage.removeItem("getsukaCheckoutPayment");
    sessionStorage.removeItem("getsukaCheckoutReview");
    sessionStorage.removeItem("getsukaCheckoutShipping");
    sessionStorage.removeItem("getsukaPendingPayment");
  };

  const buildOrderItems = () => {
    return cartItems.map((item) => {
      const productId =
        item?.productId || item?.product?._id || item?._id;
      const variantId =
        item?.variantId || item?.variant?._id || item?.selectedVariantId;
      const quantity = getQuantity(item);

      if (!productId || !variantId) {
        throw new Error(
          "Product or variant information is missing from the bag."
        );
      }

      return {
        productId,
        variantId,
        quantity,
      };
    });
  };

  const completeSuccessfulOrder = async ({ orderData, paymentResponse }) => {
    const response = await createOrder({
      ...orderData,
      razorpayOrderId: paymentResponse?.razorpay_order_id,
      razorpayPaymentId: paymentResponse?.razorpay_payment_id,
      razorpaySignature: paymentResponse?.razorpay_signature,
      paymentStatus: "paid",
    });

    if (!response?.success) {
      throw new Error(
        response?.message ||
          "Payment was successful, but the order record could not be saved."
      );
    }

    const createdOrder =
      response?.order || response?.data || response;

    sessionStorage.setItem("getsukaOrder", JSON.stringify(createdOrder));
    clearCompletedCheckout();
    localStorage.removeItem("getsukaCart");
    window.dispatchEvent(new Event("cartUpdated"));

    return createdOrder;
  };

  const openRazorpay = async ({ orderData }) => {
    setError("");
    setProcessing(true);

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error(
          "Unable to load Razorpay payment gateway. Please check your connection."
        );
      }

      const razorpayResponse = await createRazorpayOrder(total, orderData);
      if (!razorpayResponse?.success || !razorpayResponse?.order?.id) {
        throw new Error(
          razorpayResponse?.message ||
            "Unable to generate Razorpay payment order."
        );
      }

      const razorpayOrder = razorpayResponse.order;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          "Razorpay public key is missing from environment variables."
        );
      }

      savePendingPayment({
        razorpayOrderId: razorpayOrder.id,
        orderData,
      });

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "GETSUKA ARCHIVE",
        description: "Anime Fashion Luxury Apparel",
        order_id: razorpayOrder.id,
        prefill: {
          name: selectedAddress?.fullName || "",
          contact: selectedAddress?.phone || "",
        },
        notes: {
          paymentMethod: "razorpay",
        },
        theme: {
          color: "#6F4E37",
        },
        handler: async (paymentResponse) => {
          try {
            setProcessing(true);
            setError("");

            const verificationResponse = await verifyRazorpayPayment({
              razorpay_order_id: paymentResponse?.razorpay_order_id,
              razorpay_payment_id: paymentResponse?.razorpay_payment_id,
              razorpay_signature: paymentResponse?.razorpay_signature,
            });

            if (!verificationResponse?.success) {
              throw new Error(
                verificationResponse?.message ||
                  "Payment signature verification failed."
              );
            }

            const createdOrder = await completeSuccessfulOrder({
              orderData,
              paymentResponse,
            });

            setProcessing(false);
            navigate("/checkout/order-placed", {
              replace: true,
              state: { order: createdOrder },
            });
          } catch (err) {
            console.error("Razorpay Success Processing Error:", err);
            setProcessing(false);
            setError(
              err?.response?.data?.message ||
                err?.message ||
                "Payment was received, but we could not complete the order. Please contact support."
            );
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            navigate("/checkout/payment-failed", {
              replace: true,
              state: {
                message:
                  "Payment modal was closed before verification completed.",
                paymentMethod: "razorpay",
              },
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        console.error("Razorpay Payment Failed:", response);
        try {
          const storedPendingPayment = sessionStorage.getItem(
            "getsukaPendingPayment"
          );
          const pendingPayment = storedPendingPayment
            ? JSON.parse(storedPendingPayment)
            : {};

          const failedPayment = {
            ...pendingPayment,
            paymentStatus: "failed",
            paymentMethod: "razorpay",
            failureMessage:
              response?.error?.description ||
              response?.error?.reason ||
              "Your payment could not be processed by your bank.",
            failedCartItems:
              Array.isArray(pendingPayment?.failedCartItems) &&
              pendingPayment.failedCartItems.length > 0
                ? pendingPayment.failedCartItems
                : Array.isArray(cartItems)
                ? cartItems
                : [],
          };

          sessionStorage.setItem(
            "getsukaPendingPayment",
            JSON.stringify(failedPayment)
          );
          sessionStorage.setItem(
            "getsukaFailedPayment",
            JSON.stringify(failedPayment)
          );

          localStorage.removeItem("getsukaCart");
          window.dispatchEvent(new Event("cartUpdated"));
        } catch (storageError) {
          console.error("Failed Payment Session Error:", storageError);
        }

        setProcessing(false);
        navigate("/checkout/payment-failed", {
          replace: true,
          state: {
            message:
              response?.error?.description ||
              response?.error?.reason ||
              "Your payment could not be completed. Please try again.",
            paymentMethod: "razorpay",
          },
        });
      });

      razorpay.open();
    } catch (err) {
      console.error("Razorpay Initialization Error:", err);
      setProcessing(false);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start the payment gateway. Please try again."
      );
    }
  };

  const completeWalletOrder = async ({ orderData }) => {
    const response = await createOrder({
      ...orderData,
      paymentMethod: "wallet",
      paymentStatus: "paid",
    });

    if (!response?.success) {
      throw new Error(
        response?.message || "Unable to complete wallet order."
      );
    }

    const createdOrder = response?.order || response?.data || response;

    sessionStorage.setItem("getsukaOrder", JSON.stringify(createdOrder));
    clearCompletedCheckout();
    localStorage.removeItem("getsukaCart");
    window.dispatchEvent(new Event("cartUpdated"));

    return createdOrder;
  };

  const handlePlaceOrder = async () => {
    setError("");

    if (!selectedAddress) {
      setError("Delivery address is missing.");
      return;
    }

    if (cartItems.length === 0) {
      setError("Your shopping bag is empty.");
      return;
    }

    if (paymentMethod === "wallet") {
      if (walletLoading) {
        setError("Please wait while wallet balance is verifying.");
        return;
      }
      if (!walletLoaded) {
        setError("Unable to verify wallet balance. Please refresh.");
        return;
      }
      if (walletBalance < total) {
        setError(
          `Insufficient wallet balance. Total is ${formatPrice(
            total
          )}, but your balance is ${formatPrice(walletBalance)}.`
        );
        return;
      }
    }

    let orderItems;
    try {
      orderItems = buildOrderItems();
    } catch (err) {
      console.error("Order Items Error:", err);
      setError(err?.message || "Unable to prepare your order items.");
      return;
    }

    const orderData = {
      items: orderItems,
      addressId: selectedAddress?._id || selectedAddress?.id,
      shippingAddress: selectedAddress,
      deliveryMethod,
      paymentMethod,
      couponCode: checkoutData?.couponCode || "",
      discount,
      tax,
      shippingCharge: shippingCost,
      subtotal,
      total,
    };

    try {
      sessionStorage.setItem(
        "getsukaCheckoutPayment",
        JSON.stringify({
          paymentMethod,
          selectedAddress,
          deliveryMethod,
          shippingCharge: shippingCost,
          subtotal,
          discount,
          tax,
          total,
        })
      );
    } catch (err) {
      console.error("Save Payment Session Error:", err);
      setError("Unable to save checkout session.");
      return;
    }

    if (paymentMethod === "wallet") {
      try {
        setProcessing(true);
        const createdOrder = await completeWalletOrder({ orderData });
        setProcessing(false);
        navigate("/checkout/order-placed", {
          replace: true,
          state: { order: createdOrder },
        });
      } catch (err) {
        console.error("Wallet Order Error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Something went wrong while placing your wallet order."
        );
        setProcessing(false);
      }
      return;
    }

    if (paymentMethod === "cod") {
      try {
        setProcessing(true);
        const response = await createOrder(orderData);
        if (!response?.success) {
          throw new Error(response?.message || "Unable to create your order.");
        }

        const createdOrder = response?.order || response?.data || response;
        sessionStorage.setItem("getsukaOrder", JSON.stringify(createdOrder));
        clearCompletedCheckout();
        localStorage.removeItem("getsukaCart");
        window.dispatchEvent(new Event("cartUpdated"));
        setProcessing(false);

        navigate("/checkout/order-placed", {
          replace: true,
          state: { order: createdOrder },
        });
      } catch (err) {
        console.error("COD Order Error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Something went wrong while placing your order."
        );
        setProcessing(false);
      }
      return;
    }

    await openRazorpay({ orderData });
  };

  const handleBackToReview = () => navigate("/checkout/review");

  if (checkoutLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] text-[#252321]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Securing Payment Channels...
          </p>
        </div>
      </div>
    );
  }

  if (!checkoutData || !selectedAddress) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex flex-col items-center justify-center px-6">
        <p className="text-center text-xs text-[#716C67]">
          Checkout information missing.
        </p>
        <button
          type="button"
          onClick={() => navigate("/checkout", { replace: true })}
          className="mt-4 bg-[#6F4E37] text-white px-7 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-[#211B18]"
        >
          RETURN TO SHIPPING
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* CHECKOUT BREADCRUMB */}
      <div className="border-b border-[#E5E4E2] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="text-[#716C67]">01 BAG</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">02 SHIPPING</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">03 REVIEW</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-0.5">
              04 PAYMENT
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-[1440px] mx-auto px-6 py-10 lg:py-14">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
            GETSUKA CHECKOUT
          </p>
          <h1 className="mt-2 text-3xl font-serif font-medium text-[#252321] md:text-5xl">
            Payment Options
          </h1>
          <p className="mt-2 text-xs text-[#716C67]">
            Select your preferred secure payment method to finalize your purchase.
          </p>
        </div>

        {error && (
          <div className="mb-8 border border-[#6F4E37] bg-white p-4">
            <p className="text-xs text-[#6F4E37] font-semibold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-10 lg:gap-14">
          {/* PAYMENT METHODS */}
          <section className="space-y-4">
            <div className="mb-4">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                STEP 04
              </span>
              <h2 className="text-xl font-serif font-medium text-[#252321]">
                Select Payment Mode
              </h2>
            </div>

            {/* RAZORPAY */}
            <div
              className={`border bg-white transition ${
                paymentMethod === "razorpay"
                  ? "border-[#6F4E37] ring-1 ring-[#6F4E37]"
                  : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
              }`}
            >
              <button
                type="button"
                onClick={() => handlePaymentMethodChange("razorpay")}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === "razorpay"
                        ? "border-[#6F4E37]"
                        : "border-[#D8D3CF]"
                    }`}
                  >
                    {paymentMethod === "razorpay" && (
                      <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                      RAZORPAY SECURE GATEWAY
                    </p>
                    <p className="text-[10px] text-[#716C67] mt-0.5">
                      UPI, Credit/Debit Cards, NetBanking, Google Pay & Cred
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#E6E0F0] text-[#6F4E37] px-2 py-0.5">
                  RECOMMENDED
                </span>
              </button>

              {paymentMethod === "razorpay" && (
                <div className="border-t border-[#E5E4E2] bg-[#FAF9F7] px-6 py-4">
                  <p className="text-[11px] text-[#716C67] leading-relaxed">
                    You will be directed to Razorpay’s encrypted interface. Cards, instant UPI QR, and net banking options are supported.
                  </p>
                </div>
              )}
            </div>

            {/* WALLET */}
            <div
              className={`border bg-white transition ${
                paymentMethod === "wallet"
                  ? "border-[#6F4E37] ring-1 ring-[#6F4E37]"
                  : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
              }`}
            >
              <button
                type="button"
                onClick={() => handlePaymentMethodChange("wallet")}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === "wallet"
                        ? "border-[#6F4E37]"
                        : "border-[#D8D3CF]"
                    }`}
                  >
                    {paymentMethod === "wallet" && (
                      <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                      GETSUKA WALLET
                    </p>
                    <p className="text-[10px] text-[#716C67] mt-0.5">
                      Instant one-click checkout using your store credits
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#252321]">
                  WALLET
                </span>
              </button>

              {paymentMethod === "wallet" && (
                <div className="border-t border-[#E5E4E2] bg-[#FAF9F7] px-6 py-4">
                  {walletLoading ? (
                    <p className="text-xs text-[#716C67]">
                      Verifying wallet balance...
                    </p>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-[#716C67]">
                            AVAILABLE BALANCE
                          </p>
                          <p
                            className={`text-lg font-serif font-bold ${
                              walletInsufficient
                                ? "text-[#6F4E37]"
                                : "text-[#252321]"
                            }`}
                          >
                            {formatPrice(walletBalance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-[#716C67]">
                            ORDER TOTAL
                          </p>
                          <p className="text-lg font-serif font-bold text-[#252321]">
                            {formatPrice(total)}
                          </p>
                        </div>
                      </div>

                      {walletInsufficient && (
                        <div className="mt-3 border border-[#6F4E37] bg-white p-2.5">
                          <p className="text-[11px] text-[#6F4E37]">
                            Insufficient wallet balance. Please add{" "}
                            {formatPrice(total - walletBalance)} to your wallet or choose another payment method.
                          </p>
                        </div>
                      )}
                      {walletSufficient && (
                        <p className="mt-2 text-[11px] text-[#252321] font-medium">
                          Your available balance is sufficient to settle this invoice immediately.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CASH ON DELIVERY */}
            <div
              className={`border bg-white transition ${
                paymentMethod === "cod"
                  ? "border-[#6F4E37] ring-1 ring-[#6F4E37]"
                  : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
              }`}
            >
              <button
                type="button"
                onClick={() => handlePaymentMethodChange("cod")}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentMethod === "cod"
                        ? "border-[#6F4E37]"
                        : "border-[#D8D3CF]"
                    }`}
                  >
                    {paymentMethod === "cod" && (
                      <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                      CASH ON DELIVERY (COD)
                    </p>
                    <p className="text-[10px] text-[#716C67] mt-0.5">
                      Pay cash or UPI upon delivery at your doorstep
                    </p>
                  </div>
                </div>
                <span className="text-[9px] uppercase font-bold text-[#716C67]">
                  DOORSTEP
                </span>
              </button>

              {paymentMethod === "cod" && (
                <div className="border-t border-[#E5E4E2] bg-[#FAF9F7] px-6 py-4">
                  <p className="text-[11px] text-[#716C67] leading-relaxed">
                    Please keep the exact amount ready upon delivery. Our couriers also accept UPI on delivery via dynamic QR code.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ASIDE SUMMARY */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="border border-[#E5E4E2] bg-white p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E4E2] pb-4">
                <h2 className="text-lg font-serif font-medium text-[#252321]">
                  Order Summary
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#716C67]">
                  {cartItems.length} PIECES
                </span>
              </div>

              {/* PRODUCT SNIPPETS */}
              <div className="mt-4 max-h-56 overflow-y-auto divide-y divide-[#E5E4E2]">
                {cartItems.map((item, index) => {
                  const image = getProductImage(item);
                  const price = getProductPrice(item);
                  const quantity = getQuantity(item);

                  return (
                    <div
                      key={item?.productId || item?._id || index}
                      className="py-3 flex gap-3 items-center"
                    >
                      <div className="w-12 h-14 bg-[#FAF9F7] border border-[#E5E4E2] shrink-0 overflow-hidden">
                        {image ? (
                          <img
                            src={image}
                            alt={getProductName(item)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] text-[#716C67]">
                            GETSUKA
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#252321] truncate">
                          {getProductName(item)}
                        </p>
                        <p className="text-[10px] text-[#716C67]">
                          Size: {getSize(item)} | Qty: {quantity}
                        </p>
                      </div>

                      <span className="text-xs font-bold text-[#252321]">
                        {formatPrice(price * quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* TOTALS */}
              <div className="border-t border-[#E5E4E2] mt-6 pt-4 space-y-3 text-xs">
                <div className="flex justify-between text-[#716C67]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#252321]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[#6F4E37] font-medium">
                    <span>Discount</span>
                    <span>- {formatPrice(discount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between text-[#716C67]">
                    <span>Taxes</span>
                    <span className="font-semibold text-[#252321]">
                      {formatPrice(tax)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#716C67]">
                  <span>Shipping</span>
                  <span
                    className={
                      shippingCost === 0
                        ? "text-[#6F4E37] font-bold"
                        : "font-semibold text-[#252321]"
                    }
                  >
                    {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
                  </span>
                </div>

                <div className="border-t border-[#E5E4E2] pt-3 flex items-end justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                    FINAL AMOUNT
                  </span>
                  <span className="text-xl font-serif font-bold text-[#252321]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  processing ||
                  walletLoading ||
                  walletInsufficient ||
                  (paymentMethod === "wallet" && !walletLoaded)
                }
                className="w-full h-12 mt-6 bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#211B18] transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-[#D8D3CF]"
              >
                {processing
                  ? "PROCESSING ORDER..."
                  : paymentMethod === "razorpay"
                  ? "PAY WITH RAZORPAY"
                  : paymentMethod === "wallet"
                  ? walletInsufficient
                    ? "INSUFFICIENT BALANCE"
                    : "PAY WITH WALLET"
                  : "CONFIRM CASH ON DELIVERY"}
                {!processing && !walletInsufficient && <span>→</span>}
              </button>

              <button
                type="button"
                onClick={handleBackToReview}
                disabled={processing}
                className="mt-3 block w-full text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#716C67] hover:text-[#6F4E37]"
              >
                ← RETURN TO REVIEW
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;