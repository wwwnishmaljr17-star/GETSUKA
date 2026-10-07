import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCoupons,
  deleteCoupon,
  toggleCouponStatus,
} from "../api/couponApi";

const CouponManagementPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [coupons, setCoupons] = useState([]);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("all");

  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCoupons: 0,
  });

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [actionLoading, setActionLoading] = useState(null);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    coupon: null,
  });

  const limit = 8;

  // =========================================================
  // FETCH COUPONS
  // =========================================================

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCoupons({
        search,
        page,
        limit,
        status,
      });

      const data = response || {};

      const couponList =
        data.coupons ||
        data.data?.coupons ||
        data.data ||
        [];

      setCoupons(
        Array.isArray(couponList)
          ? couponList
          : []
      );

      setPagination(
        data.pagination ||
          data.data?.pagination || {
            currentPage: page,
            totalPages: 1,
            totalCoupons: couponList.length,
          }
      );
    } catch (error) {
      console.error(
        "Fetch Coupons Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load coupons"
      );

      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL / SEARCH / STATUS / PAGE
  // =========================================================

  useEffect(() => {
    fetchCoupons();
  }, [page, status]);

  // =========================================================
  // SEARCH
  // =========================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCoupons();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // =========================================================
  // SORT
  // =========================================================

  const sortedCoupons = useMemo(() => {
    const copiedCoupons = [...coupons];

    copiedCoupons.sort((a, b) => {
      const dateA = new Date(
        a.createdAt || a.updatedAt || 0
      ).getTime();

      const dateB = new Date(
        b.createdAt || b.updatedAt || 0
      ).getTime();

      if (sort === "oldest") {
        return dateA - dateB;
      }

      if (sort === "discount-high") {
        return (
          Number(
            b.discountValue ||
              b.discount ||
              0
          ) -
          Number(
            a.discountValue ||
              a.discount ||
              0
          )
        );
      }

      return dateB - dateA;
    });

    return copiedCoupons;
  }, [coupons, sort]);

  // =========================================================
  // DELETE COUPON
  // =========================================================

  const handleDelete = async () => {
    const coupon = deleteModal.coupon;

    if (!coupon?._id) {
      return;
    }

    try {
      setActionLoading(coupon._id);
      setError("");
      setSuccess("");

      const response = await deleteCoupon(
        coupon._id
      );

      setSuccess(
        response?.message ||
          "Coupon deleted successfully"
      );

      setDeleteModal({
        open: false,
        coupon: null,
      });

      await fetchCoupons();
    } catch (error) {
      console.error(
        "Delete Coupon Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to delete coupon"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // TOGGLE COUPON
  // =========================================================

  const handleToggleStatus = async (coupon) => {
    if (!coupon?._id) {
      return;
    }

    try {
      setActionLoading(coupon._id);
      setError("");
      setSuccess("");

      const response =
        await toggleCouponStatus(
          coupon._id
        );

      setSuccess(
        response?.message ||
          "Coupon status updated successfully"
      );

      await fetchCoupons();
    } catch (error) {
      console.error(
        "Toggle Coupon Error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to update coupon status"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const getCouponCode = (coupon) => {
    return (
      coupon.code ||
      coupon.couponCode ||
      "—"
    );
  };

  const getDiscountText = (coupon) => {
    const type =
      coupon.discountType ||
      coupon.type ||
      "percentage";

    const value =
      coupon.discountValue ??
      coupon.discount ??
      0;

    if (
      String(type).toLowerCase() ===
      "fixed"
    ) {
      return `₹${Number(value).toLocaleString(
        "en-IN"
      )}`;
    }

    return `${value}%`;
  };

  const getDiscountType = (coupon) => {
    const type =
      coupon.discountType ||
      coupon.type ||
      "percentage";

    if (
      String(type).toLowerCase() ===
      "fixed"
    ) {
      return "Fixed Amount";
    }

    return "Percentage";
  };

  const getMinimumOrder = (coupon) => {
    const value =
      coupon.minOrderAmount ??
      coupon.minimumOrderValue ??
      coupon.minOrderValue ??
      coupon.minimumAmount ??
      coupon.minOrder ??
      0;

    return `₹${Number(value).toLocaleString(
      "en-IN"
    )}`;
  };

  const getUsageCount = (coupon) => {
    return (
      coupon.usedCount ??
      coupon.usageCount ??
      coupon.used ??
      0
    );
  };

  const getUsageLimit = (coupon) => {
    return (
      coupon.usageLimit ??
      coupon.maxUsage ??
      coupon.usageLimitTotal ??
      0
    );
  };

  const getExpiryDate = (coupon) => {
    const date =
      coupon.validUntil ||
      coupon.expiryDate ||
      coupon.endDate ||
      coupon.expiresAt;

    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const isExpired = (coupon) => {
    const date =
      coupon.validUntil ||
      coupon.expiryDate ||
      coupon.endDate ||
      coupon.expiresAt;

    if (!date) {
      return false;
    }

    return (
      new Date(date).getTime() <
      Date.now()
    );
  };

  const isActive = (coupon) => {
    if (isExpired(coupon)) {
      return false;
    }

    if (
      coupon.isActive === false ||
      coupon.status === "inactive"
    ) {
      return false;
    }

    return true;
  };

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalCoupons =
    pagination.totalCoupons ??
    coupons.length;

  const activeCoupons = coupons.filter(
    (coupon) => isActive(coupon)
  ).length;

  const expiredCoupons = coupons.filter(
    (coupon) => isExpired(coupon)
  ).length;

  const totalRedemptions = coupons.reduce(
    (total, coupon) =>
      total + Number(getUsageCount(coupon)),
    0
  );

  // =========================================================
  // PAGINATION
  // =========================================================

  const currentPage =
    pagination.currentPage || page;

  const totalPages =
    pagination.totalPages || 1;

  const handlePrevious = () => {
    if (currentPage > 1) {
      setPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setPage(currentPage + 1);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-full bg-[#edf3ff] px-[12px] pb-[24px] pt-[12px] text-[#273247]">

      <div className="min-h-[calc(100vh-36px)] rounded-[24px] bg-white shadow-[0_15px_45px_rgba(30,64,175,0.08)]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="px-[28px] pb-[22px] pt-[28px]">

          <div className="flex items-start justify-between gap-[20px]">

            <div>

              <div className="flex items-center gap-[7px] text-[9px]">

                <span className="font-medium text-[#1557f5]">
                  Dashboard
                </span>

                <span className="text-[#b5bfce]">
                  /
                </span>

                <span className="text-[#8491a5]">
                  Coupons
                </span>

              </div>

              <h1 className="mt-[18px] text-[28px] font-semibold tracking-[-0.04em] text-[#1d293d]">
                Coupons
              </h1>

              <p className="mt-[7px] text-[11px] text-[#8995a8]">
                Create and manage discount
                coupons for the GETSUKA store.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/coupons/new")
              }
              className="mt-[18px] flex h-[40px] items-center gap-[8px] rounded-[10px] bg-[#1557f5] px-[18px] text-[11px] font-semibold text-white shadow-[0_7px_18px_rgba(21,87,245,0.22)] transition hover:bg-[#0d49d8]"
            >
              <span className="text-[15px]">
                +
              </span>

              CREATE COUPON
            </button>

          </div>

        </section>

        {/* ===================================================
            ALERTS
        =================================================== */}

        <div className="px-[28px]">

          {success && (
            <div className="mb-[14px] rounded-[10px] border border-[#b7efd1] bg-[#effcf5] px-[14px] py-[11px] text-[10px] font-medium text-[#087f4f]">
              ✓ &nbsp; {success}
            </div>
          )}

          {error && (
            <div className="mb-[14px] rounded-[10px] border border-[#ffd0d0] bg-[#fff5f5] px-[14px] py-[11px] text-[10px] font-medium text-[#d62f2f]">
              ! &nbsp; {error}
            </div>
          )}

        </div>

        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <section className="grid grid-cols-1 gap-[14px] px-[28px] sm:grid-cols-2 xl:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-[#f8faff] px-[18px] py-[17px]">

            <div className="flex items-center justify-between">

              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8c98aa]">
                Total Coupons
              </span>

              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-[#e9f0ff] text-[12px] text-[#1557f5]">
                ◇
              </span>

            </div>

            <p className="mt-[10px] text-[24px] font-semibold tracking-[-0.04em] text-[#1d293d]">
              {totalCoupons}
            </p>

          </div>

          {/* ACTIVE */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-[#f8faff] px-[18px] py-[17px]">

            <div className="flex items-center justify-between">

              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8c98aa]">
                Active
              </span>

              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-[#eafaf2] text-[12px] text-[#0b9b5a]">
                ✓
              </span>

            </div>

            <p className="mt-[10px] text-[24px] font-semibold tracking-[-0.04em] text-[#1d293d]">
              {activeCoupons}
            </p>

          </div>

          {/* EXPIRED */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-[#f8faff] px-[18px] py-[17px]">

            <div className="flex items-center justify-between">

              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8c98aa]">
                Expired
              </span>

              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-[#fff0f0] text-[12px] text-[#e54848]">
                !
              </span>

            </div>

            <p className="mt-[10px] text-[24px] font-semibold tracking-[-0.04em] text-[#1d293d]">
              {expiredCoupons}
            </p>

          </div>

          {/* REDEMPTIONS */}

          <div className="rounded-[14px] border border-[#e6ebf3] bg-[#f8faff] px-[18px] py-[17px]">

            <div className="flex items-center justify-between">

              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8c98aa]">
                Total Redemptions
              </span>

              <span className="flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-[#e9f0ff] text-[12px] text-[#1557f5]">
                ↗
              </span>

            </div>

            <p className="mt-[10px] text-[24px] font-semibold tracking-[-0.04em] text-[#1d293d]">
              {totalRedemptions}
            </p>

          </div>

        </section>

        {/* ===================================================
            FILTER / SEARCH BAR
        =================================================== */}

        <section className="px-[28px] pt-[22px]">

          <div className="rounded-[14px] border border-[#e4e9f1] bg-[#fbfcff] p-[10px]">

            <div className="grid grid-cols-1 gap-[9px] lg:grid-cols-[minmax(220px,1fr)_170px_190px]">

              {/* SEARCH */}

              <div className="relative">

                <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[13px] text-[#98a4b5]">
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
                  placeholder="Search coupons..."
                  className="h-[39px] w-full rounded-[9px] border border-[#e0e6ef] bg-white pl-[34px] pr-[12px] text-[11px] text-[#273247] outline-none transition placeholder:text-[#a4afbf] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                />

              </div>

              {/* STATUS */}

              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="h-[39px] rounded-[9px] border border-[#e0e6ef] bg-white px-[11px] text-[10px] text-[#536176] outline-none focus:border-[#9bb9ff]"
              >
                <option value="all">
                  STATUS (ALL)
                </option>

                <option value="active">
                  ACTIVE
                </option>

                <option value="inactive">
                  INACTIVE
                </option>

                <option value="expired">
                  EXPIRED
                </option>
              </select>

              {/* SORT */}

              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value)
                }
                className="h-[39px] rounded-[9px] border border-[#e0e6ef] bg-white px-[11px] text-[10px] text-[#536176] outline-none focus:border-[#9bb9ff]"
              >
                <option value="newest">
                  SORT BY (NEWEST)
                </option>

                <option value="oldest">
                  SORT BY (OLDEST)
                </option>

                <option value="discount-high">
                  DISCOUNT (HIGH → LOW)
                </option>
              </select>

            </div>

          </div>

        </section>

        {/* ===================================================
            TABLE
        =================================================== */}

        <section className="px-[28px] pb-[28px] pt-[16px]">

          <div className="overflow-hidden rounded-[14px] border border-[#e4e9f1]">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] border-collapse">

                <thead>

                  <tr className="border-b border-[#e4e9f1] bg-[#f8faff]">

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Coupon Code
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Discount
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Type
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Minimum Order
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Usage
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Valid Until
                    </th>

                    <th className="px-[14px] py-[12px] text-left text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Status
                    </th>

                    <th className="px-[14px] py-[12px] text-right text-[8px] font-semibold uppercase tracking-[0.08em] text-[#7d899b]">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {loading ? (
                    <tr>

                      <td
                        colSpan="8"
                        className="px-[20px] py-[55px] text-center"
                      >

                        <div className="mx-auto h-[25px] w-[25px] animate-spin rounded-full border-[3px] border-[#dbe6ff] border-t-[#1557f5]" />

                        <p className="mt-[10px] text-[10px] text-[#8b97a9]">
                          Loading coupons...
                        </p>

                      </td>

                    </tr>
                  ) : sortedCoupons.length === 0 ? (
                    <tr>

                      <td
                        colSpan="8"
                        className="px-[20px] py-[60px] text-center"
                      >

                        <div className="mx-auto flex h-[45px] w-[45px] items-center justify-center rounded-full bg-[#eef3ff] text-[18px] text-[#1557f5]">
                          ◇
                        </div>

                        <p className="mt-[12px] text-[12px] font-semibold text-[#344156]">
                          No coupons found
                        </p>

                        <p className="mt-[5px] text-[10px] text-[#9aa5b5]">
                          Try changing your search
                          or filter.
                        </p>

                      </td>

                    </tr>
                  ) : (
                    sortedCoupons.map(
                      (coupon) => {
                        const expired =
                          isExpired(coupon);

                        const active =
                          isActive(coupon);

                        const used =
                          getUsageCount(
                            coupon
                          );

                        const usageLimit =
                          getUsageLimit(
                            coupon
                          );

                        return (
                          <tr
                            key={coupon._id}
                            className="border-b border-[#edf0f5] bg-white transition hover:bg-[#f8faff]"
                          >

                            {/* CODE */}

                            <td className="px-[14px] py-[15px]">

                              <div className="flex items-center gap-[9px]">

                                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#eef3ff] text-[11px] font-semibold text-[#1557f5]">
                                  %
                                </div>

                                <div>

                                  <p className="text-[10px] font-semibold tracking-[0.04em] text-[#273247]">
                                    {getCouponCode(
                                      coupon
                                    )}
                                  </p>

                                  {coupon.description && (
                                    <p className="mt-[2px] max-w-[150px] truncate text-[8px] text-[#9aa5b5]">
                                      {
                                        coupon.description
                                      }
                                    </p>
                                  )}

                                </div>

                              </div>

                            </td>

                            {/* DISCOUNT */}

                            <td className="px-[14px] py-[15px]">

                              <span className="text-[10px] font-semibold text-[#273247]">
                                {getDiscountText(
                                  coupon
                                )}
                              </span>

                            </td>

                            {/* TYPE */}

                            <td className="px-[14px] py-[15px]">

                              <span className="rounded-[6px] bg-[#f1f4f9] px-[8px] py-[5px] text-[8px] font-medium text-[#667388]">
                                {getDiscountType(
                                  coupon
                                )}
                              </span>

                            </td>

                            {/* MINIMUM */}

                            <td className="px-[14px] py-[15px]">

                              <span className="text-[10px] text-[#566276]">
                                {getMinimumOrder(
                                  coupon
                                )}
                              </span>

                            </td>

                            {/* USAGE */}

                            <td className="px-[14px] py-[15px]">

                              <div>

                                <p className="text-[10px] text-[#566276]">

                                  {used}

                                  {usageLimit
                                    ? ` / ${usageLimit}`
                                    : ""}

                                </p>

                                {usageLimit > 0 && (
                                  <div className="mt-[5px] h-[4px] w-[65px] overflow-hidden rounded-full bg-[#e8edf5]">

                                    <div
                                      className="h-full rounded-full bg-[#1557f5]"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          (Number(
                                            used
                                          ) /
                                            Number(
                                              usageLimit
                                            )) *
                                            100
                                        )}%`,
                                      }}
                                    />

                                  </div>
                                )}

                              </div>

                            </td>

                            {/* VALID UNTIL */}

                            <td className="px-[14px] py-[15px]">

                              <span
                                className={`text-[10px] ${
                                  expired
                                    ? "font-semibold text-[#e54848]"
                                    : "text-[#566276]"
                                }`}
                              >
                                {getExpiryDate(
                                  coupon
                                )}
                              </span>

                            </td>

                            {/* STATUS */}

                            <td className="px-[14px] py-[15px]">

                              {expired ? (
                                <span className="rounded-full bg-[#fff0f0] px-[9px] py-[5px] text-[8px] font-semibold text-[#e54848]">
                                  EXPIRED
                                </span>
                              ) : active ? (
                                <span className="rounded-full bg-[#eafaf2] px-[9px] py-[5px] text-[8px] font-semibold text-[#079457]">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#f0f2f5] px-[9px] py-[5px] text-[8px] font-semibold text-[#758094]">
                                  INACTIVE
                                </span>
                              )}

                            </td>

                            {/* ACTION */}

                            <td className="px-[14px] py-[15px]">

                              <div className="flex items-center justify-end gap-[7px]">

                                {/* EDIT */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/admin/coupons/${coupon._id}/edit`
                                    )
                                  }
                                  disabled={
                                    actionLoading ===
                                    coupon._id
                                  }
                                  className="rounded-[7px] border border-[#d8e2ff] bg-[#f5f8ff] px-[9px] py-[6px] text-[8px] font-semibold text-[#1557f5] transition hover:border-[#b9caff] hover:bg-[#eaf0ff] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  EDIT
                                </button>

                                {/* ENABLE / DISABLE */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleStatus(
                                      coupon
                                    )
                                  }
                                  disabled={
                                    actionLoading ===
                                      coupon._id ||
                                    expired
                                  }
                                  className="rounded-[7px] border border-[#dfe5ee] bg-white px-[9px] py-[6px] text-[8px] font-semibold text-[#536176] transition hover:border-[#b9caff] hover:bg-[#f4f7ff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {active
                                    ? "DISABLE"
                                    : "ENABLE"}
                                </button>

                                {/* DELETE */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteModal({
                                      open: true,
                                      coupon,
                                    })
                                  }
                                  disabled={
                                    actionLoading ===
                                    coupon._id
                                  }
                                  className="rounded-[7px] border border-[#ffd6d6] bg-white px-[9px] py-[6px] text-[8px] font-semibold text-[#df4646] transition hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  DELETE
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            <div className="flex flex-col items-center justify-between gap-[10px] border-t border-[#e4e9f1] bg-[#fbfcff] px-[16px] py-[12px] sm:flex-row">

              <p className="text-[8px] uppercase tracking-[0.08em] text-[#8d98aa]">

                Showing page{" "}

                <span className="font-semibold text-[#536176]">
                  {currentPage}
                </span>{" "}

                of{" "}

                <span className="font-semibold text-[#536176]">
                  {totalPages}
                </span>

              </p>

              <div className="flex items-center gap-[6px]">

                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={
                    currentPage <= 1 ||
                    loading
                  }
                  className="h-[30px] rounded-[7px] border border-[#dfe5ee] bg-white px-[11px] text-[9px] font-medium text-[#536176] transition hover:border-[#b9caff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← PREVIOUS
                </button>

                <div className="flex h-[30px] min-w-[30px] items-center justify-center rounded-[7px] bg-[#1557f5] px-[8px] text-[9px] font-semibold text-white">
                  {currentPage}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    currentPage >=
                      totalPages ||
                    loading
                  }
                  className="h-[30px] rounded-[7px] border border-[#dfe5ee] bg-white px-[11px] text-[9px] font-medium text-[#536176] transition hover:border-[#b9caff] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  NEXT →
                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}

      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#172033]/35 px-[20px] backdrop-blur-[3px]">

          <div className="w-full max-w-[390px] rounded-[18px] bg-white p-[24px] shadow-[0_25px_70px_rgba(30,64,175,0.20)]">

            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#fff0f0] text-[17px] text-[#e54848]">
              !
            </div>

            <h2 className="mt-[15px] text-[17px] font-semibold text-[#273247]">
              Delete coupon?
            </h2>

            <p className="mt-[7px] text-[10px] leading-[1.6] text-[#8b97a9]">

              Are you sure you want to delete{" "}

              <span className="font-semibold text-[#536176]">
                {getCouponCode(
                  deleteModal.coupon || {}
                )}
              </span>

              ? This action cannot be undone.

            </p>

            <div className="mt-[20px] flex justify-end gap-[8px]">

              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    coupon: null,
                  })
                }
                className="h-[36px] rounded-[8px] border border-[#dfe5ee] bg-white px-[15px] text-[10px] font-medium text-[#536176] hover:bg-[#f7f9fc]"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={
                  actionLoading ===
                  deleteModal.coupon?._id
                }
                className="h-[36px] rounded-[8px] bg-[#e54848] px-[15px] text-[10px] font-semibold text-white hover:bg-[#d73535] disabled:opacity-50"
              >
                {actionLoading ===
                deleteModal.coupon?._id
                  ? "DELETING..."
                  : "DELETE COUPON"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CouponManagementPage;