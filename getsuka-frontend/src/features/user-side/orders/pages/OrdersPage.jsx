import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getUserOrders } from "../api/orderApi";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD ORDERS
  // =========================================================

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

        setOrders(
          Array.isArray(orderList)
            ? orderList
            : []
        );
      } catch (error) {
        console.error(
          "Load Orders Error:",
          error
        );

        setError(
          error?.response?.data?.message ||
            "Unable to load your orders."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  // =========================================================
  // SEARCH ORDERS
  // =========================================================

  const filteredOrders = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return orders;
    }

    return orders.filter((order) => {
      const orderNumber = String(
        order?.orderNumber || ""
      ).toLowerCase();

      const status = String(
        order?.status || ""
      ).toLowerCase();

      return (
        orderNumber.includes(value) ||
        status.includes(value)
      );
    });
  }, [orders, search]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(
        date
      ).toLocaleDateString("en-IN", {
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

    return `₹${amount.toLocaleString(
      "en-IN"
    )}`;
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case "placed":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

      case "confirmed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";

      case "shipped":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";

      case "out_for_delivery":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";

      case "delivered":
        return "bg-green-500/10 text-green-400 border-green-500/20";

      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";

      case "returned":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";

      default:
        return "bg-white/5 text-gray-400 border-white/10";
    }
  };

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getItemCount = (order) => {
    if (!Array.isArray(order?.items)) {
      return 0;
    }

    return order.items.reduce(
      (total, item) =>
        total +
        Number(item?.quantity || 0),
      0
    );
  };

  const getFirstProductImage = (
    order
  ) => {
    return (
      order?.items?.[0]?.productImage ||
      ""
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

          <div className="mb-10">
            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />

            <div className="mt-4 h-10 w-48 animate-pulse rounded bg-white/10" />

            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-white/10" />
          </div>

          <div className="space-y-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="animate-pulse space-y-5">
                  <div className="flex justify-between gap-4">
                    <div className="h-5 w-40 rounded bg-white/10" />
                    <div className="h-5 w-24 rounded bg-white/10" />
                  </div>

                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-xl bg-white/10" />

                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-48 rounded bg-white/10" />
                      <div className="h-4 w-32 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4">

          <div className="w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-2xl text-red-400">
              !
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              Unable to load orders
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              TRY AGAIN
            </button>

          </div>

        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8">

          <p className="text-xs font-medium uppercase tracking-[0.3em] text-red-500">
            GETSUKA
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            My Orders
          </h1>

          <p className="mt-2 max-w-xl text-sm text-gray-400">
            Track and manage your GETSUKA orders.
          </p>

        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row">

          <div className="relative flex-1">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by order number or status..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-500/50 focus:bg-white/[0.06]"
            />

          </div>

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-red-500/40 hover:text-white"
            >
              CLEAR
            </button>
          )}

        </div>

        {/* =====================================================
            ORDER COUNT
        ===================================================== */}

        <div className="mb-5 flex items-center justify-between">

          <p className="text-sm text-gray-400">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1
              ? "order"
              : "orders"}
          </p>

        </div>

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl">
              📦
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              {search
                ? "No matching orders"
                : "No orders yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
              {search
                ? "Try searching with another order number or status."
                : "Your completed orders will appear here once you place your first GETSUKA order."}
            </p>

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="mt-6 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                CLEAR SEARCH
              </button>
            )}

          </div>
        ) : (
          /* ===================================================
             ORDERS
          =================================================== */

          <div className="space-y-5">

            {filteredOrders.map(
              (order) => {
                const firstImage =
                  getFirstProductImage(
                    order
                  );

                const itemCount =
                  getItemCount(order);

                return (
                  <div
                    key={order?._id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20"
                  >

                    {/* =========================================
                        ORDER HEADER
                    ========================================= */}

                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Order
                        </p>

                        <h2 className="mt-1 text-sm font-semibold text-white">
                          {order?.orderNumber ||
                            "Order"}
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                          Placed on{" "}
                          {formatDate(
                            order?.createdAt
                          )}
                        </p>

                      </div>

                      <div className="flex items-center gap-3">

                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                            order?.status
                          )}`}
                        >
                          {formatStatus(
                            order?.status
                          )}
                        </span>

                      </div>

                    </div>

                    {/* =========================================
                        ORDER CONTENT
                    ========================================= */}

                    <div className="px-5 py-5">

                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">

                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt={
                                  order
                                    ?.items?.[0]
                                    ?.productName ||
                                  "Product"
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl text-gray-600">
                                🛍️
                              </div>
                            )}

                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate text-sm font-semibold text-white">
                              {order
                                ?.items?.[0]
                                ?.productName ||
                                "GETSUKA Product"}
                            </h3>

                            {order?.items
                              ?.length > 1 && (
                              <p className="mt-1 text-xs text-gray-500">
                                +
                                {order.items
                                  .length -
                                  1}{" "}
                                more product
                                {order.items
                                  .length -
                                  1 ===
                                1
                                  ? ""
                                  : "s"}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-gray-400">
                              {itemCount}{" "}
                              {itemCount === 1
                                ? "item"
                                : "items"}
                            </p>

                          </div>

                        </div>

                        <div className="flex items-center justify-between gap-8 sm:justify-end">

                          <div className="text-left sm:text-right">

                            <p className="text-xs uppercase tracking-wider text-gray-500">
                              Total
                            </p>

                            <p className="mt-1 text-lg font-bold text-white">
                              {formatPrice(
                                order?.totalAmount
                              )}
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `/orders/${order?._id}`;
                            }}
                            className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-red-500/50 hover:bg-red-500/10"
                          >
                            VIEW
                          </button>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

    </div>
  );
};

export default OrdersPage;