import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  getAdminReturns,
  approveReturnRequest,
  rejectReturnRequest,
  markReturnCollectionPending,
  markReturnCollected,
  completeReturn,
} from "../../order-management/api/adminOrderApi";

const AdminReturnsPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [returns, setReturns] = useState([]);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [status, setStatus] = useState("");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalReturns: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // RETURN ACTION STATE
  // =========================================================

  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  // =========================================================
  // REJECT MODAL
  // =========================================================

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [selectedReturn, setSelectedReturn] =
    useState(null);

  const [rejectionReason, setRejectionReason] =
    useState("");

  // =========================================================
  // FETCH RETURNS
  // =========================================================

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAdminReturns({
        search: appliedSearch,
        status,
        sort,
        page,
        limit: 10,
      });

      setReturns(response?.returns || []);

      setPagination(
        response?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalReturns: 0,
        }
      );
    } catch (error) {
      console.error(
        "Fetch Admin Returns Error:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch return requests"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH WHEN FILTER / SORT / PAGE CHANGES
  // =========================================================

  useEffect(() => {
    fetchReturns();
  }, [
    page,
    appliedSearch,
    status,
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
    setSort("newest");
    setPage(1);
  };

  // =========================================================
  // STATUS FILTER
  // =========================================================

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  // =========================================================
  // SORT
  // =========================================================

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

  const formatDateTime = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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

  const getItemCount = (returnItem) => {
    if (!Array.isArray(returnItem?.items)) {
      return 0;
    }

    return returnItem.items.reduce(
      (total, item) =>
        total + Number(item?.quantity || 0),
      0
    );
  };

  const getCustomerName = (returnItem) => {
    return (
      returnItem?.customer?.name ||
      "Unknown Customer"
    );
  };

  const getCustomerPhone = (returnItem) => {
    return (
      returnItem?.customer?.phone ||
      "—"
    );
  };

  // =========================================================
  // RETURN STATUS COLORS
  // =========================================================

  const getReturnStatusClasses = (value) => {
    switch (value) {
      case "pending":
        return "border-[#f2c96d] bg-[#fff8e8] text-[#a36b00]";

      case "approved":
        return "border-[#b9d0ff] bg-[#eef4ff] text-[#1557f5]";

      case "rejected":
        return "border-[#ffd0d8] bg-[#fff3f5] text-[#d93650]";

      case "collection_pending":
        return "border-[#ffd2a8] bg-[#fff5eb] text-[#c56b19]";

      case "collected":
        return "border-[#d5c2ff] bg-[#f5f0ff] text-[#7141c7]";

      case "completed":
        return "border-[#bcebd5] bg-[#effcf6] text-[#11845b]";

      default:
        return "border-[#dce4ee] bg-[#f7f9fc] text-[#718096]";
    }
  };

  // =========================================================
  // OPEN ORDER DETAILS
  // =========================================================

  const handleViewOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    navigate(`/admin/orders/${orderId}`);
  };

  // =========================================================
  // APPROVE RETURN
  // =========================================================

  const handleApprove = async (returnItem) => {
    if (!returnItem?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await approveReturnRequest(
        returnItem._id
      );

      await fetchReturns();
    } catch (error) {
      console.error(
        "Approve Return Error:",
        error
      );

      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to approve return request"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // OPEN REJECT MODAL
  // =========================================================

  const handleOpenReject = (returnItem) => {
    setSelectedReturn(returnItem);
    setRejectionReason("");
    setActionError("");
    setShowRejectModal(true);
  };

  // =========================================================
  // CLOSE REJECT MODAL
  // =========================================================

  const handleCloseReject = () => {
    if (actionLoading) {
      return;
    }

    setShowRejectModal(false);
    setSelectedReturn(null);
    setRejectionReason("");
  };

  // =========================================================
  // REJECT RETURN
  // =========================================================

  const handleReject = async () => {
    if (!selectedReturn?._id) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      setActionError(
        "Please enter a rejection reason."
      );

      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await rejectReturnRequest(
        selectedReturn._id,
        reason
      );

      setShowRejectModal(false);
      setSelectedReturn(null);
      setRejectionReason("");

      await fetchReturns();
    } catch (error) {
      console.error(
        "Reject Return Error:",
        error
      );

      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reject return request"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // MARK COLLECTION PENDING
  // =========================================================

  const handleCollectionPending = async (
    returnItem
  ) => {
    if (!returnItem?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await markReturnCollectionPending(
        returnItem._id
      );

      await fetchReturns();
    } catch (error) {
      console.error(
        "Mark Collection Pending Error:",
        error
      );

      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update collection status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // MARK COLLECTED
  // =========================================================

  const handleCollected = async (
    returnItem
  ) => {
    if (!returnItem?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await markReturnCollected(
        returnItem._id
      );

      await fetchReturns();
    } catch (error) {
      console.error(
        "Mark Return Collected Error:",
        error
      );

      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to mark return as collected"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // COMPLETE RETURN
  // =========================================================

  const handleComplete = async (
    returnItem
  ) => {
    if (!returnItem?._id) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await completeReturn(
        returnItem._id
      );

      await fetchReturns();
    } catch (error) {
      console.error(
        "Complete Return Error:",
        error
      );

      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to complete return"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================
  // RETURN ACTIONS
  // =========================================================

  const renderActions = (returnItem) => {
    const returnStatus =
      returnItem?.returnStatus;

    if (returnStatus === "pending") {
      return (
        <div className="flex flex-wrap justify-end gap-[5px]">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              handleApprove(returnItem)
            }
            className="h-[30px] rounded-[7px] bg-[#1557f5] px-[10px] text-[6px] font-semibold uppercase tracking-[0.07em] text-white transition-all duration-200 hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() =>
              handleOpenReject(returnItem)
            }
            className="h-[30px] rounded-[7px] border border-[#ffd0d8] bg-white px-[10px] text-[6px] font-semibold uppercase tracking-[0.07em] text-[#d93650] transition-all duration-200 hover:bg-[#fff3f5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      );
    }

    if (returnStatus === "approved") {
      return (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() =>
            handleCollectionPending(returnItem)
          }
          className="h-[30px] rounded-[7px] bg-[#1557f5] px-[11px] text-[6px] font-semibold uppercase tracking-[0.07em] text-white transition-all duration-200 hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Collection Pending
        </button>
      );
    }

    if (returnStatus === "collection_pending") {
      return (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() =>
            handleCollected(returnItem)
          }
          className="h-[30px] rounded-[7px] bg-[#7141c7] px-[11px] text-[6px] font-semibold uppercase tracking-[0.07em] text-white transition-all duration-200 hover:bg-[#6033b0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark Collected
        </button>
      );
    }

    if (returnStatus === "collected") {
      return (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() =>
            handleComplete(returnItem)
          }
          className="h-[30px] rounded-[7px] bg-[#11845b] px-[11px] text-[6px] font-semibold uppercase tracking-[0.07em] text-white transition-all duration-200 hover:bg-[#0d704d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Complete
        </button>
      );
    }

    return (
      <span className="text-[6px] uppercase tracking-[0.08em] text-[#9aa6b6]">
        No Action
      </span>
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
            Returns
          </span>

        </div>

        {/* TITLE */}

        <div className="mt-[22px] flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
              Returns
            </h1>

            <p className="mt-[7px] text-[11px] text-[#8290a3]">
              Manage GETSUKA customer return requests.
            </p>

          </div>

          <div className="rounded-full bg-[#f1f6ff] px-[13px] py-[7px] text-[9px] font-medium text-[#1557f5]">
            {pagination.totalReturns} returns
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
                ↩
              </div>

              <span className="text-[18px] text-[#d8e2f0]">
                +
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Total Returns
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {pagination.totalReturns}
            </p>

            <p className="mt-[4px] text-[8px] text-[#9aa6b6]">
              All return requests
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
              Visible Returns
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {returns.length}
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
              Return Status
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
                  placeholder="Search returns by order number, customer, phone or reason..."
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

            <div className="grid grid-cols-1 gap-[9px] md:grid-cols-2">

              <select
                value={status}
                onChange={handleStatusChange}
                className="h-[42px] rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] text-[9px] text-[#69788b] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white"
              >

                <option value="">
                  All Return Statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="collection_pending">
                  Collection Pending
                </option>

                <option value="collected">
                  Collected
                </option>

                <option value="completed">
                  Completed
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

              </select>

            </div>

          </form>

        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {(error || actionError) && (
          <div className="mt-[12px] rounded-[8px] border border-[#ffd1d8] bg-[#fff5f6] px-[15px] py-[11px]">

            <p className="text-[9px] text-[#d93650]">
              ! &nbsp;
              {actionError || error}
            </p>

          </div>
        )}

        {/* ===================================================
            RETURN TABLE
        =================================================== */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-[10px] border-b border-[#edf1f6] px-[18px] py-[15px] sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[12px] font-semibold text-[#1c2940]">
                Return Directory
              </p>

              <p className="mt-[4px] text-[8px] uppercase tracking-[0.08em] text-[#8b97a8]">
                {pagination.totalReturns} total returns
              </p>

            </div>

            <div className="flex items-center gap-[7px]">

              <span className="h-[6px] w-[6px] rounded-full bg-[#12a66d]" />

              <span className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                Live Return Data
              </span>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1450px]">

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
                    Amount
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Return Reason
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Status
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Requested
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
                          Loading Returns...
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : returns.length === 0 ? (

                  <tr>

                    <td
                      colSpan="8"
                      className="px-[18px] py-[70px] text-center"
                    >

                      <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#f1f6ff] text-[19px] text-[#8da9dc]">
                        ↩
                      </div>

                      <p className="mt-[13px] text-[9px] font-medium uppercase tracking-[0.1em] text-[#69788b]">
                        No Returns Found
                      </p>

                      <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                        Try changing your search or filters.
                      </p>

                    </td>

                  </tr>

                ) : (

                  returns.map((returnItem) => (

                    <tr
                      key={returnItem?._id}
                      className="group border-b border-[#edf1f6] bg-white transition-all duration-200 hover:bg-[#eaf3ff] hover:shadow-[inset_3px_0_0_#1557f5]"
                    >

                      {/* ORDER */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247] transition-colors duration-200 group-hover:text-[#1557f5]">
                          {returnItem?.orderNumber ||
                            "—"}
                        </p>

                        <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                          ID:{" "}
                          {returnItem?._id
                            ? returnItem._id.slice(-8)
                            : "—"}
                        </p>

                      </td>

                      {/* CUSTOMER */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247]">
                          {getCustomerName(
                            returnItem
                          )}
                        </p>

                        <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                          {getCustomerPhone(
                            returnItem
                          )}
                        </p>

                      </td>

                      {/* ITEMS */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#6f7d90]">
                          {getItemCount(
                            returnItem
                          )}{" "}
                          {getItemCount(
                            returnItem
                          ) === 1
                            ? "item"
                            : "items"}
                        </p>

                      </td>

                      {/* AMOUNT */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[9px] font-semibold text-[#263247]">
                          {formatPrice(
                            returnItem?.totalAmount
                          )}
                        </p>

                        <p className="mt-[4px] text-[7px] text-[#8996a8]">
                          {String(
                            returnItem?.paymentMethod ||
                              "—"
                          ).toUpperCase()}
                        </p>

                      </td>

                      {/* RETURN REASON */}

                      <td className="max-w-[220px] px-[18px] py-[15px]">

                        <p
                          title={
                            returnItem?.returnReason ||
                            ""
                          }
                          className="max-w-[210px] truncate text-[8px] text-[#6f7d90]"
                        >
                          {returnItem?.returnReason ||
                            "No reason provided"}
                        </p>

                      </td>

                      {/* STATUS */}

                      <td className="px-[18px] py-[15px]">

                        <span
                          className={`inline-flex items-center rounded-full border px-[8px] py-[5px] text-[6px] uppercase tracking-[0.08em] ${getReturnStatusClasses(
                            returnItem?.returnStatus
                          )}`}
                        >
                          {formatStatus(
                            returnItem?.returnStatus
                          )}
                        </span>

                        {returnItem?.returnStatus ===
                          "rejected" &&
                          returnItem?.returnRejectionReason && (
                            <p
                              title={
                                returnItem.returnRejectionReason
                              }
                              className="mt-[5px] max-w-[160px] truncate text-[6px] text-[#d93650]"
                            >
                              {returnItem.returnRejectionReason}
                            </p>
                          )}

                      </td>

                      {/* REQUESTED */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#7c899b]">
                          {formatDate(
                            returnItem?.returnRequestedAt
                          )}
                        </p>

                        <p className="mt-[4px] text-[6px] text-[#9aa6b6]">
                          {formatDateTime(
                            returnItem?.returnRequestedAt
                          )}
                        </p>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-[18px] py-[15px]">

                        <div className="flex flex-col items-end gap-[6px]">

                          <button
                            type="button"
                            onClick={() =>
                              handleViewOrder(
                                returnItem?._id
                              )
                            }
                            className="h-[30px] rounded-[7px] border border-[#dce4ee] bg-white px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#718096] transition-all duration-200 hover:border-[#9eb9eb] hover:bg-[#f3f7ff] hover:text-[#1557f5] active:bg-[#eaf2ff]"
                          >
                            VIEW ORDER
                          </button>

                          {renderActions(
                            returnItem
                          )}

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
                {returns.length}
              </span>{" "}

              returns of{" "}

              <span className="font-medium text-[#4c5b70]">
                {pagination.totalReturns}
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

      {/* =====================================================
          REJECT MODAL
      ===================================================== */}

      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172033]/30 px-[20px] backdrop-blur-[2px]">

          <div className="w-full max-w-[430px] rounded-[12px] border border-[#e1e8f1] bg-white p-[20px] shadow-[0_20px_60px_rgba(30,64,175,0.18)]">

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-[15px] font-semibold text-[#1c2940]">
                  Reject Return Request
                </h2>

                <p className="mt-[5px] text-[9px] text-[#8996a8]">
                  Order{" "}
                  {selectedReturn?.orderNumber ||
                    "—"}
                </p>

              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCloseReject}
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[14px] text-[#8996a8] transition-colors hover:bg-[#f3f6fa] hover:text-[#263247]"
              >
                ×
              </button>

            </div>

            <div className="mt-[18px]">

              <label className="text-[8px] font-medium uppercase tracking-[0.1em] text-[#718096]">
                Rejection Reason
              </label>

              <textarea
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value
                  )
                }
                placeholder="Enter the reason for rejecting this return..."
                rows={4}
                className="mt-[8px] w-full resize-none rounded-[8px] border border-[#dfe6ef] bg-[#f9fbfe] px-[12px] py-[10px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {actionError && (
              <div className="mt-[10px] rounded-[7px] border border-[#ffd1d8] bg-[#fff5f6] px-[10px] py-[8px]">

                <p className="text-[8px] text-[#d93650]">
                  {actionError}
                </p>

              </div>
            )}

            <div className="mt-[16px] flex justify-end gap-[7px]">

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCloseReject}
                className="h-[36px] rounded-[7px] border border-[#dfe6ef] bg-white px-[15px] text-[7px] font-medium uppercase tracking-[0.08em] text-[#718096] transition-all duration-200 hover:bg-[#f5f8ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="h-[36px] rounded-[7px] bg-[#d93650] px-[15px] text-[7px] font-semibold uppercase tracking-[0.08em] text-white transition-all duration-200 hover:bg-[#c52d46] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLoading
                  ? "Rejecting..."
                  : "Reject Return"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AdminReturnsPage;