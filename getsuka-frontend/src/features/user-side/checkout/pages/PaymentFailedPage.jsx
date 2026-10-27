import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api/paymentApi";
import { loadRazorpay } from "../utils/loadRazorpay";
import { createOrder } from "../../orders/api/orderApi";

const RETRY_DELAY = 900;
const PENDING_PAYMENT_KEY = "getsukaPendingPayment";
const FAILED_PAYMENTS_KEY = "getsukaFailedPayments";
const LEGACY_FAILED_PAYMENT_KEY = "getsukaFailedPayment";
const RETRY_SUCCESS_LOCK_PREFIX = "getsukaRetrySuccess:";

const PaymentFailedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const retryProcessingRef = useRef(false);

  const [timeLeft, setTimeLeft] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [failedPayment, setFailedPayment] = useState(null);
  const [animationVisible, setAnimationVisible] = useState(true);

  const locationErrorMessage =
    location.state?.message ||
    "Your payment could not be completed. Please try again.";

  const getPendingPayment = () => {
    try {
      const value = sessionStorage.getItem(PENDING_PAYMENT_KEY);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Pending Payment Parse Error:", error);
      return null;
    }
  };

  const getFailedPayments = () => {
    try {
      const stored = sessionStorage.getItem(FAILED_PAYMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }

      const legacy = sessionStorage.getItem(LEGACY_FAILED_PAYMENT_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (parsedLegacy && typeof parsedLegacy === "object") {
          const migrated = [parsedLegacy];
          sessionStorage.setItem(
            FAILED_PAYMENTS_KEY,
            JSON.stringify(migrated)
          );
          sessionStorage.removeItem(LEGACY_FAILED_PAYMENT_KEY);
          return migrated;
        }
      }
      return [];
    } catch (error) {
      console.error("Failed Payments Parse Error:", error);
      return [];
    }
  };

  const saveFailedPayments = (payments) => {
    try {
      sessionStorage.setItem(
        FAILED_PAYMENTS_KEY,
        JSON.stringify(Array.isArray(payments) ? payments : [])
      );
    } catch (error) {
      console.error("Save Failed Payments Error:", error);
    }
  };

  const getActiveFailedPaymentId = () => {
    const stateId = location.state?.failedPaymentId;
    if (stateId) return String(stateId);

    const pending = getPendingPayment();
    if (pending?.temporaryOrderNumber) {
      return String(pending.temporaryOrderNumber);
    }
    return null;
  };

  const findFailedPayment = (paymentId) => {
    if (!paymentId) return null;
    return (
      getFailedPayments().find(
        (payment) =>
          String(payment?.temporaryOrderNumber || "") === String(paymentId)
      ) || null
    );
  };

  const saveFailedPayment = () => {
    try {
      const pendingPayment = getPendingPayment();
      let failedPayments = getFailedPayments();

      if (!pendingPayment) {
        const activeId = getActiveFailedPaymentId();
        const existing = failedPayments.find(
          (payment) =>
            String(payment?.temporaryOrderNumber || "") ===
            String(activeId || "")
        );

        if (existing) {
          setFailedPayment(existing);
          return existing;
        }
        return null;
      }

      const temporaryOrderNumber = String(
        pendingPayment?.temporaryOrderNumber || `FAILED-${Date.now()}`
      );

      const existingIndex = failedPayments.findIndex(
        (payment) =>
          String(payment?.temporaryOrderNumber || "") === temporaryOrderNumber
      );

      const existingPayment =
        existingIndex >= 0 ? failedPayments[existingIndex] : null;

      let failedAt = existingPayment?.failedAt
        ? new Date(existingPayment.failedAt).getTime()
        : pendingPayment?.failedAt
        ? new Date(pendingPayment.failedAt).getTime()
        : 0;

      if (!failedAt) failedAt = Date.now();

      let retryExpiresAt = existingPayment?.retryExpiresAt
        ? new Date(existingPayment.retryExpiresAt).getTime()
        : pendingPayment?.retryExpiresAt
        ? new Date(pendingPayment.retryExpiresAt).getTime()
        : 0;

      if (!retryExpiresAt || retryExpiresAt <= Date.now()) {
        retryExpiresAt = failedAt + RETRY_DELAY * 1000;
      }

      const failedCartItems = Array.isArray(pendingPayment?.failedCartItems)
        ? pendingPayment.failedCartItems
        : Array.isArray(pendingPayment?.cartItems)
        ? pendingPayment.cartItems
        : Array.isArray(existingPayment?.failedCartItems)
        ? existingPayment.failedCartItems
        : [];

      const failedPaymentData = {
        ...(existingPayment || {}),
        ...pendingPayment,
        paymentStatus: "failed",
        paymentMethod: "razorpay",
        failedAt: new Date(failedAt).toISOString(),
        retryExpiresAt: new Date(retryExpiresAt).toISOString(),
        failureMessage:
          location.state?.message ||
          pendingPayment?.failureMessage ||
          existingPayment?.failureMessage ||
          "Your payment could not be completed. Please try again.",
        temporaryOrderNumber,
        temporaryOrderStatus: "payment_failed",
        orderData:
          pendingPayment?.orderData || existingPayment?.orderData || {},
        failedCartItems,
      };

      if (existingIndex >= 0) {
        failedPayments[existingIndex] = failedPaymentData;
      } else {
        failedPayments = [...failedPayments, failedPaymentData];
      }

      saveFailedPayments(failedPayments);
      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify(failedPaymentData)
      );

      setFailedPayment(failedPaymentData);
      return failedPaymentData;
    } catch (error) {
      console.error("Save Failed Payment Error:", error);
      return null;
    }
  };

  const updateFailedPaymentStatus = (
    payment,
    paymentStatus,
    failureMessage = ""
  ) => {
    try {
      const updatedPayment = {
        ...payment,
        paymentStatus,
        retryExpiresAt: payment?.retryExpiresAt,
        ...(failureMessage ? { failureMessage } : {}),
      };

      const updatedPayments = getFailedPayments().map((item) =>
        String(item?.temporaryOrderNumber || "") ===
        String(payment?.temporaryOrderNumber || "")
          ? updatedPayment
          : item
      );

      saveFailedPayments(updatedPayments);
      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify(updatedPayment)
      );
      setFailedPayment(updatedPayment);
    } catch (error) {
      console.error("Update Failed Payment Error:", error);
    }
  };

  useEffect(() => {
    const loadFailedPayment = () => {
      try {
        const payments = getFailedPayments();
        const activeId = getActiveFailedPaymentId();

        const selected =
          payments.find(
            (payment) =>
              String(payment?.temporaryOrderNumber || "") ===
              String(activeId || "")
          ) || null;

        if (selected) {
          const expiry = new Date(selected.retryExpiresAt).getTime();
          if (expiry > Date.now()) {
            setFailedPayment(selected);
            return;
          }
        }
        saveFailedPayment();
      } catch (error) {
        console.error("Load Failed Payment Error:", error);
        saveFailedPayment();
      }
    };

    loadFailedPayment();
  }, []);

  useEffect(() => {
    if (!failedPayment) return;

    const animationKey = `getsukaFailedPaymentAnimationShown:${failedPayment.temporaryOrderNumber}`;
    const alreadyShown = sessionStorage.getItem(animationKey);

    if (alreadyShown) {
      setAnimationVisible(false);
      return;
    }

    sessionStorage.setItem(animationKey, "true");
    const timer = setTimeout(() => {
      setAnimationVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [failedPayment?.temporaryOrderNumber]);

  useEffect(() => {
    const updateTimer = () => {
      if (!failedPayment) {
        setTimeLeft(0);
        return;
      }

      const expiry = new Date(failedPayment.retryExpiresAt).getTime();
      if (!expiry || Number.isNaN(expiry)) {
        setTimeLeft(0);
        return;
      }

      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        return;
      }

      setTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [failedPayment]);

  const removeFailedPayment = (paymentId) => {
    const remaining = getFailedPayments().filter(
      (payment) =>
        String(payment?.temporaryOrderNumber || "") !== String(paymentId || "")
    );
    saveFailedPayments(remaining);
    return remaining;
  };

  useEffect(() => {
    if (!failedPayment || timeLeft > 0) return;

    const expiry = new Date(failedPayment.retryExpiresAt).getTime();
    if (!expiry || expiry > Date.now()) return;

    try {
      const paymentId = failedPayment.temporaryOrderNumber;
      removeFailedPayment(paymentId);

      const pendingPayment = getPendingPayment();
      if (
        String(pendingPayment?.temporaryOrderNumber || "") ===
        String(paymentId || "")
      ) {
        sessionStorage.removeItem(PENDING_PAYMENT_KEY);
      }

      setFailedPayment(null);
    } catch (error) {
      console.error("Expired Payment Cleanup Error:", error);
    }
  }, [timeLeft, failedPayment]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const clearCompletedCheckout = (paymentId) => {
    sessionStorage.removeItem("getsukaCheckoutPayment");
    sessionStorage.removeItem("getsukaCheckoutReview");
    sessionStorage.removeItem("getsukaCheckoutShipping");
    sessionStorage.removeItem(PENDING_PAYMENT_KEY);

    if (paymentId) {
      removeFailedPayment(paymentId);
    }
  };

  const completeSuccessfulOrder = async ({
    orderData,
    paymentResponse,
    paymentId,
  }) => {
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
          "Payment was successful, but the order could not be created."
      );
    }

    const createdOrder = response?.order || response?.data || response;
    sessionStorage.setItem("getsukaOrder", JSON.stringify(createdOrder));
    clearCompletedCheckout(paymentId);
    window.dispatchEvent(new Event("cartUpdated"));
    return createdOrder;
  };

  const handleRetryPayment = async () => {
    if (retryProcessingRef.current) return;

    let currentFailedPayment = null;
    try {
      const activeId = getActiveFailedPaymentId();
      currentFailedPayment = findFailedPayment(activeId);
    } catch (error) {
      console.error("Retry Session Parse Error:", error);
    }

    const retryExpiresAt = new Date(
      currentFailedPayment?.retryExpiresAt
    ).getTime();

    if (!retryExpiresAt || retryExpiresAt <= Date.now()) {
      setTimeLeft(0);
      return;
    }

    if (retrying) return;

    setRetryError("");
    setRetrying(true);
    retryProcessingRef.current = true;

    try {
      const orderData = currentFailedPayment?.orderData;
      if (!orderData) {
        throw new Error(
          "Order information is missing. Please start checkout again."
        );
      }

      const total = Number(currentFailedPayment?.total) || 0;
      if (total <= 0) {
        throw new Error(
          "Invalid payment amount. Please return to checkout."
        );
      }

      const latestPayments = getFailedPayments();
      const latestFailedPayment = latestPayments.find(
        (payment) =>
          String(payment?.temporaryOrderNumber || "") ===
          String(currentFailedPayment?.temporaryOrderNumber || "")
      );

      if (!latestFailedPayment) {
        throw new Error(
          "Your retry session has expired. Please start checkout again."
        );
      }

      const latestExpiry = new Date(
        latestFailedPayment.retryExpiresAt
      ).getTime();

      if (latestExpiry <= Date.now()) {
        setTimeLeft(0);
        throw new Error(
          "Your retry window has expired. Please start checkout again."
        );
      }

      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error(
          "Unable to load Razorpay. Please check your internet connection."
        );
      }

      const razorpayResponse = await createRazorpayOrder(
        total,
        latestFailedPayment?.orderData
      );

      if (!razorpayResponse?.success || !razorpayResponse?.order?.id) {
        throw new Error(
          razorpayResponse?.message ||
            "Unable to create a new Razorpay payment order."
        );
      }

      const razorpayOrder = razorpayResponse.order;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          "Razorpay key is missing. Please check the frontend .env file."
        );
      }

      const updatedFailedPayment = {
        ...latestFailedPayment,
        razorpayOrderId: razorpayOrder.id,
        paymentMethod: "razorpay",
        paymentStatus: "retrying",
        retryExpiresAt: latestFailedPayment.retryExpiresAt,
      };

      const updatedPayments = latestPayments.map((payment) =>
        String(payment?.temporaryOrderNumber || "") ===
        String(latestFailedPayment?.temporaryOrderNumber || "")
          ? updatedFailedPayment
          : payment
      );

      saveFailedPayments(updatedPayments);
      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify(updatedFailedPayment)
      );
      setFailedPayment(updatedFailedPayment);

      const successLockKey = `${RETRY_SUCCESS_LOCK_PREFIX}${updatedFailedPayment.temporaryOrderNumber}`;

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "GETSUKA ARCHIVE",
        description: "Payment Retry",
        order_id: razorpayOrder.id,
        prefill: {
          name:
            orderData?.shippingAddress?.fullName ||
            orderData?.selectedAddress?.fullName ||
            "",
          contact:
            orderData?.shippingAddress?.phone ||
            orderData?.selectedAddress?.phone ||
            "",
        },
        notes: {
          paymentMethod: "razorpay",
          retryPayment: "true",
          failedPaymentId: updatedFailedPayment.temporaryOrderNumber,
        },
        theme: {
          color: "#6F4E37",
        },
        handler: async (paymentResponse) => {
          try {
            const existingSuccessLock = sessionStorage.getItem(successLockKey);
            if (
              existingSuccessLock === "processing" ||
              existingSuccessLock === "completed"
            ) {
              return;
            }

            sessionStorage.setItem(successLockKey, "processing");

            const returnedOrderId = String(
              paymentResponse?.razorpay_order_id || ""
            );
            const expectedOrderId = String(razorpayOrder?.id || "");

            if (
              !returnedOrderId ||
              !expectedOrderId ||
              returnedOrderId !== expectedOrderId
            ) {
              throw new Error("Razorpay order ID mismatch. Please try again.");
            }

            const verificationResponse = await verifyRazorpayPayment({
              razorpay_order_id: expectedOrderId,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (!verificationResponse?.success) {
              throw new Error("Payment signature verification failed.");
            }

            const createdOrder = await completeSuccessfulOrder({
              orderData,
              paymentResponse: {
                ...paymentResponse,
                razorpay_order_id: expectedOrderId,
              },
              paymentId: updatedFailedPayment.temporaryOrderNumber,
            });

            sessionStorage.setItem(successLockKey, "completed");
            setRetrying(false);
            retryProcessingRef.current = false;

            navigate("/checkout/order-placed", {
              replace: true,
              state: { order: createdOrder },
            });
          } catch (handlerErr) {
            console.error("Retry Handler Error:", handlerErr);
            setRetrying(false);
            retryProcessingRef.current = false;
            sessionStorage.removeItem(successLockKey);
            setRetryError(
              handlerErr?.message || "Payment verification failed."
            );
          }
        },
        modal: {
          ondismiss: () => {
            setRetrying(false);
            retryProcessingRef.current = false;
            updateFailedPaymentStatus(
              updatedFailedPayment,
              "dismissed",
              "Payment window was closed."
            );
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (response) => {
        console.error("Retry Razorpay Payment Failed:", response);
        try {
          razorpay.close();
        } catch (closeError) {
          console.error("Retry Razorpay Close Error:", closeError);
        }

        setRetrying(false);
        retryProcessingRef.current = false;

        const failureMessage =
          response?.error?.description ||
          response?.error?.reason ||
          "Your payment could not be completed. Please try again.";

        setRetryError(failureMessage);
        updateFailedPaymentStatus(
          updatedFailedPayment,
          "failed",
          failureMessage
        );
      });

      razorpay.open();
    } catch (error) {
      console.error("Retry Razorpay Error:", error);
      setRetrying(false);
      retryProcessingRef.current = false;
      setRetryError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to start the payment. Please try again."
      );
    }
  };

  const handleViewMyOrders = () => navigate("/account/orders", { replace: true });
  const handleContinueShopping = () => navigate("/shop", { replace: true });
  const handleBackToShipping = () => navigate("/checkout", { replace: true });

  const temporaryOrderNumber =
    failedPayment?.temporaryOrderNumber || "FAILED-PAYMENT";
  const temporaryTotal = Number(failedPayment?.total) || 0;
  const temporaryOrderData = failedPayment?.orderData || {};
  const temporaryItemCount = Array.isArray(temporaryOrderData?.items)
    ? temporaryOrderData.items.reduce(
        (sum, item) => sum + Number(item?.quantity || 0),
        0
      )
    : 0;

  const activePaymentMethod =
    failedPayment?.paymentMethod || location.state?.paymentMethod || "razorpay";

  const activeErrorMessage =
    retryError ||
    failedPayment?.failureMessage ||
    location.state?.message ||
    locationErrorMessage;

  const paymentMethodLabel = useMemo(() => {
    if (activePaymentMethod === "razorpay") return "RAZORPAY GATEWAY";
    if (activePaymentMethod === "wallet") return "GETSUKA WALLET";
    if (activePaymentMethod === "cod") return "CASH ON DELIVERY";
    return String(activePaymentMethod || "RAZORPAY").toUpperCase();
  }, [activePaymentMethod]);

  const formatPrice = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  return (
    <div className="min-h-screen bg-[#181311] text-[#FAF9F7] selection:bg-[#6F4E37] selection:text-white">
      {/* LUXURY FAILED THEME HEADER */}
      <header className="border-b border-[#3D2C23] bg-[#201815]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="text-base font-serif font-bold tracking-[0.25em] text-[#FAF9F7] transition hover:text-[#E6E0F0]"
          >
            GETSUKA
          </button>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E5484D] animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#E5484D] bg-[#3B1A1E] border border-[#6E2E35] px-3 py-1 rounded-full">
              PAYMENT INTERRUPTED
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WITH FAILED THEME */}
      <main className="flex min-h-[calc(100vh-70px)] items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* AMBIENT GLOW */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[#E5484D]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-[560px] relative z-10 border border-[#48372F] bg-[#241C18] p-8 sm:p-11 rounded-[22px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-center">
          {/* ICON */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3D1E1E] border border-[#6E3535] text-[#FF7070] text-2xl font-light shadow-inner">
            ✕
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-[#E6E0F0]">
            TRANSACTION INCOMPLETE
          </p>
          <h1 className="mt-2 text-2xl font-serif font-medium text-[#FAF9F7] md:text-3xl">
            Payment Unsuccessful
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#CDC4DF]">
            Your payment could not be processed at this time. No funds have been permanently charged, and your item reservation is preserved below.
          </p>

          {/* FAILED RECORD DETAILS */}
          {failedPayment && (
            <div className="mt-8 border border-[#3E2E26] bg-[#1B1412] rounded-[14px] p-5 text-left text-xs">
              <div className="flex items-center justify-between border-b border-[#34261F] pb-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#A69C96]">
                  ATTEMPT IDENTIFIER
                </span>
                <span className="font-mono text-xs text-[#E6E0F0]">
                  {temporaryOrderNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#A69C96]">
                    GATEWAY
                  </p>
                  <p className="font-semibold text-[#FAF9F7] mt-0.5">
                    {paymentMethodLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-[#A69C96]">
                    ORDER TOTAL
                  </p>
                  <p className="font-bold text-base text-[#FAF9F7] mt-0.5">
                    {formatPrice(temporaryTotal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATUS NOTICE */}
          <div className="mt-4 border border-[#44332B] bg-[#1E1714] rounded-[12px] p-4 text-xs text-left">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-[#FF9E9E] mb-1">
              REASON REPORTED
            </span>
            <p className="text-[#E5E4E2]">{activeErrorMessage}</p>
          </div>

          {/* RETRY BUTTON & COUNTDOWN */}
          {activePaymentMethod === "razorpay" && (
            <div className="mt-8">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retrying || timeLeft <= 0 || !failedPayment}
                className={`w-full h-12 flex items-center justify-center gap-2 rounded-[10px] text-[10px] font-bold uppercase tracking-[0.2em] transition ${
                  timeLeft <= 0 || !failedPayment
                    ? "cursor-not-allowed bg-[#3A2D26] text-[#716C67]"
                    : "bg-[#6F4E37] text-white hover:bg-[#855E43] shadow-[0_4px_18px_rgba(111,78,55,0.4)]"
                }`}
              >
                {retrying
                  ? "CONNECTING TO RAZORPAY..."
                  : timeLeft <= 0
                  ? "RETRY WINDOW EXPIRED"
                  : "RETRY PAYMENT NOW"}
                {!retrying && timeLeft > 0 && failedPayment && <span>→</span>}
              </button>

              {timeLeft > 0 ? (
                <div className="mt-4 rounded-[12px] border border-[#3E2F27] bg-[#1B1412] p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#CDC4DF]">
                    STOCK RESERVATION WINDOW EXPIRES IN
                  </p>
                  <p className="text-2xl font-mono font-bold text-[#E6E0F0] mt-1">
                    {formatTime()}
                  </p>
                  <p className="text-[9px] text-[#A69C96] mt-1">
                    Your stock reservation remains guaranteed until the timer ends.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-[12px] border border-[#3E2F27] bg-[#1B1412] p-3 text-center">
                  <p className="text-[10px] font-semibold text-[#CDC4DF]">
                    The retry window has expired. You may start a fresh checkout.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleViewMyOrders}
              className="h-11 rounded-[10px] border border-[#48372F] bg-[#1D1614] text-[10px] font-bold uppercase tracking-[0.16em] text-[#E5E4E2] hover:bg-[#2A1F1B] hover:border-[#6F4E37] transition"
            >
              MY ORDERS
            </button>
            <button
              type="button"
              onClick={handleContinueShopping}
              className="h-11 rounded-[10px] border border-[#48372F] bg-[#1D1614] text-[10px] font-bold uppercase tracking-[0.16em] text-[#E5E4E2] hover:bg-[#2A1F1B] hover:border-[#6F4E37] transition"
            >
              CONTINUE SHOPPING
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackToShipping}
            className="mt-5 block w-full text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#CDC4DF] hover:text-white transition"
          >
            ← RETURN TO CHECKOUT
          </button>
        </div>
      </main>
    </div>
  );
};

export default PaymentFailedPage;