import { useNavigate } from "react-router-dom";

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // DATE
  // =========================================================

  const currentDate = new Date().toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

  // =========================================================
  // SUMMARY CARDS
  // =========================================================

  const summaryCards = [
    {
      title: "Total Orders",
      value: "128",
      change: "+12%",
      subtitle: "from last month",
      icon: "▣",
      tone: "blue",
      chart: [20, 15, 28, 23, 34, 30, 42],
    },
    {
      title: "Pending Orders",
      value: "12",
      change: "+8%",
      subtitle: "from last month",
      icon: "◷",
      tone: "amber",
      chart: [15, 18, 13, 25, 21, 29, 34],
    },
    {
      title: "Processing",
      value: "18",
      change: "+5%",
      subtitle: "from last month",
      icon: "ϟ",
      tone: "cyan",
      chart: [16, 20, 17, 26, 24, 31, 35],
    },
    {
      title: "Shipped",
      value: "31",
      change: "+11%",
      subtitle: "from last month",
      icon: "▰",
      tone: "indigo",
      chart: [14, 19, 16, 25, 28, 32, 38],
    },
    {
      title: "Delivered",
      value: "61",
      change: "+18%",
      subtitle: "from last month",
      icon: "◆",
      tone: "green",
      chart: [12, 18, 17, 28, 24, 34, 42],
    },
  ];

  // =========================================================
  // RECENT ORDERS
  // =========================================================

  const recentOrders = [
    {
      id: "GS-88210",
      customer: "Nishmal",
      date: "31 Aug 2026",
      total: "₹3,398",
      status: "SHIPPED",
    },
    {
      id: "GS-88209",
      customer: "Eren Yeager",
      date: "30 Aug 2026",
      total: "₹1,250",
      status: "PROCESSING",
    },
    {
      id: "GS-88208",
      customer: "Mikasa Ackerman",
      date: "30 Aug 2026",
      total: "₹4,999",
      status: "DELIVERED",
    },
    {
      id: "GS-88207",
      customer: "Levi Ackerman",
      date: "29 Aug 2026",
      total: "₹1,250",
      status: "CANCELLED",
    },
    {
      id: "GS-88206",
      customer: "Armin Arlert",
      date: "28 Aug 2026",
      total: "₹12,450",
      status: "SHIPPED",
    },
  ];

  // =========================================================
  // LOW STOCK
  // =========================================================

  const lowStockProducts = [
    {
      name: "Akatsuki Cloud Jacket",
      stock: 4,
    },
    {
      name: "Attack Titan Figure",
      stock: 7,
    },
    {
      name: "Sukuna Necklace",
      stock: 3,
    },
  ];

  // =========================================================
  // PENDING RETURNS
  // =========================================================

  const pendingReturns = [
    {
      id: "RET-00921",
      customer: "Nishmal",
      amount: "₹2,499",
    },
    {
      id: "RET-00920",
      customer: "Eren Yeager",
      amount: "₹3,499",
    },
  ];

  // =========================================================
  // STATUS
  // =========================================================

  const statusClass = (status) => {
    switch (status) {
      case "PROCESSING":
        return "border-blue-200 bg-blue-50 text-blue-600";

      case "DELIVERED":
        return "border-emerald-200 bg-emerald-50 text-emerald-600";

      case "CANCELLED":
        return "border-slate-200 bg-slate-100 text-slate-500";

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

  const MiniChart = ({ values, tone }) => {
    const max = Math.max(...values);
    const min = Math.min(...values);

    const points = values
      .map((value, index) => {
        const x =
          (index / (values.length - 1)) * 100;

        const y =
          34 -
          ((value - min) /
            Math.max(max - min, 1)) *
            25;

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
        return "border-blue-200 bg-blue-50 text-blue-600";
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
        return "text-blue-600";
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

            <span className="font-medium text-blue-600">
              Dashboard
            </span>

            <span className="text-[#a7b1bf]">
              /
            </span>

            <span className="text-[#7d8999]">
              Overview
            </span>

          </div>

          {/* HEADER */}

          <div className="mt-[18px] flex flex-col justify-between gap-[18px] lg:flex-row lg:items-end">

            <div>

              <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#172033]">
                Dashboard
              </h1>

              <p className="mt-[6px] text-[13px] text-[#7a8797]">
                Welcome back, Admin. Here's what's happening with GETSUKA.
              </p>

            </div>

            <div className="flex items-center gap-[10px]">

              <div className="hidden rounded-[8px] border border-[#e1e7ef] bg-[#f8fafc] px-[12px] py-[8px] text-[11px] text-[#687588] sm:block">
                {currentDate}
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/orders")
                }
                className="h-[36px] rounded-[7px] bg-[#2563eb] px-[14px] text-[11px] font-medium text-white transition hover:bg-[#1d4ed8]"
              >
                View Orders
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="px-[26px] py-[22px]">

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

                  <MiniChart
                    values={card.chart}
                    tone={card.tone}
                  />

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
                    {card.change}
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

                <span className="rounded-full bg-blue-50 px-[8px] py-[4px] text-[9px] font-medium text-blue-600">
                  2026
                </span>

              </div>

              <div className="px-[16px]">

                {/* TODAY */}

                <div className="flex h-[55px] items-center justify-between border-b border-[#edf1f5]">

                  <span className="text-[11px] text-[#7e8a9a]">
                    Today
                  </span>

                  <span className="text-[13px] font-semibold text-[#172033]">
                    ₹12,450
                  </span>

                </div>

                {/* WEEK */}

                <div className="flex h-[55px] items-center justify-between border-b border-[#edf1f5]">

                  <span className="text-[11px] text-[#7e8a9a]">
                    This Week
                  </span>

                  <span className="text-[13px] font-semibold text-[#172033]">
                    ₹84,320
                  </span>

                </div>

                {/* MONTH */}

                <div className="flex h-[55px] items-center justify-between">

                  <span className="text-[11px] text-[#7e8a9a]">
                    This Month
                  </span>

                  <span className="text-[13px] font-semibold text-[#172033]">
                    ₹3,42,890
                  </span>

                </div>

                {/* BAR CHART */}

                <div className="flex h-[110px] items-end justify-between border-t border-[#edf1f5] px-[8px] pb-[15px] pt-[18px]">

                  {[22, 12, 35, 28, 43, 38, 50].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="w-[8px] rounded-t-[3px] bg-blue-500 transition hover:bg-blue-600"
                        style={{
                          height: `${height}px`,
                        }}
                      />
                    )
                  )}

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
                  onClick={() =>
                    navigate("/admin/orders")
                  }
                  className="text-[10px] font-medium text-blue-600 transition hover:text-blue-800"
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

                    {recentOrders.map((order) => (

                      <tr
                        key={order.id}
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
                            {order.date}
                          </p>

                        </td>

                        <td className="py-[14px]">

                          <p className="text-[11px] font-medium text-[#263246]">
                            {order.total}
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

                    ))}

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
                    Products needing attention
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/admin/products")
                  }
                  className="text-[10px] font-medium text-blue-600"
                >
                  Products →
                </button>

              </div>

              {lowStockProducts.map(
                (product, index) => (

                  <div
                    key={product.name}
                    className={`flex min-h-[62px] items-center justify-between gap-[10px] px-[16px] ${
                      index !==
                      lowStockProducts.length - 1
                        ? "border-b border-[#edf1f5]"
                        : ""
                    }`}
                  >

                    <div className="min-w-0">

                      <p className="truncate text-[11px] font-medium text-[#344055]">
                        {product.name}
                      </p>

                      <p className="mt-[3px] text-[9px] text-[#9aa5b3]">
                        Inventory alert
                      </p>

                    </div>

                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-[9px] py-[5px] text-[9px] font-medium text-amber-600">
                      {product.stock} left
                    </span>

                  </div>

                )
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
                  onClick={() =>
                    navigate("/admin/returns")
                  }
                  className="text-[10px] font-medium text-blue-600"
                >
                  Returns →
                </button>

              </div>

              {pendingReturns.map(
                (item, index) => (

                  <div
                    key={item.id}
                    className={`flex min-h-[70px] items-center justify-between gap-[10px] px-[16px] ${
                      index !==
                      pendingReturns.length - 1
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
                        <span className="mx-[5px]">
                          ·
                        </span>
                        {item.amount}
                      </p>

                    </div>

                    <span className="rounded-full border border-slate-200 bg-slate-50 px-[9px] py-[5px] text-[9px] font-medium text-slate-600">
                      Pending
                    </span>

                  </div>

                )
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
                  onClick={() =>
                    navigate("/admin/coupons")
                  }
                  className="text-[10px] font-medium text-blue-600"
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
                    12
                  </span>

                </div>

                <div className="flex h-[58px] items-center justify-between border-b border-[#edf1f5]">

                  <span className="text-[11px] text-[#7f8b9a]">
                    Total Redemptions
                  </span>

                  <span className="text-[13px] font-semibold text-[#263246]">
                    128
                  </span>

                </div>

                <div className="flex h-[70px] items-center justify-between">

                  <div>

                    <p className="text-[9px] uppercase tracking-[0.05em] text-[#9aa5b3]">
                      Top Coupon
                    </p>

                    <p className="mt-[5px] text-[12px] font-semibold text-blue-600">
                      GETSUKA10
                    </p>

                  </div>

                  <span className="rounded-full border border-blue-200 bg-blue-50 px-[10px] py-[6px] text-[9px] font-medium text-blue-600">
                    10% OFF
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default AdminDashboardPage;