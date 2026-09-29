import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAdminOrders,
} from "../api/adminOrderApi";

const AdminOrderManagementPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [orders, setOrders] = useState([]);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // FETCH ORDERS
  // =========================================================

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminOrders({
        search: appliedSearch,
        status,
        paymentStatus,
        sort,
        page,
        limit: 10,
      });

      setOrders(response?.orders || []);

      setPagination(
        response?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalOrders: 0,
        }
      );
    } catch (error) {
      console.error(
        "Fetch Admin Orders Error:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch orders"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH WHEN FILTER / SORT / PAGE CHANGES
  // =========================================================

  useEffect(() => {
    fetchOrders();
  }, [
    page,
    appliedSearch,
    status,
    paymentStatus,
    sort,
  ]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setAppliedSearch(search.trim());
  };

  // =========================================================
  // CLEAR
  // =========================================================

  const handleClear = () => {
    setSearch("");
    setAppliedSearch("");
    setStatus("");
    setPaymentStatus("");
    setSort("newest");
    setPage(1);
  };

  // =========================================================
  // FILTERS
  // =========================================================

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handlePaymentStatusChange = (event) => {
    setPaymentStatus(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event) => {
    setSort(event.target.value);
    setPage(1);
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "—";
    }
  };

  const formatPrice = (price) => {
    return `₹${Number(
      price || 0
    ).toLocaleString("en-IN")}`;
  };

  const formatStatus = (value) => {
    if (!value) {
      return "Unknown";
    }

    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getCustomerName = (order) => {
    return (
      order?.shippingAddress?.fullName ||
      "Unknown Customer"
    );
  };

  const getCustomerPhone = (order) => {
    return (
      order?.shippingAddress?.phone ||
      "—"
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

  // =========================================================
  // STATUS COLORS
  // =========================================================

  const getStatusClasses = (value) => {
    switch (value) {
      case "placed":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "confirmed":
        return "border-[#b9d0ff] bg-[#eef4ff] text-[#1557f5]";

      case "shipped":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      case "out_for_delivery":
        return "border-[#ffd2a8] bg-[#fff5eb] text-[#c56b19]";

      case "delivered":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      case "cancelled":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      case "returned":
        return "border-[#d5dce5] bg-[#f3f6f9] text-[#687789]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  const getPaymentStatusClasses = (value) => {
    switch (value) {
      case "paid":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      case "pending":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "failed":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      case "refunded":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  // =========================================================
  // OPEN SEPARATE ORDER DETAILS PAGE
  // =========================================================

  const handleViewOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    navigate(
      `/admin/orders/${orderId}`
    );
  };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

        {/* BREADCRUMB */}

        <div className="flex items-center gap-[8px] text-[9px]">

          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
            className="font-medium text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Dashboard
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#8b97a8]">
            Orders
          </span>

        </div>

        {/* TITLE */}

        <div className="mt-[22px] flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
              Orders
            </h1>

            <p className="mt-[7px] text-[11px] text-[#8290a3]">
              Manage GETSUKA customer orders.
            </p>

          </div>

          <div className="rounded-full bg-[#f1f6ff] px-[13px] py-[7px] text-[9px] font-medium text-[#1557f5]">
            {pagination.totalOrders} orders
          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="px-[26px] py-[22px]">

        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#edf4ff] text-[15px] text-[#1557f5] transition-colors duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                #
              </div>

              <span className="text-[18px] text-[#d8e2f0]">
                +
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Total Orders
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {pagination.totalOrders}
            </p>

            <p className="mt-[4px] text-[8px] text-[#9aa6b6]">
              All customer orders
            </p>

          </div>

          {/* CURRENT PAGE */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#edf4ff] text-[15px] text-[#1557f5] transition-colors duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                #
              </div>

              <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#8b97a8]">
                Page
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Current Page
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {pagination.currentPage}
            </p>

            <p className="mt-[4px] text-[8px] text-[#9aa6b6]">
              Of {pagination.totalPages} pages
            </p>

          </div>

          {/* VISIBLE */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#edf4ff] text-[15px] text-[#1557f5] transition-colors duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                ◎
              </div>

              <span className="text-[18px] text-[#d8e2f0]">
                +
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Visible Orders
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {orders.length}
            </p>

            <p className="mt-[4px] text-[8px] text-[#9aa6b6]">
              Current page results
            </p>

          </div>

          {/* FILTER */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#edf4ff] text-[15px] text-[#1557f5] transition-colors duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                !
              </div>

              <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#8b97a8]">
                Filter
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Order Status
            </p>

            <p className="mt-[5px] truncate text-[16px] font-semibold text-[#1b273b]">
              {status
                ? formatStatus(status)
                : "All"}
            </p>

            <p className="mt-[4px] text-[8px] text-[#1557f5]">
              Current filter
            </p>

          </div>

        </div>

        {/* ===================================================
            SEARCH + FILTERS
        =================================================== */}

        <section className="mt-[14px] rounded-[12px] border border-[#e1e8f1] bg-white p-[15px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-[9px]"
          >

            <div className="flex flex-col gap-[9px] xl:flex-row">

              <div className="relative flex-1">

                <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[13px] text-[#9aa6b6]">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search orders by order number, customer or phone..."
                  className="h-[45px] w-full rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] pl-[36px] pr-[12px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
                />

              </div>

              <button
                type="submit"
                className="h-[45px] rounded-[8px] bg-[#1557f5] px-[23px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_5px_14px_rgba(21,87,245,0.14)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0d49d8] hover:shadow-[0_7px_18px_rgba(21,87,245,0.20)] active:translate-y-0"
              >
                Search
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="h-[45px] rounded-[8px] border border-[#dfe6ef] bg-white px-[20px] text-[8px] font-medium uppercase tracking-[0.08em] text-[#7a8799] transition-all duration-200 hover:border-[#b8c8dd] hover:bg-[#f5f8ff] hover:text-[#1557f5] active:bg-[#edf4ff]"
              >
                ↻ &nbsp; Clear
              </button>

            </div>

            {/* FILTERS */}

            <div className="grid grid-cols-1 gap-[9px] md:grid-cols-3">

              <select
                value={status}
                onChange={handleStatusChange}
                className="h-[42px] rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
              >

                <option value="">
                  All Order Statuses
                </option>

                <option value="placed">
                  Placed
                </option>

                <option value="confirmed">
                  Confirmed
                </option>

                <option value="shipped">
                  Shipped
                </option>

                <option value="out_for_delivery">
                  Out For Delivery
                </option>

                <option value="delivered">
                  Delivered
                </option>

                <option value="cancelled">
                  Cancelled
                </option>

                <option value="returned">
                  Returned
                </option>

              </select>

              <select
                value={paymentStatus}
                onChange={
                  handlePaymentStatusChange
                }
                className="h-[42px] rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
              >

                <option value="">
                  All Payment Statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="paid">
                  Paid
                </option>

                <option value="failed">
                  Failed
                </option>

                <option value="refunded">
                  Refunded
                </option>

              </select>

              <select
                value={sort}
                onChange={handleSortChange}
                className="h-[42px] rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
              >

                <option value="newest">
                  Newest First
                </option>

                <option value="oldest">
                  Oldest First
                </option>

                <option value="amount-high">
                  Highest Amount
                </option>

                <option value="amount-low">
                  Lowest Amount
                </option>

              </select>

            </div>

          </form>

        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mt-[12px] rounded-[8px] border border-[#ffd1d8] bg-[#fff5f6] px-[15px] py-[11px]">

            <p className="text-[9px] text-[#d93650]">
              ! &nbsp; {error}
            </p>

          </div>
        )}

        {/* ===================================================
            ORDER TABLE
        =================================================== */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-[10px] border-b border-[#edf1f6] px-[18px] py-[15px] sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[12px] font-semibold text-[#1c2940]">
                Order Directory
              </p>

              <p className="mt-[4px] text-[8px] uppercase tracking-[0.08em] text-[#8b97a8]">
                {pagination.totalOrders} total orders
              </p>

            </div>

            <div className="flex items-center gap-[7px]">

              <span className="h-[6px] w-[6px] rounded-full bg-[#12a66d]" />

              <span className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                Live Order Data
              </span>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px]">

              <thead>

                <tr className="border-b border-[#edf1f6] bg-[#f8faff]">

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Order
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Customer
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Items
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Total
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Payment
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Status
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Date
                  </th>

                  <th className="px-[18px] py-[13px] text-right text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="px-[18px] py-[65px] text-center"
                    >

                      <div className="flex flex-col items-center">

                        <div className="h-[25px] w-[25px] animate-spin rounded-full border-2 border-[#dce5f2] border-t-[#1557f5]" />

                        <p className="mt-[12px] text-[8px] uppercase tracking-[0.12em] text-[#8996a8]">
                          Loading Orders...
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : orders.length === 0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="px-[18px] py-[70px] text-center"
                    >

                      <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#f1f6ff] text-[19px] text-[#8da9dc]">
                        #
                      </div>

                      <p className="mt-[13px] text-[9px] font-medium uppercase tracking-[0.1em] text-[#69788b]">
                        No Orders Found
                      </p>

                      <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                        Try changing your search or filters.
                      </p>

                    </td>

                  </tr>

                ) : (

                  orders.map((order) => (

                    <tr
                      key={order?._id}
                      className="group border-b border-[#edf1f6] bg-white transition-all duration-200 hover:bg-[#eaf3ff] hover:shadow-[inset_3px_0_0_#1557f5]"
                    >

                      {/* ORDER */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247] transition-colors duration-200 group-hover:text-[#1557f5]">
                          {order?.orderNumber ||
                            "—"}
                        </p>

                        <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                          ID:{" "}
                          {order?._id
                            ? order._id.slice(-8)
                            : "—"}
                        </p>

                      </td>

                      {/* CUSTOMER */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247]">
                          {getCustomerName(order)}
                        </p>

                        <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                          {getCustomerPhone(order)}
                        </p>

                      </td>

                      {/* ITEMS */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#6f7d90]">
                          {getItemCount(order)}{" "}
                          {getItemCount(order) === 1
                            ? "item"
                            : "items"}
                        </p>

                      </td>

                      {/* TOTAL */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247]">
                          {formatPrice(
                            order?.totalAmount
                          )}
                        </p>

                      </td>

                      {/* PAYMENT */}

                      <td className="px-[18px] py-[15px]">

                        <span
                          className={`inline-flex items-center rounded-full border px-[8px] py-[5px] text-[6px] uppercase tracking-[0.08em] ${getPaymentStatusClasses(
                            order?.paymentStatus
                          )}`}
                        >
                          {formatStatus(
                            order?.paymentStatus
                          )}
                        </span>

                        <p className="mt-[4px] text-[7px] text-[#8996a8]">
                          {String(
                            order?.paymentMethod ||
                              "—"
                          ).toUpperCase()}
                        </p>

                      </td>

                      {/* STATUS */}

                      <td className="px-[18px] py-[15px]">

                        <span
                          className={`inline-flex items-center rounded-full border px-[8px] py-[5px] text-[6px] uppercase tracking-[0.08em] ${getStatusClasses(
                            order?.status
                          )}`}
                        >
                          {formatStatus(
                            order?.status
                          )}
                        </span>

                        {/* RETURN REQUEST INDICATOR */}

                        {order?.returnStatus &&
                          order.returnStatus !==
                            "none" && (
                            <p className="mt-[5px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#1557f5]">
                              Return:{" "}
                              {formatStatus(
                                order.returnStatus
                              )}
                            </p>
                          )}

                      </td>

                      {/* DATE */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#7c899b]">
                          {formatDate(
                            order?.createdAt
                          )}
                        </p>

                      </td>

                      {/* ACTION */}

                      <td className="px-[18px] py-[15px]">

                        <div className="flex justify-end">

                          <button
                            type="button"
                            onClick={() =>
                              handleViewOrder(
                                order?._id
                              )
                            }
                            className="h-[31px] rounded-[7px] border border-[#dce4ee] bg-white px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#718096] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] active:bg-[#eaf2ff]"
                          >
                            VIEW
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div className="flex flex-col gap-[12px] border-t border-[#edf1f6] px-[18px] py-[15px] sm:flex-row sm:items-center sm:justify-between">

            <p className="text-[8px] text-[#8996a8]">

              Showing{" "}

              <span className="font-medium text-[#4c5b70]">
                {orders.length}
              </span>{" "}

              orders of{" "}

              <span className="font-medium text-[#4c5b70]">
                {pagination.totalOrders}
              </span>

            </p>

            <div className="flex items-center gap-[5px]">

              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage(page - 1)
                }
                className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[11px] text-[#71808c] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹
              </button>

              <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] bg-[#1557f5] px-[9px] text-[8px] font-medium text-white shadow-[0_4px_12px_rgba(21,87,245,0.18)]">
                {pagination.currentPage}
              </div>

              <button
                type="button"
                disabled={
                  page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(page + 1)
                }
                className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[11px] text-[#71808c] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ›
              </button>

            </div>

          </div>

        </section>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="mt-[28px] flex items-center justify-between border-t border-[#e7edf5] px-[5px] py-[18px]">

          <div>

            <p className="text-[11px] font-semibold text-[#1557f5]">
              GETSUKA
            </p>

            <p className="mt-[3px] text-[7px] text-[#8c98a9]">
              Admin Panel
            </p>

          </div>

          <p className="text-[8px] text-[#8c98a9]">
            GETSUKA Administration
          </p>

        </footer>

      </main>

    </div>
  );
};

export default AdminOrderManagementPage;