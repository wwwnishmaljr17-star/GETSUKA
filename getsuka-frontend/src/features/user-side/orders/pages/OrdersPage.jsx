import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { getUserOrders } from "../api/orderApi";

const FAILED_PAYMENTS_KEY = "getsukaFailedPayments";
const LEGACY_FAILED_PAYMENT_KEY = "getsukaFailedPayment";
const PENDING_PAYMENT_KEY = "getsukaPendingPayment";
const RETRY_SUCCESS_LOCK_PREFIX = "getsukaRetrySuccess:";
const CART_KEY = "getsukaCart";

const OrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [temporaryFailedOrders, setTemporaryFailedOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const getFailedPayments = () => {
    try {
      const storedPayments = sessionStorage.getItem(FAILED_PAYMENTS_KEY);
      if (storedPayments) {
        const parsed = JSON.parse(storedPayments);
        if (Array.isArray(parsed)) return parsed;
      }
      const legacyPayment = sessionStorage.getItem(LEGACY_FAILED_PAYMENT_KEY);
      if (legacyPayment) {
        const parsedLegacy = JSON.parse(legacyPayment);
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
    } catch (err) {
      console.error("Get Failed Payments Error:", err);
      return [];
    }
  };

  const saveFailedPayments = (payments) => {
    try {
      sessionStorage.setItem(
        FAILED_PAYMENTS_KEY,
        JSON.stringify(Array.isArray(payments) ? payments : [])
      );
    } catch (err) {
      console.error("Save Failed Payments Error:", err);
    }
  };

  const removeFailedPayment = (temporaryOrderNumber) => {
    const payments = getFailedPayments();
    const remaining = payments.filter(
      (payment) =>
        String(payment?.temporaryOrderNumber || "") !==
        String(temporaryOrderNumber || "")
    );
    saveFailedPayments(remaining);
    return remaining;
  };

  const createTemporaryFailedOrder = (failedPayment) => {
    if (!failedPayment) return null;
    const orderData = failedPayment?.orderData || {};
    const failedCartItems = Array.isArray(failedPayment?.failedCartItems)
      ? failedPayment.failedCartItems
      : [];

    const items = failedCartItems.map((item, index) => ({
      _id: item?.variantId || item?.productId || `item-${index}`,
      productId: item?.productId,
      variantId: item?.variantId,
      productName: item?.name || "Product",
      productImage: item?.image || "",
      price: Number(item?.price || 0),
      quantity: Number(item?.quantity || 1),
      size: item?.size || "—",
      color: item?.color || "—",
      sku: item?.sku || "",
    }));

    return {
      _id: failedPayment?.temporaryOrderNumber,
      orderNumber: failedPayment?.temporaryOrderNumber,
      createdAt: failedPayment?.failedAt || new Date().toISOString(),
      status: "payment_failed",
      paymentStatus: "failed",
      paymentMethod: failedPayment?.paymentMethod || "razorpay",
      totalAmount: Number(failedPayment?.total || orderData?.total || 0),
      items,
      isTemporaryFailedOrder: true,
      retryExpiresAt: failedPayment?.retryExpiresAt,
      temporaryFailedPayment: failedPayment,
    };
  };

  const loadTemporaryFailedOrders = () => {
    try {
      const failedPayments = getFailedPayments();
      const validOrders = failedPayments
        .filter((payment) => {
          const expiry = new Date(payment?.retryExpiresAt).getTime();
          return expiry > Date.now();
        })
        .map((payment) => createTemporaryFailedOrder(payment))
        .filter(Boolean);

      setTemporaryFailedOrders(validOrders);
    } catch (err) {
      console.error("Load Temporary Failed Orders Error:", err);
      setTemporaryFailedOrders([]);
    }
  };

  useEffect(() => {
    loadTemporaryFailedOrders();
  }, []);

  useEffect(() => {
    const updateTimers = () => {
      setCurrentTime(Date.now());
      const failedPayments = getFailedPayments();
      let hasExpired = false;

      const remainingPayments = failedPayments.filter((payment) => {
        const expiry = new Date(payment?.retryExpiresAt).getTime();
        const active = expiry > Date.now();
        if (!active) hasExpired = true;
        return active;
      });

      if (hasExpired) {
        saveFailedPayments(remainingPayments);
        loadTemporaryFailedOrders();
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getUserOrders();
        const orderList =
          response?.orders ||
          response?.data?.orders ||
          response?.data ||
          [];
        setOrders(Array.isArray(orderList) ? orderList : []);
      } catch (err) {
        console.error("Load Orders Error:", err);
        setError(
          err?.response?.data?.message || "Unable to load your orders."
        );
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const allOrders = useMemo(() => {
    return [...temporaryFailedOrders, ...orders];
  }, [temporaryFailedOrders, orders]);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return allOrders;

    return allOrders.filter((order) => {
      const orderNumber = String(order?.orderNumber || "").toLowerCase();
      const status = String(order?.status || "").toLowerCase();
      const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
      return (
        orderNumber.includes(value) ||
        status.includes(value) ||
        paymentStatus.includes(value)
      );
    });
  }, [allOrders, search]);

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatPrice = (price) => {
    const amount = Number(price || 0);
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatRetryTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case "delivered":
        return "bg-[#E6E0F0] text-[#6F4E37] border-[#E6E0F0]";
      case "shipped":
      case "out_for_delivery":
        return "bg-[#FAF9F7] text-[#6F4E37] border-[#E5E4E2]";
      case "placed":
      case "confirmed":
        return "bg-white text-[#252321] border-[#E5E4E2]";
      case "cancelled":
      case "returned":
      case "payment_failed":
        return "bg-[#FAF9F7] text-[#716C67] border-[#E5E4E2]";
      default:
        return "bg-white text-[#716C67] border-[#E5E4E2]";
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    if (status === "payment_failed") return "Payment Failed";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getItemCount = (order) => {
    if (!Array.isArray(order?.items)) return 0;
    return order.items.reduce(
      (total, item) => total + Number(item?.quantity || 0),
      0
    );
  };

  const getFirstProductImage = (order) => {
    return (
      order?.items?.[0]?.productImage ||
      order?.items?.[0]?.image ||
      order?.items?.[0]?.images?.[0] ||
      ""
    );
  };

  const getRetrySeconds = (order) => {
    if (!order?.retryExpiresAt) return 0;
    const expiryTime = new Date(order.retryExpiresAt).getTime();
    if (!expiryTime || Number.isNaN(expiryTime)) return 0;
    return Math.max(0, Math.ceil((expiryTime - currentTime) / 1000));
  };

  const handleRetryFailedPayment = (order) => {
    if (!order || !order?.isTemporaryFailedOrder) return;
    const retrySeconds = getRetrySeconds(order);
    if (retrySeconds <= 0) {
      loadTemporaryFailedOrders();
      return;
    }
    const failedPayment = order?.temporaryFailedPayment;
    if (!failedPayment) return;

    navigate("/checkout/payment-failed", {
      state: {
        failedPaymentId:
          failedPayment?.temporaryOrderNumber || order?.orderNumber,
        message:
          failedPayment?.failureMessage || "Your payment was not completed.",
        paymentMethod: "razorpay",
      },
    });
  };

  const handleViewFailedPayment = (order) => {
    if (!order || !order?.isTemporaryFailedOrder) return;
    const failedPayment = order?.temporaryFailedPayment;
    navigate("/checkout/payment-failed", {
      state: {
        failedPaymentId:
          failedPayment?.temporaryOrderNumber || order?.orderNumber,
        message:
          failedPayment?.failureMessage || "Your payment was not completed.",
        paymentMethod: "razorpay",
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Retrieving Orders Archive...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex items-center justify-center px-6">
        <div className="w-full max-w-md border border-[#E5E4E2] bg-white p-8 text-center shadow-sm">
          <span className="text-2xl text-[#6F4E37]">!</span>
          <h2 className="mt-3 text-lg font-serif font-medium text-[#252321]">
            Unable to load orders
          </h2>
          <p className="mt-2 text-xs text-[#716C67]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 bg-[#6F4E37] px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#211B18]"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4F9] text-[#252321]">
      <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 lg:px-14">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
            GETSUKA CLIENT SERVICES
          </p>
          <h1 className="mt-2 text-3xl font-serif font-medium text-[#252321] md:text-5xl">
            My Orders
          </h1>
          <p className="mt-2 text-xs text-[#716C67]">
            Track delivery progress, review invoices, and manage returns for your orders.
          </p>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, status, or keyword..."
              className="w-full rounded-[10px] border border-[#E5E4E2] bg-white px-4 py-3 text-xs text-[#252321] outline-none placeholder:text-[#716C67] focus:border-[#6F4E37]"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-[10px] border border-[#E5E4E2] bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#716C67] hover:text-[#252321]"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* ORDER COUNT */}
        <div className="mb-6 flex items-center justify-between border-b border-[#E5E4E2] pb-3 text-xs text-[#716C67]">
          <span>
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "ORDER FOUND" : "ORDERS FOUND"}
          </span>
        </div>

        {/* EMPTY STATE */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-[16px] border border-[#E5E4E2] bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E6E0F0]/50 border border-[#E5E4E2] text-xl text-[#6F4E37]">
              📦
            </div>
            <h2 className="mt-4 text-xl font-serif font-medium text-[#252321]">
              {search ? "No Matching Orders" : "No Orders Yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs text-[#716C67]">
              {search
                ? "Try searching with a different order number or clear your filter."
                : "Your purchased anime apparel pieces will appear here after placing your first order."}
            </p>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-6 rounded-[8px] bg-[#6F4E37] px-6 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#211B18]"
              >
                CLEAR FILTER
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="mt-6 rounded-[8px] bg-[#6F4E37] px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#211B18]"
              >
                START SHOPPING
              </button>
            )}
          </div>
        ) : (
          /* ORDERS LIST */
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const isTemporaryFailed = Boolean(order?.isTemporaryFailedOrder);
              const firstImage = getFirstProductImage(order);
              const itemCount = getItemCount(order);
              const retrySeconds = isTemporaryFailed
                ? getRetrySeconds(order)
                : 0;

              return (
                <article
                  key={order?._id || order?.orderNumber}
                  className="rounded-[16px] border border-[#E5E4E2] bg-white p-6 shadow-xs transition hover:border-[#6F4E37]/50 hover:shadow-md"
                >
                  {/* CARD HEADER */}
                  <div className="flex flex-col gap-4 border-b border-[#E5E4E2] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isTemporaryFailed && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E6E0F0] text-[10px] font-bold text-[#6F4E37]">
                            !
                          </span>
                        )}
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#716C67]">
                          {isTemporaryFailed
                            ? "PENDING PAYMENT ATTEMPT"
                            : "ORDER IDENTIFIER"}
                        </p>
                      </div>
                      <h2 className="mt-1 font-mono text-sm font-bold text-[#252321]">
                        {order?.orderNumber || "Order"}
                      </h2>
                      <p className="mt-1 text-[11px] text-[#716C67]">
                        {isTemporaryFailed ? "Attempted on " : "Placed on "}
                        {formatDate(order?.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(
                          order?.status
                        )}`}
                      >
                        {formatStatus(order?.status)}
                      </span>
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="pt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    {/* PRODUCT PREVIEW */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-16 w-14 bg-[#FAF9F7] border border-[#E5E4E2] shrink-0 overflow-hidden">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt="Product"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[8px] text-[#716C67]">
                            GETSUKA
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-xs font-medium text-[#252321]">
                          {order?.items?.[0]?.productName || "GETSUKA Piece"}
                        </h3>
                        {order?.items?.length > 1 && (
                          <p className="mt-0.5 text-[10px] text-[#716C67]">
                            +{order.items.length - 1} more{" "}
                            {order.items.length - 1 === 1 ? "piece" : "pieces"}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-[#716C67]">
                          Total units: {itemCount}
                        </p>
                      </div>
                    </div>

                    {/* TOTAL & ACTIONS */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-[#716C67]">
                          ORDER TOTAL
                        </p>
                        <p className="mt-0.5 font-serif text-lg font-bold text-[#252321]">
                          {formatPrice(order?.totalAmount)}
                        </p>
                      </div>

                      {isTemporaryFailed ? (
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <div className="flex items-center justify-between border border-[#CDC4DF] bg-[#F6F4F9] px-3.5 py-1.5 text-xs rounded-[8px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F4E37]">
                              RETRY WINDOW
                            </span>
                            <span className="font-mono font-bold text-sm text-[#252321]">
                              {formatRetryTime(retrySeconds)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRetryFailedPayment(order)}
                              disabled={retrySeconds <= 0}
                              className={`flex-1 h-10 px-4 rounded-[8px] text-[10px] font-bold uppercase tracking-wider transition ${
                                retrySeconds > 0
                                  ? "bg-[#6F4E37] text-white hover:bg-[#211B18] shadow-xs"
                                  : "cursor-not-allowed bg-[#D8D3CF] text-white"
                              }`}
                            >
                              {retrySeconds > 0
                                ? "RETRY PAYMENT"
                                : "WINDOW EXPIRED"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewFailedPayment(order)}
                              className="h-10 px-3.5 rounded-[8px] border border-[#E5E4E2] bg-white text-[10px] font-bold uppercase tracking-wider text-[#716C67] hover:border-[#6F4E37] hover:text-[#6F4E37] transition"
                              title="View Order / Payment Resolution"
                            >
                              DETAILS
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order?._id}`)}
                          className="h-10 px-6 rounded-[8px] border border-[#E5E4E2] bg-white text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321] hover:bg-[#F6F4F9] hover:border-[#6F4E37] transition"
                        >
                          VIEW DETAILS →
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
