import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminDashboard } from "../api/adminDashboardApi";

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // DATE
  // =========================================================

  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // =========================================================
  // FETCH DASHBOARD DATA
  // =========================================================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminDashboard();
      setDashboardData(response);
    } catch (err) {
      console.error("Fetch Admin Dashboard Error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // =========================================================
  // EXTRACT DYNAMIC DATA WITH SAFE FALLBACKS
  // =========================================================

  const summary = dashboardData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
  };

  const revenue = dashboardData?.revenue || {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
  };

  const recentOrders = dashboardData?.recentOrders || [];
  const lowStockProducts = dashboardData?.lowStockProducts || [];
  const pendingReturns = dashboardData?.pendingReturns || [];
  const coupons = dashboardData?.coupons || {
    activeCount: 0,
    totalRedemptions: 0,
    topCoupon: null,
  };

  const charts = dashboardData?.charts || {
    salesOverview: [],
    salesValues: [0, 0, 0, 0, 0, 0, 0],
    orderCountValues: [0, 0, 0, 0, 0, 0, 0],
  };

  const salesValues = charts.salesValues || [0, 0, 0, 0, 0, 0, 0];
  const orderCountValues = charts.orderCountValues || [0, 0, 0, 0, 0, 0, 0];
  const maxDailySales = Math.max(...salesValues, 1);

  // =========================================================
  // SUMMARY CARDS
  // =========================================================

  const summaryCards = [
    {
      title: "Total Revenue",
      value: `₹${Number(summary.totalRevenue || 0).toLocaleString("en-IN")}`,
      subtitle: `${summary.totalProducts || 0} active products`,
      icon: "₹",
      tone: "green",
      chart: salesValues.length ? salesValues : [0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Total Orders",
      value: String(summary.totalOrders || 0),
      subtitle: `${summary.totalUsers || 0} registered users`,
      icon: "▣",
      tone: "blue",
      chart: orderCountValues.length ? orderCountValues : [0, 0, 0, 0, 0, 0, 0],
    },
    {
      title: "Pending Orders",
      value: String(summary.pendingOrders || 0),
      subtitle: "Awaiting confirmation",
      icon: "◷",
      tone: "amber",
      chart: [
        Math.max(summary.pendingOrders - 2, 0),
        Math.max(summary.pendingOrders - 1, 0),
        summary.pendingOrders,
        summary.pendingOrders,
        summary.pendingOrders,
        summary.pendingOrders,
        summary.pendingOrders,
      ],
    },
    {
      title: "In Transit",
      value: String(
        (summary.processingOrders || 0) + (summary.shippedOrders || 0)
      ),
      subtitle: `${summary.processingOrders || 0} proc. · ${summary.shippedOrders || 0} shipped`,
      icon: "▰",
      tone: "indigo",
      chart: [
        summary.processingOrders,
        summary.shippedOrders,
        summary.processingOrders,
        summary.shippedOrders,
        summary.processingOrders,
        summary.shippedOrders,
        (summary.processingOrders || 0) + (summary.shippedOrders || 0),
      ],
    },
    {
      title: "Delivered",
      value: String(summary.completedOrders || 0),
      subtitle: `${summary.cancelledOrders || 0} cancelled`,
      icon: "◆",
      tone: "cyan",
      chart: [
        Math.max(summary.completedOrders - 5, 0),
        Math.max(summary.completedOrders - 4, 0),
        Math.max(summary.completedOrders - 3, 0),
        Math.max(summary.completedOrders - 2, 0),
        Math.max(summary.completedOrders - 1, 0),
        summary.completedOrders,
        summary.completedOrders,
      ],
    },
  ];

  // =========================================================
  // STATUS CLASS
  // =========================================================

  const statusClass = (status) => {
    switch (String(status).toUpperCase()) {
      case "PROCESSING":
      case "CONFIRMED":
        return "border-[#E5E4E2] bg-[#E6E0F0] text-[#6F4E37]";

      case "DELIVERED":
        return "border-emerald-200 bg-emerald-50 text-emerald-600";

      case "CANCELLED":
        return "border-slate-200 bg-slate-100 text-slate-500";

      case "PLACED":
        return "border-amber-200 bg-amber-50 text-amber-600";

      case "OUT_FOR_DELIVERY":
      case "SHIPPED":
      default:
        return "border-indigo-200 bg-indigo-50 text-indigo-600";
    }
  };

  // =========================================================
  // CHART COLORS
  // =========================================================

  const chartColor = (tone) => {
    switch (tone) {
      case "cyan":
        return "#0891b2";

      case "amber":
        return "#d97706";

      case "indigo":
        return "#4f46e5";

      case "green":
        return "#059669";

      case "blue":
      default:
        return "#2563eb";
    }
  };

  // =========================================================
  // MINI CHART
  // =========================================================

  const MiniChart = ({ values = [], tone = "blue" }) => {
    if (!values || values.length === 0) return null;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    const points = values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * 100;
        const y =
          34 -
          ((value - min) / Math.max(max - min, 1)) * 25;

        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg
        viewBox="0 0 100 40"
        className="h-[38px] w-[76px]"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={chartColor(tone)}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={`0,40 ${points} 100,40`}
          fill={chartColor(tone)}
          opacity="0.06"
          stroke="none"
        />
      </svg>
    );
  };

  // =========================================================
  // TONE CLASSES
  // =========================================================

  const getCardIconClass = (tone) => {
    switch (tone) {
      case "cyan":
        return "border-cyan-200 bg-cyan-50 text-cyan-600";

      case "amber":
        return "border-amber-200 bg-amber-50 text-amber-600";

      case "indigo":
        return "border-indigo-200 bg-indigo-50 text-indigo-600";

      case "green":
        return "border-emerald-200 bg-emerald-50 text-emerald-600";

      case "blue":
      default:
        return "border-[#E5E4E2] bg-[#E6E0F0] text-[#6F4E37]";
    }
  };

  const getChangeClass = (tone) => {
    switch (tone) {
      case "amber":
        return "text-amber-600";

      case "cyan":
        return "text-cyan-600";

      case "indigo":
        return "text-indigo-600";

      case "green":
        return "text-emerald-600";

      case "blue":
      default:
        return "text-[#6F4E37]";
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f5f8fc] text-[#172033]">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="border-b border-[#e3e9f1] bg-white">
        <div className="px-[26px] py-[24px]">
          {/* BREADCRUMB */}
          <div className="flex items-center gap-[8px] text-[11px]">
            <span className="font-medium text-[#6F4E37]">Dashboard</span>
            <span className="text-[#a7b1bf]">/</span>
            <span className="text-[#7d8999]">Overview</span>
          </div>

          {/* HEADER */}
          <div className="mt-[18px] flex flex-col justify-between gap-[18px] lg:flex-row lg:items-end">
            <div>
              <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
                Dashboard
              </h1>

              <p className="mt-[6px] text-[13px] text-[#7a8797]">
                Welcome back, Admin. Real-time metrics from the GETSUKA database.
              </p>
            </div>

            <div className="flex items-center gap-[10px]">
              <div className="hidden rounded-[8px] border border-[#e1e7ef] bg-[#f8fafc] px-[12px] py-[8px] text-[11px] text-[#687588] sm:block">
                {currentDate}
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                disabled={loading}
                className="h-[36px] rounded-[7px] border border-[#e1e7ef] bg-white px-[12px] text-[11px] font-medium text-[#4b5563] transition hover:bg-[#f8fafc] disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/orders")}
                className="h-[36px] rounded-[7px] bg-[#2563eb] px-[14px] text-[11px] font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          ERROR STATE
      ===================================================== */}

      {error && (
        <div className="mx-[26px] mt-[20px] flex items-center justify-between rounded-[8px] border border-red-200 bg-red-50 p-[14px] text-[12px] text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="rounded-[6px] bg-[#6F4E37] px-[12px] py-[6px] text-[11px] font-medium text-white hover:bg-[#5a3e2b] transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="px-[26px] py-[22px]">
        {/* LOADING INDICATOR */}
        {loading && !dashboardData && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-[12px] rounded-[10px] border border-[#e0e7ef] bg-white p-[30px]">
            <div className="h-[32px] w-[32px] animate-spin rounded-full border-4 border-[#e2e8f0] border-t-[#6F4E37]" />
            <p className="text-[12px] text-[#64748b]">
              Loading real-time dashboard data...
            </p>
          </div>
        )}

        {(!loading || dashboardData) && (
          <>
            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <section>
              <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[10px] border border-[#e0e7ef] bg-white p-[16px] shadow-[0_2px_10px_rgba(15,23,42,0.035)] transition hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-[38px] w-[38px] items-center justify-center rounded-[9px] border text-[15px] ${getCardIconClass(
                          card.tone
                        )}`}
                      >
                        {card.icon}
                      </div>

                      <MiniChart values={card.chart} tone={card.tone} />
                    </div>

                    <p className="mt-[16px] text-[11px] font-medium uppercase tracking-[0.04em] text-[#7c8999]">
                      {card.title}
                    </p>

                    <div className="mt-[5px] flex items-end justify-between gap-[8px]">
                      <p className="text-[25px] font-semibold leading-none tracking-[-0.03em] text-[#172033]">
                        {card.value}
                      </p>

                      <span
                        className={`text-[10px] font-medium ${getChangeClass(
                          card.tone
                        )}`}
                      >
                        Live
                      </span>
                    </div>

                    <p className="mt-[7px] text-[10px] text-[#98a3b1]">
                      {card.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* =================================================
                SALES + RECENT ORDERS
            ================================================= */}

            <section className="mt-[16px]">
              <div className="grid grid-cols-1 gap-[14px] xl:grid-cols-[280px_1fr]">
                {/* =============================================
                    SALES OVERVIEW
                ============================================= */}

                <div className="overflow-hidden rounded-[10px] border border-[#e0e7ef] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex h-[52px] items-center justify-between border-b border-[#edf1f5] px-[16px]">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#172033]">
                        Sales Overview
                      </h2>

                      <p className="mt-[2px] text-[10px] text-[#9aa5b3]">
                        Revenue summary
                      </p>
                    </div>

                    <span className="rounded-full bg-[#E6E0F0] px-[8px] py-[4px] text-[9px] font-medium text-[#6F4E37]">
                      {new Date().getFullYear()}
                    </span>
                  </div>

                  <div className="px-[16px]">
                    {/* TODAY */}
                    <div className="flex h-[55px] items-center justify-between border-b border-[#edf1f5]">
                      <span className="text-[11px] text-[#7e8a9a]">Today</span>
                      <span className="text-[13px] font-semibold text-[#172033]">
                        ₹{Number(revenue.today || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* WEEK */}
                    <div className="flex h-[55px] items-center justify-between border-b border-[#edf1f5]">
                      <span className="text-[11px] text-[#7e8a9a]">
                        This Week
                      </span>
                      <span className="text-[13px] font-semibold text-[#172033]">
                        ₹{Number(revenue.thisWeek || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* MONTH */}
                    <div className="flex h-[55px] items-center justify-between border-b border-[#edf1f5]">
                      <span className="text-[11px] text-[#7e8a9a]">
                        This Month
                      </span>
                      <span className="text-[13px] font-semibold text-[#172033]">
                        ₹{Number(revenue.thisMonth || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* YEAR */}
                    <div className="flex h-[55px] items-center justify-between">
                      <span className="text-[11px] text-[#7e8a9a]">
                        This Year
                      </span>
                      <span className="text-[13px] font-semibold text-[#172033]">
                        ₹{Number(revenue.thisYear || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* 7-DAY BAR CHART */}
                    <div className="border-t border-[#edf1f5] px-[4px] pb-[15px] pt-[18px]">
                      <div className="flex h-[80px] items-end justify-between gap-[6px]">
                        {(charts.salesOverview || []).map((dayStat, index) => {
                          const barHeight =
                            maxDailySales > 0 && dayStat.sales > 0
                              ? Math.max(
                                  Math.round(
                                    (dayStat.sales / maxDailySales) * 65
                                  ),
                                  6
                                )
                              : 4;

                          return (
                            <div
                              key={dayStat.date || index}
                              className="group flex flex-1 flex-col items-center gap-[4px]"
                              title={`${dayStat.day} (${dayStat.date}): ₹${Number(dayStat.sales).toLocaleString("en-IN")} (${dayStat.orders} orders)`}
                            >
                              <div
                                className="w-full rounded-t-[3px] bg-[#6F4E37] transition hover:bg-[#6F4E37]"
                                style={{
                                  height: `${barHeight}px`,
                                }}
                              />
                              <span className="text-[8px] text-[#9aa5b3]">
                                {dayStat.day}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-[8px] text-center text-[9px] text-[#9aa5b3]">
                        7-Day Daily Revenue Trend
                      </p>
                    </div>
                  </div>
                </div>

                {/* =============================================
                    RECENT ORDERS
                ============================================= */}

                <div className="overflow-hidden rounded-[10px] border border-[#e0e7ef] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex min-h-[52px] items-center justify-between gap-[10px] border-b border-[#edf1f5] px-[16px]">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#172033]">
                        Recent Orders
                      </h2>

                      <p className="mt-[2px] text-[10px] text-[#9aa5b3]">
                        Latest customer activity
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/orders")}
                      className="text-[10px] font-medium text-[#6F4E37] transition hover:text-[#5a3e2b]"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px]">
                      <thead>
                        <tr className="border-b border-[#edf1f5]">
                          <th className="px-[16px] py-[12px] text-left text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8c98a8]">
                            Order
                          </th>

                          <th className="py-[12px] text-left text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8c98a8]">
                            Customer
                          </th>

                          <th className="py-[12px] text-left text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8c98a8]">
                            Date
                          </th>

                          <th className="py-[12px] text-left text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8c98a8]">
                            Total
                          </th>

                          <th className="px-[16px] py-[12px] text-right text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8c98a8]">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-[16px] py-[32px] text-center text-[11px] text-[#94a3b8]"
                            >
                              No orders found in the database.
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((order) => (
                            <tr
                              key={order.orderId || order.id}
                              className="border-b border-[#f0f3f6] transition last:border-0 hover:bg-[#f8fafc]"
                            >
                              <td className="px-[16px] py-[14px]">
                                <p className="text-[11px] font-medium text-[#263246]">
                                  {order.id}
                                </p>
                              </td>

                              <td className="py-[14px]">
                                <p className="text-[11px] text-[#3e4a5d]">
                                  {order.customer}
                                </p>
                              </td>

                              <td className="py-[14px]">
                                <p className="text-[10px] text-[#8995a5]">
                                  {order.date
                                    ? new Date(order.date).toLocaleDateString(
                                        "en-GB",
                                        {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        }
                                      )
                                    : "N/A"}
                                </p>
                              </td>

                              <td className="py-[14px]">
                                <p className="text-[11px] font-medium text-[#263246]">
                                  ₹
                                  {Number(order.total || 0).toLocaleString(
                                    "en-IN"
                                  )}
                                </p>
                              </td>

                              <td className="px-[16px] py-[14px] text-right">
                                <span
                                  className={`inline-flex min-w-[82px] justify-center rounded-full border px-[9px] py-[5px] text-[9px] font-medium ${statusClass(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================
                LOWER CARDS
            ================================================= */}

            <section className="mt-[16px] pb-[28px]">
              <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
                {/* =============================================
                    LOW STOCK
                ============================================= */}

                <div className="overflow-hidden rounded-[10px] border border-[#e0e7ef] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex h-[52px] items-center justify-between border-b border-[#edf1f5] px-[16px]">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#172033]">
                        Low Stock
                      </h2>

                      <p className="mt-[2px] text-[10px] text-[#9aa5b3]">
                        Products needing attention (≤ 5 units)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/products")}
                      className="text-[10px] font-medium text-[#6F4E37] hover:text-[#5a3e2b]"
                    >
                      Products →
                    </button>
                  </div>

                  {lowStockProducts.length === 0 ? (
                    <div className="flex min-h-[140px] items-center justify-center px-[16px] text-[11px] text-[#94a3b8]">
                      All product inventory levels are healthy.
                    </div>
                  ) : (
                    lowStockProducts.map((product, index) => (
                      <div
                        key={`${product.productId}-${product.variantId || index}`}
                        className={`flex min-h-[62px] items-center justify-between gap-[10px] px-[16px] ${
                          index !== lowStockProducts.length - 1
                            ? "border-b border-[#edf1f5]"
                            : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-[#344055]">
                            {product.name}
                          </p>

                          <p className="mt-[3px] text-[9px] text-[#9aa5b3]">
                            {product.variant || "Standard"}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-[9px] py-[5px] text-[9px] font-medium text-amber-600">
                          {product.stock} left
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* =============================================
                    PENDING RETURNS
                ============================================= */}

                <div className="overflow-hidden rounded-[10px] border border-[#e0e7ef] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex h-[52px] items-center justify-between border-b border-[#edf1f5] px-[16px]">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#172033]">
                        Pending Returns
                      </h2>

                      <p className="mt-[2px] text-[10px] text-[#9aa5b3]">
                        Requests awaiting review
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/orders/returns")}
                      className="text-[10px] font-medium text-[#6F4E37] hover:text-[#5a3e2b]"
                    >
                      Returns →
                    </button>
                  </div>

                  {pendingReturns.length === 0 ? (
                    <div className="flex min-h-[140px] items-center justify-center px-[16px] text-[11px] text-[#94a3b8]">
                      No pending return requests.
                    </div>
                  ) : (
                    pendingReturns.map((item, index) => (
                      <div
                        key={item.orderId || item.id || index}
                        className={`flex min-h-[70px] items-center justify-between gap-[10px] px-[16px] ${
                          index !== pendingReturns.length - 1
                            ? "border-b border-[#edf1f5]"
                            : ""
                        }`}
                      >
                        <div>
                          <p className="text-[11px] font-medium text-[#344055]">
                            {item.id}
                          </p>

                          <p className="mt-[4px] text-[10px] text-[#8b97a6]">
                            {item.customer}
                            <span className="mx-[5px]">·</span>₹
                            {Number(item.amount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-[9px] py-[5px] text-[9px] font-medium uppercase text-slate-600">
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* =============================================
                    COUPON OVERVIEW
                ============================================= */}

                <div className="overflow-hidden rounded-[10px] border border-[#e0e7ef] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">
                  <div className="flex h-[52px] items-center justify-between border-b border-[#edf1f5] px-[16px]">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#172033]">
                        Coupon Overview
                      </h2>

                      <p className="mt-[2px] text-[10px] text-[#9aa5b3]">
                        Promotion performance
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/admin/coupons")}
                      className="text-[10px] font-medium text-[#6F4E37] hover:text-[#5a3e2b]"
                    >
                      Manage →
                    </button>
                  </div>

                  <div className="px-[16px]">
                    <div className="flex h-[58px] items-center justify-between border-b border-[#edf1f5]">
                      <span className="text-[11px] text-[#7f8b9a]">
                        Active Coupons
                      </span>

                      <span className="text-[13px] font-semibold text-[#263246]">
                        {coupons.activeCount ?? 0}
                      </span>
                    </div>

                    <div className="flex h-[58px] items-center justify-between border-b border-[#edf1f5]">
                      <span className="text-[11px] text-[#7f8b9a]">
                        Total Redemptions
                      </span>

                      <span className="text-[13px] font-semibold text-[#263246]">
                        {coupons.totalRedemptions ?? 0}
                      </span>
                    </div>

                    <div className="flex h-[70px] items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.05em] text-[#9aa5b3]">
                          Top Coupon
                        </p>

                        <p className="mt-[5px] text-[12px] font-semibold text-[#6F4E37]">
                          {coupons.topCoupon?.code || "No redemptions yet"}
                        </p>
                      </div>

                      {coupons.topCoupon && (
                        <span className="rounded-full border border-[#E5E4E2] bg-[#E6E0F0] px-[10px] py-[6px] text-[9px] font-medium text-[#6F4E37]">
                          {coupons.topCoupon.discount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;