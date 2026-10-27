import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  deleteUser,
} from "../api/adminUserApi";

const CustomerManagementPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });

  const [loading, setLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);

  const [viewLoading, setViewLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    action: "",
    user: null,
  });

  const activeRequestRef = useRef(0);

  // =========================================================
  // FETCH USERS
  // =========================================================

  const fetchUsers = useCallback(
    async (searchQuery = appliedSearch, pageNum = page) => {
      const requestId = ++activeRequestRef.current;
      try {
        setLoading(true);
        setError("");

        const response = await getUsers({
          search: searchQuery,
          page: pageNum,
          limit: 10,
        });

        // Stale response guard to prevent race conditions
        if (requestId !== activeRequestRef.current) {
          return;
        }

        setUsers(response.users || []);

        setPagination(
          response.pagination || {
            currentPage: pageNum,
            totalPages: 1,
            totalUsers: 0,
          }
        );
      } catch (err) {
        if (requestId !== activeRequestRef.current) {
          return;
        }
        setError(err.message || "Failed to fetch customers");
      } finally {
        if (requestId === activeRequestRef.current) {
          setLoading(false);
        }
      }
    },
    [appliedSearch, page]
  );

  // =========================================================
  // INITIAL FETCH / SEARCH / PAGE CHANGE
  // =========================================================

  useEffect(() => {
    fetchUsers(appliedSearch, page);

    return () => {
      // Invalidate in-flight requests on dependency change or unmount
      activeRequestRef.current++;
    };
  }, [appliedSearch, page, fetchUsers]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();

    if (appliedSearch === query && page === 1) {
      fetchUsers(query, 1);
    } else {
      setAppliedSearch(query);
      setPage(1);
    }
  };

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const handleClear = () => {
    setSearch("");

    if (appliedSearch === "" && page === 1) {
      fetchUsers("", 1);
    } else {
      setAppliedSearch("");
      setPage(1);
    }
  };

  // =========================================================
  // VIEW CUSTOMER
  // =========================================================

  const handleViewUser = async (userId) => {
    try {
      setViewLoading(true);
      setError("");

      const response = await getUserById(userId);

      setSelectedUser(response.user);
    } catch (error) {
      setError(error.message || "Failed to fetch customer");
    } finally {
      setViewLoading(false);
    }
  };

  // =========================================================
  // =========================================================
  // BLOCK / UNBLOCK & DELETE (MODAL CONFIRMATION FLOW)
  // =========================================================

  const handleOpenConfirmModal = (action, user) => {
    setConfirmModal({
      open: true,
      action,
      user,
    });
  };

  const handleExecuteConfirmAction = async () => {
    const { action, user } = confirmModal;
    if (!user?._id || actionLoading) return;

    try {
      setActionLoading(user._id);
      setError("");
      setSuccessMessage("");

      if (action === "block") {
        await blockUser(user._id);
        setSuccessMessage("Customer blocked successfully");
      } else if (action === "unblock") {
        await unblockUser(user._id);
        setSuccessMessage("Customer unblocked successfully");
      } else if (action === "delete") {
        await deleteUser(user._id);
        setSuccessMessage("Customer account deactivated successfully while preserving order history");
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser(null);
        }
      }

      setConfirmModal({
        open: false,
        action: "",
        user: null,
      });

      await fetchUsers();

      if (selectedUser && selectedUser._id === user._id && action !== "delete") {
        setSelectedUser({
          ...selectedUser,
          isBlocked: action === "block",
        });
      }
    } catch (error) {
      setError(error.message || `Failed to ${action} customer`);
    } finally {
      setActionLoading(null);
    }
  };

  // =========================================================
  // STATS
  // =========================================================

  const activeCustomers = users.filter(
    (user) => !user.isBlocked && !user.isDeleted
  ).length;

  const blockedCustomers = users.filter(
    (user) => user.isBlocked && !user.isDeleted
  ).length;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="border-b border-[#edf1f6] px-[26px] pb-[24px] pt-[25px]">

        {/* BREADCRUMB */}

        <div className="flex items-center gap-[8px] text-[9px]">

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="font-medium text-[#6F4E37] transition-colors duration-200 hover:text-[#5a3e2b]"
          >
            Dashboard
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#8b97a8]">
            Customers
          </span>

        </div>

        {/* TITLE */}

        <div className="mt-[22px] flex flex-col gap-[15px] sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#162033]">
              Customers
            </h1>

            <p className="mt-[7px] text-[11px] text-[#8290a3]">
              Manage registered GETSUKA customers.
            </p>

          </div>

          <div className="rounded-full bg-[#E6E0F0] px-[13px] py-[7px] text-[9px] font-medium text-[#6F4E37]">
            {pagination.totalUsers} customers
          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="px-[26px] py-[22px]">

        {/* ===================================================
            STAT CARDS
        =================================================== */}

        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">

          {/* TOTAL */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#c8d8f4] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#E6E0F0] text-[15px] text-[#6F4E37] transition-colors duration-200 group-hover:bg-[#6F4E37] group-hover:text-white">
                ◎
              </div>

              <span className="text-[18px] text-[#d8e2f0] transition-colors duration-200 group-hover:text-[#b8cbed]">
                +
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Total Customers
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {pagination.totalUsers}
            </p>

            <p className="mt-[4px] text-[8px] text-[#9aa6b6]">
              Registered accounts
            </p>

          </div>

          {/* ACTIVE */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#bcebd5] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#effcf6] text-[15px] text-[#12a66d] transition-colors duration-200 group-hover:bg-[#12a66d] group-hover:text-white">
                ✓
              </div>

              <span className="text-[18px] text-[#d8eee5] transition-colors duration-200 group-hover:text-[#a9dec9]">
                ↗
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Active
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {activeCustomers}
            </p>

            <p className="mt-[4px] text-[8px] text-[#12a66d]">
              Currently active
            </p>

          </div>

          {/* BLOCKED */}

          <div className="group rounded-[12px] border border-[#e1e8f1] bg-white px-[17px] py-[16px] shadow-[0_4px_18px_rgba(30,64,175,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#ffd0d8] hover:shadow-[0_8px_25px_rgba(30,64,175,0.08)]">

            <div className="flex items-center justify-between">

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#fff2f4] text-[15px] text-[#df3d56] transition-colors duration-200 group-hover:bg-[#df3d56] group-hover:text-white">
                !
              </div>

              <span className="text-[18px] text-[#f3d9de] transition-colors duration-200 group-hover:text-[#e9b5bf]">
                ↘
              </span>

            </div>

            <p className="mt-[13px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#7e8da1]">
              Blocked
            </p>

            <p className="mt-[5px] text-[23px] font-semibold text-[#1b273b]">
              {blockedCustomers}
            </p>

            <p className="mt-[4px] text-[8px] text-[#df3d56]">
              Restricted accounts
            </p>

          </div>

        </div>

        {/* ===================================================
            SEARCH PANEL
        =================================================== */}

        <section className="mt-[14px] rounded-[12px] border border-[#e1e8f1] bg-white p-[15px] shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-[9px] xl:flex-row"
          >

            {/* SEARCH */}

            <div className="relative flex-1">

              <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[13px] text-[#9aa6b6]">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customers by name or email..."
                className="h-[45px] w-full rounded-[8px] border border-[#dfe6ef] bg-[#FFFFFF] pl-[36px] pr-[12px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6F4E37] focus:bg-white focus:ring-[3px] focus:ring-[#6F4E37]/5"
              />

            </div>

            {/* SEARCH BUTTON */}

            <button
              type="submit"
              className="h-[45px] rounded-[8px] bg-[#6F4E37] px-[23px] text-[8px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_5px_14px_rgba(111,78,55,0.15)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#5a3e2b] hover:shadow-[0_7px_18px_rgba(111,78,55,0.20)] active:translate-y-0"
            >
              Search
            </button>

            {/* CLEAR */}

            <button
              type="button"
              onClick={handleClear}
              className="h-[45px] rounded-[8px] border border-[#dfe6ef] bg-white px-[20px] text-[8px] font-medium uppercase tracking-[0.08em] text-[#7a8799] transition-all duration-200 hover:border-[#b8c8dd] hover:bg-[#FAF9F7] hover:text-[#6F4E37] active:bg-[#E6E0F0]"
            >
              ↻ &nbsp; Clear
            </button>

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

        {successMessage && (
          <div className="mt-[12px] rounded-[8px] border border-[#bcebd5] bg-[#effcf6] px-[15px] py-[11px]">

            <p className="text-[9px] text-[#12a66d]">
              ✓ &nbsp; {successMessage}
            </p>

          </div>
        )}

        {/* ===================================================
            CUSTOMER TABLE
        =================================================== */}

        <section className="mt-[14px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          {/* TABLE HEADER */}

          <div className="flex flex-col gap-[10px] border-b border-[#edf1f6] px-[18px] py-[15px] sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[12px] font-semibold text-[#1c2940]">
                Customer Directory
              </p>

              <p className="mt-[4px] text-[8px] uppercase tracking-[0.08em] text-[#8b97a8]">
                {pagination.totalUsers} registered users
              </p>

            </div>

            <div className="flex items-center gap-[7px]">

              <span className="h-[6px] w-[6px] rounded-full bg-[#12a66d]" />

              <span className="text-[7px] uppercase tracking-[0.1em] text-[#8996a8]">
                Live Customer Data
              </span>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px]">

              <thead>

                <tr className="border-b border-[#edf1f6] bg-[#f8faff]">

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Customer
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Email
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Phone
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Status
                  </th>

                  <th className="px-[18px] py-[13px] text-left text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Joined
                  </th>

                  <th className="px-[18px] py-[13px] text-right text-[7px] uppercase tracking-[0.12em] text-[#7c899b]">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {/* LOADING */}

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="px-[18px] py-[65px] text-center"
                    >

                      <div className="flex flex-col items-center">

                        <div className="h-[25px] w-[25px] animate-spin rounded-full border-2 border-[#dce5f2] border-t-[#6F4E37]" />

                        <p className="mt-[12px] text-[8px] uppercase tracking-[0.12em] text-[#8996a8]">
                          Loading Customers...
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : users.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="px-[18px] py-[70px] text-center"
                    >

                      <div className="mx-auto flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#E6E0F0] text-[19px] text-[#8da9dc]">
                        ◎
                      </div>

                      <p className="mt-[13px] text-[9px] font-medium uppercase tracking-[0.1em] text-[#69788b]">
                        No Customers Found
                      </p>

                      <p className="mt-[5px] text-[8px] text-[#9aa6b6]">
                        Try changing your search.
                      </p>

                    </td>

                  </tr>

                ) : (

                  users.map((user) => (

                    <tr
                      key={user._id}
                      className="group border-b border-[#edf1f6] bg-white transition-all duration-200 hover:bg-[#FAF9F7] hover:shadow-[inset_3px_0_0_#6F4E37]"
                    >

                      {/* CUSTOMER */}

                      <td className="px-[18px] py-[15px]">

                        <div className="flex items-center gap-[11px]">

                          <div className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border border-[#dce6f3] bg-[#E6E0F0] text-[10px] font-medium text-[#6F4E37] transition-all duration-200 group-hover:border-[#b8cff5] group-hover:bg-[#dceaff] group-hover:text-[#5a3e2b]">

                            {(
                              user.fullName || "U"
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </div>

                          <div>

                            <p className="text-[9px] font-semibold text-[#263247] transition-colors duration-200 group-hover:text-[#6F4E37]">
                              {user.fullName}
                            </p>

                            <p className="mt-[4px] text-[7px] text-[#9aa6b6]">
                              ID:{" "}
                              {user._id.slice(-8)}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* EMAIL */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#6f7d90] transition-colors duration-200 group-hover:text-[#50698c]">
                          {user.email}
                        </p>

                      </td>

                      {/* PHONE */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#7c899b] transition-colors duration-200 group-hover:text-[#50698c]">
                          {user.phone || "—"}
                        </p>

                      </td>

                      {/* STATUS */}

                      <td className="px-[18px] py-[15px]">

                        {user.isBlocked ? (

                          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#ffd0d8] bg-[#fff3f5] px-[8px] py-[5px] text-[6px] uppercase tracking-[0.08em] text-[#d93650]">
                            <span className="h-[5px] w-[5px] rounded-full bg-[#df3d56]" />
                            BLOCKED
                          </span>

                        ) : (

                          <span className="inline-flex items-center gap-[5px] rounded-full border border-[#bcebd5] bg-[#effcf6] px-[8px] py-[5px] text-[6px] uppercase tracking-[0.08em] text-[#11845b]">
                            <span className="h-[5px] w-[5px] rounded-full bg-[#12a66d]" />
                            ACTIVE
                          </span>

                        )}

                      </td>

                      {/* JOINED */}

                      <td className="px-[18px] py-[15px]">

                        <p className="text-[8px] text-[#7c899b] transition-colors duration-200 group-hover:text-[#50698c]">

                          {user.createdAt
                            ? new Date(
                                user.createdAt
                              ).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}

                        </p>

                      </td>

                      {/* ACTIONS */}

                      <td className="px-[18px] py-[15px]">

                        <div className="flex justify-end gap-[6px]">

                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              handleViewUser(user._id)
                            }
                            className="h-[31px] rounded-[7px] border border-[#dce4ee] bg-white px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#718096] transition-all duration-200 hover:border-[#D8D3CF] hover:bg-[#f3f7ff] hover:text-[#6F4E37] active:bg-[#eaf2ff]"
                          >
                            VIEW
                          </button>

                          {/* BLOCK / UNBLOCK */}

                          <button
                            type="button"
                            disabled={
                              actionLoading === user._id
                            }
                            onClick={() =>
                              handleOpenConfirmModal(
                                user.isBlocked ? "unblock" : "block",
                                user
                              )
                            }
                            className={
                              user.isBlocked
                                ? "h-[31px] rounded-[7px] border border-[#bcebd5] bg-[#effcf6] px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#11845b] transition-all duration-200 hover:border-[#83d9b6] hover:bg-[#e0faef] hover:text-[#08764f] disabled:cursor-not-allowed disabled:opacity-40"
                                : "h-[31px] rounded-[7px] border border-[#ffe0a5] bg-[#fffaf0] px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#a36b00] transition-all duration-200 hover:border-[#f2c96d] hover:bg-[#fff5dc] hover:text-[#875700] disabled:cursor-not-allowed disabled:opacity-40"
                            }
                          >
                            {actionLoading === user._id
                              ? "..."
                              : user.isBlocked
                              ? "UNBLOCK"
                              : "BLOCK"}
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            disabled={
                              actionLoading === user._id
                            }
                            onClick={() =>
                              handleOpenConfirmModal("delete", user)
                            }
                            className="h-[31px] rounded-[7px] border border-[#ffd0d8] bg-[#fff5f6] px-[11px] text-[6px] font-medium uppercase tracking-[0.08em] text-[#d93650] transition-all duration-200 hover:border-[#ffabb9] hover:bg-[#ffe9ed] hover:text-[#c52d47] active:bg-[#ffe0e5] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            DELETE
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
                {users.length}
              </span>{" "}

              customers of{" "}

              <span className="font-medium text-[#4c5b70]">
                {pagination.totalUsers}
              </span>

            </p>

            <div className="flex items-center gap-[5px]">

              {/* PREVIOUS */}

              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage(page - 1)
                }
                className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[11px] text-[#71808c] transition-all duration-200 hover:border-[#D8D3CF] hover:bg-[#f3f7ff] hover:text-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-30"
              >
                ‹
              </button>

              {/* PAGE */}

              <div className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] bg-[#6F4E37] px-[9px] text-[8px] font-medium text-white shadow-[0_4px_12px_rgba(111,78,55,0.15)]">
                {pagination.currentPage}
              </div>

              {/* NEXT */}

              <button
                disabled={
                  page >= pagination.totalPages
                }
                onClick={() =>
                  setPage(page + 1)
                }
                className="flex h-[32px] min-w-[32px] items-center justify-center rounded-[7px] border border-[#dce4ee] bg-white text-[11px] text-[#71808c] transition-all duration-200 hover:border-[#D8D3CF] hover:bg-[#f3f7ff] hover:text-[#6F4E37] disabled:cursor-not-allowed disabled:opacity-30"
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

            <p className="text-[11px] font-semibold text-[#6F4E37]">
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
          VIEW CUSTOMER MODAL
      ===================================================== */}

      {(selectedUser || viewLoading) && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102047]/35 px-4 backdrop-blur-[4px]">

          <div className="w-full max-w-[460px] overflow-hidden rounded-[14px] border border-[#dce5f0] bg-white shadow-[0_30px_100px_rgba(30,64,175,0.20)]">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#edf1f6] px-[20px] py-[18px]">

              <div>

                <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-[#6F4E37]">
                  GETSUKA / CUSTOMERS
                </p>

                <h2 className="mt-[6px] text-[15px] font-semibold text-[#1b273b]">
                  Customer Profile
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#f4f7fb] text-[18px] text-[#7d899a] transition-all duration-200 hover:bg-[#e8eef7] hover:text-[#6F4E37]"
              >
                ×
              </button>

            </div>

            {/* LOADING */}

            {viewLoading && !selectedUser && (

              <div className="flex flex-col items-center justify-center px-[20px] py-[60px]">

                <div className="h-[27px] w-[27px] animate-spin rounded-full border-2 border-[#dce5f2] border-t-[#6F4E37]" />

                <p className="mt-[13px] text-[8px] uppercase tracking-[0.14em] text-[#8996a8]">
                  Loading Customer...
                </p>

              </div>

            )}

            {/* CUSTOMER */}

            {selectedUser && (

              <div className="px-[20px] py-[20px]">

                {/* PROFILE HEADER */}

                <div className="flex items-center gap-[13px] rounded-[9px] border border-[#e1e8f1] bg-[#f8faff] p-[15px]">

                  <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full border border-[#cfe0fb] bg-[#E6E0F0]">

                    <span className="text-[17px] font-semibold text-[#6F4E37]">
                      {(
                        selectedUser.fullName || "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                  </div>

                  <div className="flex-1">

                    <p className="text-[10px] font-semibold text-[#263247]">
                      {selectedUser.fullName}
                    </p>

                    <p className="mt-[4px] text-[8px] text-[#8996a8]">
                      {selectedUser.email}
                    </p>

                  </div>

                  {selectedUser.isBlocked ? (

                    <span className="rounded-full border border-[#ffd0d8] bg-[#fff3f5] px-[8px] py-[4px] text-[6px] uppercase tracking-[0.08em] text-[#d93650]">
                      BLOCKED
                    </span>

                  ) : (

                    <span className="rounded-full border border-[#bcebd5] bg-[#effcf6] px-[8px] py-[4px] text-[6px] uppercase tracking-[0.08em] text-[#11845b]">
                      ACTIVE
                    </span>

                  )}

                </div>

                {/* DETAILS */}

                <div className="mt-[18px] space-y-[12px]">

                  <CustomerDetail
                    label="FULL NAME"
                    value={selectedUser.fullName}
                  />

                  <CustomerDetail
                    label="EMAIL"
                    value={selectedUser.email}
                  />

                  <CustomerDetail
                    label="PHONE"
                    value={
                      selectedUser.phone ||
                      "Not provided"
                    }
                  />

                  <CustomerDetail
                    label="ACCOUNT STATUS"
                    value={
                      selectedUser.isBlocked
                        ? "BLOCKED"
                        : "ACTIVE"
                    }
                  />

                  <CustomerDetail
                    label="CUSTOMER ID"
                    value={selectedUser._id}
                  />

                  <CustomerDetail
                    label="JOINED"
                    value={
                      selectedUser.createdAt
                        ? new Date(
                            selectedUser.createdAt
                          ).toLocaleString()
                        : "—"
                    }
                  />

                </div>

                {/* MODAL ACTIONS */}

                <div className="mt-[20px] grid grid-cols-2 gap-[8px]">

                  <button
                    type="button"
                    disabled={
                      actionLoading ===
                      selectedUser._id
                    }
                    onClick={() =>
                      handleOpenConfirmModal(
                        selectedUser.isBlocked ? "unblock" : "block",
                        selectedUser
                      )
                    }
                    className={
                      selectedUser.isBlocked
                        ? "h-[40px] rounded-[8px] border border-[#bcebd5] bg-[#effcf6] text-[7px] font-medium uppercase tracking-[0.08em] text-[#11845b] transition-all duration-200 hover:border-[#83d9b6] hover:bg-[#e0faef] hover:text-[#08764f] disabled:cursor-not-allowed disabled:opacity-40"
                        : "h-[40px] rounded-[8px] border border-[#ffe0a5] bg-[#fffaf0] text-[7px] font-medium uppercase tracking-[0.08em] text-[#a36b00] transition-all duration-200 hover:border-[#f2c96d] hover:bg-[#fff5dc] hover:text-[#875700] disabled:cursor-not-allowed disabled:opacity-40"
                    }
                  >
                    {actionLoading ===
                    selectedUser._id
                      ? "PROCESSING..."
                      : selectedUser.isBlocked
                      ? "UNBLOCK CUSTOMER"
                      : "BLOCK CUSTOMER"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      actionLoading ===
                      selectedUser._id
                    }
                    onClick={() =>
                      handleOpenConfirmModal("delete", selectedUser)
                    }
                    className="h-[40px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] text-[7px] font-medium uppercase tracking-[0.08em] text-[#d93650] transition-all duration-200 hover:border-[#ffabb9] hover:bg-[#ffe9ed] hover:text-[#c52d47] active:bg-[#ffe0e5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    DELETE CUSTOMER
                  </button>

                </div>

                {/* CLOSE */}

                <button
                  type="button"
                  onClick={() =>
                    setSelectedUser(null)
                  }
                  className="mt-[9px] h-[38px] w-full rounded-[8px] border border-[#dce4ee] bg-white text-[7px] font-medium uppercase tracking-[0.1em] text-[#718096] transition-all duration-200 hover:border-[#D8D3CF] hover:bg-[#f3f7ff] hover:text-[#6F4E37]"
                >
                  CLOSE
                </button>

              </div>

            )}

          </div>

        </div>

      )}

      {/* ===================================================
          CONFIRMATION MODAL
      =================================================== */}

      {confirmModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#102047]/35 p-4 backdrop-blur-[4px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[400px] overflow-hidden rounded-[14px] border border-[#dce4ee] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf1f6] px-[22px] py-[16px]">
              <h3 className="text-[13px] font-semibold text-[#182033] capitalize">
                {confirmModal.action === "delete"
                  ? "Delete Customer"
                  : confirmModal.action === "block"
                  ? "Block Customer"
                  : "Unblock Customer"}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ open: false, action: "", user: null })
                }
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#f4f7fb] text-[16px] text-[#7d899a] transition hover:bg-[#eaf0f8] hover:text-[#263247]"
              >
                ×
              </button>
            </div>

            <div className="px-[22px] py-[20px]">
              <p className="text-[11px] leading-[1.7] text-[#718096]">
                {confirmModal.action === "delete"
                  ? `Are you sure you want to delete and deactivate this customer account? The account will be deactivated and excluded from active customer lists, while preserving historical order and financial records for compliance.`
                  : confirmModal.action === "block"
                  ? `Are you sure you want to block this customer? They will be unable to sign in or place orders.`
                  : `Are you sure you want to unblock this customer? Their access will be restored.`}
              </p>

              <div className="mt-[14px] rounded-[9px] border border-[#e1e8f1] bg-[#f8faff] px-[14px] py-[12px]">
                <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#8b97a8]">
                  Customer
                </p>
                <p className="mt-[6px] text-[12px] font-semibold text-[#263247]">
                  {confirmModal.user?.fullName}
                </p>
                <p className="text-[8px] text-[#8b97a8]">
                  {confirmModal.user?.email}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-[8px] border-t border-[#edf1f6] bg-[#fafcff] px-[22px] py-[14px]">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ open: false, action: "", user: null })
                }
                disabled={actionLoading === confirmModal.user?._id}
                className="h-[36px] rounded-[7px] border border-[#dce4ee] bg-white px-[16px] text-[10px] font-medium text-[#718096] transition hover:bg-[#FAF9F7] hover:text-[#263247] disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleExecuteConfirmAction}
                disabled={actionLoading === confirmModal.user?._id}
                className={`h-[36px] rounded-[7px] px-[16px] text-[10px] font-medium text-white transition disabled:opacity-50 ${
                  confirmModal.action === "unblock"
                    ? "bg-[#11845b] hover:bg-[#08764f]"
                    : "bg-[#d93650] hover:bg-[#c52d47]"
                }`}
              >
                {actionLoading === confirmModal.user?._id
                  ? "PROCESSING..."
                  : confirmModal.action === "delete"
                  ? "CONFIRM DELETE"
                  : confirmModal.action === "block"
                  ? "CONFIRM BLOCK"
                  : "CONFIRM UNBLOCK"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =========================================================
// CUSTOMER DETAIL
// =========================================================

const CustomerDetail = ({
  label,
  value,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[#edf1f6] pb-[11px]">

      <span className="text-[7px] uppercase tracking-[0.12em] text-[#8996a8]">
        {label}
      </span>

      <span className="max-w-[270px] break-all text-right text-[8px] text-[#4f5e73]">
        {value}
      </span>

    </div>
  );
};

export default CustomerManagementPage;