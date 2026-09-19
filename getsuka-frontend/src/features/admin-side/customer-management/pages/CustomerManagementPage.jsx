import { useEffect, useState } from "react";
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

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] = useState("");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [viewLoading, setViewLoading] =
    useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getUsers({
        search,
        page,
        limit: 10,
      });

      setUsers(response.users || []);

      setPagination(
        response.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalUsers: 0,
        }
      );
    } catch (error) {
      setError(
        error.message ||
          "Failed to fetch customers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);

    fetchUsers();
  };

  const handleClear = () => {
    setSearch("");
    setPage(1);
  };

  /* =========================================
     VIEW CUSTOMER
  ========================================= */

  const handleViewUser = async (userId) => {
    try {
      setViewLoading(true);
      setError("");

      const response =
        await getUserById(userId);

      setSelectedUser(response.user);

    } catch (error) {
      setError(
        error.message ||
          "Failed to fetch customer"
      );
    } finally {
      setViewLoading(false);
    }
  };

  /* =========================================
     BLOCK / UNBLOCK
  ========================================= */

  const handleToggleBlock = async (user) => {
    const action = user.isBlocked
      ? "unblock"
      : "block";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(user._id);
      setError("");

      if (user.isBlocked) {
        await unblockUser(user._id);
      } else {
        await blockUser(user._id);
      }

      await fetchUsers();

      if (
        selectedUser &&
        selectedUser._id === user._id
      ) {
        setSelectedUser({
          ...selectedUser,
          isBlocked: !user.isBlocked,
        });
      }

    } catch (error) {
      setError(
        error.message ||
          `Failed to ${action} customer`
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =========================================
     DELETE USER
  ========================================= */

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${user.fullName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(user._id);
      setError("");

      await deleteUser(user._id);

      if (
        selectedUser &&
        selectedUser._id === user._id
      ) {
        setSelectedUser(null);
      }

      await fetchUsers();

    } catch (error) {
      setError(
        error.message ||
          "Failed to delete customer"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="border-b border-[#292929] bg-[#0d0d0d]">

        <div className="mx-auto max-w-7xl px-6 py-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[8px] tracking-[0.18em] text-gray-500">
                GETSUKA / ADMIN TERMINAL
              </p>

              <h1 className="mt-2 text-[20px] font-medium tracking-wide">
                CUSTOMER MANAGEMENT
              </h1>

              <p className="mt-1 text-[8px] text-gray-500">
                Manage registered GETSUKA customers
              </p>

            </div>

            <button
              onClick={() =>
                navigate("/admin/dashboard")
              }
              className="border border-[#363636] px-4 py-2 text-[7px] tracking-[0.12em] text-gray-400 hover:border-gray-500 hover:text-white transition"
            >
              ← DASHBOARD
            </button>

          </div>

        </div>

      </div>


      {/* =========================================
          CONTENT
      ========================================= */}

      <div className="mx-auto max-w-7xl px-6 py-6">

        {/* SEARCH */}

        <div className="border border-[#292929] bg-[#141414] p-4">

          <form
            onSubmit={handleSearch}
            className="flex gap-3"
          >

            <div className="flex-1">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="SEARCH BY NAME OR EMAIL..."
                className="w-full h-9 border-b border-[#3a3a3a] bg-transparent px-2 text-[8px] tracking-wide text-white placeholder:text-gray-600 outline-none focus:border-gray-300 transition"
              />

            </div>

            <button
              type="submit"
              className="h-9 bg-[#e9002d] px-6 text-[7px] tracking-[0.12em] font-medium hover:bg-[#ff1744] transition"
            >
              SEARCH
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="h-9 border border-[#3a3a3a] px-5 text-[7px] tracking-[0.12em] text-gray-400 hover:text-white hover:border-gray-500 transition"
            >
              CLEAR
            </button>

          </form>

        </div>


        {/* ERROR */}

        {error && (
          <div className="mt-4 border border-red-900 bg-[#1b1111] px-4 py-3 text-[8px] text-red-400">
            {error}
          </div>
        )}


        {/* =========================================
            CUSTOMER TABLE
        ========================================= */}

        <div className="mt-5 overflow-hidden border border-[#292929] bg-[#141414]">

          <div className="flex items-center justify-between border-b border-[#292929] px-4 py-3">

            <div>

              <p className="text-[8px] tracking-[0.12em] text-gray-300">
                CUSTOMERS
              </p>

              <p className="mt-1 text-[6px] text-gray-600">
                {pagination.totalUsers} REGISTERED USERS
              </p>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead>

                <tr className="border-b border-[#292929] text-left">

                  <th className="px-4 py-3 text-[6px] tracking-[0.12em] text-gray-600">
                    CUSTOMER
                  </th>

                  <th className="px-4 py-3 text-[6px] tracking-[0.12em] text-gray-600">
                    EMAIL
                  </th>

                  <th className="px-4 py-3 text-[6px] tracking-[0.12em] text-gray-600">
                    PHONE
                  </th>

                  <th className="px-4 py-3 text-[6px] tracking-[0.12em] text-gray-600">
                    STATUS
                  </th>

                  <th className="px-4 py-3 text-[6px] tracking-[0.12em] text-gray-600">
                    JOINED
                  </th>

                  <th className="px-4 py-3 text-right text-[6px] tracking-[0.12em] text-gray-600">
                    ACTIONS
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="px-4 py-12 text-center text-[8px] text-gray-500"
                    >
                      LOADING CUSTOMERS...
                    </td>

                  </tr>

                ) : users.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="px-4 py-12 text-center text-[8px] text-gray-500"
                    >
                      NO CUSTOMERS FOUND
                    </td>

                  </tr>

                ) : (

                  users.map((user) => (

                    <tr
                      key={user._id}
                      className="border-b border-[#292929] hover:bg-[#191919] transition"
                    >

                      {/* CUSTOMER */}

                      <td className="px-4 py-4">

                        <p className="text-[8px] text-white">
                          {user.fullName}
                        </p>

                        <p className="mt-1 text-[6px] text-gray-600">
                          ID: {user._id.slice(-8)}
                        </p>

                      </td>


                      {/* EMAIL */}

                      <td className="px-4 py-4 text-[7px] text-gray-400">
                        {user.email}
                      </td>


                      {/* PHONE */}

                      <td className="px-4 py-4 text-[7px] text-gray-400">
                        {user.phone || "—"}
                      </td>


                      {/* STATUS */}

                      <td className="px-4 py-4">

                        <span
                          className={
                            user.isBlocked
                              ? "border border-red-900 bg-[#241313] px-2 py-1 text-[6px] tracking-wide text-red-400"
                              : "border border-green-900 bg-[#132018] px-2 py-1 text-[6px] tracking-wide text-green-400"
                          }
                        >
                          {user.isBlocked
                            ? "BLOCKED"
                            : "ACTIVE"}
                        </span>

                      </td>


                      {/* JOINED */}

                      <td className="px-4 py-4 text-[7px] text-gray-500">

                        {user.createdAt
                          ? new Date(
                              user.createdAt
                            ).toLocaleDateString()
                          : "—"}

                      </td>


                      {/* ACTIONS */}

                      <td className="px-4 py-4">

                        <div className="flex justify-end gap-2">

                          {/* VIEW */}

                          <button
                            type="button"
                            onClick={() =>
                              handleViewUser(
                                user._id
                              )
                            }
                            className="border border-[#3a3a3a] px-3 py-2 text-[6px] tracking-wide text-gray-300 hover:border-gray-500 hover:text-white transition"
                          >
                            VIEW
                          </button>


                          {/* BLOCK / UNBLOCK */}

                          <button
                            type="button"
                            disabled={
                              actionLoading ===
                              user._id
                            }
                            onClick={() =>
                              handleToggleBlock(
                                user
                              )
                            }
                            className={
                              user.isBlocked
                                ? "border border-green-900 px-3 py-2 text-[6px] tracking-wide text-green-400 hover:bg-[#132018] transition disabled:opacity-40"
                                : "border border-yellow-900 px-3 py-2 text-[6px] tracking-wide text-yellow-500 hover:bg-[#211d12] transition disabled:opacity-40"
                            }
                          >
                            {actionLoading ===
                            user._id
                              ? "..."
                              : user.isBlocked
                              ? "UNBLOCK"
                              : "BLOCK"}
                          </button>


                          {/* DELETE */}

                          <button
                            type="button"
                            disabled={
                              actionLoading ===
                              user._id
                            }
                            onClick={() =>
                              handleDeleteUser(
                                user
                              )
                            }
                            className="border border-red-900 px-3 py-2 text-[6px] tracking-wide text-red-400 hover:bg-[#241313] transition disabled:opacity-40"
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


          {/* =========================================
              PAGINATION
          ========================================= */}

          <div className="flex items-center justify-between border-t border-[#292929] px-4 py-4">

            <p className="text-[7px] text-gray-500">
              TOTAL USERS:{" "}
              <span className="text-gray-300">
                {pagination.totalUsers}
              </span>
            </p>


            <div className="flex items-center gap-3">

              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage(page - 1)
                }
                className="border border-[#363636] px-4 py-2 text-[6px] tracking-wide text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← PREVIOUS
              </button>

              <span className="text-[7px] text-gray-400">
                {pagination.currentPage} /{" "}
                {pagination.totalPages}
              </span>

              <button
                disabled={
                  page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(page + 1)
                }
                className="border border-[#363636] px-4 py-2 text-[6px] tracking-wide text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                NEXT →
              </button>

            </div>

          </div>

        </div>

      </div>


      {/* =========================================
          VIEW CUSTOMER MODAL
      ========================================= */}

      {(selectedUser || viewLoading) && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="w-full max-w-[420px] border border-[#363636] bg-[#141414] shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#292929] px-5 py-4">

              <div>

                <p className="text-[7px] tracking-[0.14em] text-gray-500">
                  CUSTOMER PROFILE
                </p>

                <h2 className="mt-1 text-[13px]">
                  {viewLoading
                    ? "LOADING..."
                    : selectedUser?.fullName}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
                className="text-[14px] text-gray-500 hover:text-white"
              >
                ×
              </button>

            </div>


            {/* MODAL BODY */}

            {selectedUser && (

              <div className="px-5 py-5">

                <div className="space-y-4">

                  <CustomerDetail
                    label="FULL NAME"
                    value={
                      selectedUser.fullName
                    }
                  />

                  <CustomerDetail
                    label="EMAIL"
                    value={
                      selectedUser.email
                    }
                  />

                  <CustomerDetail
                    label="PHONE"
                    value={
                      selectedUser.phone ||
                      "Not provided"
                    }
                  />

                  <CustomerDetail
                    label="STATUS"
                    value={
                      selectedUser.isBlocked
                        ? "BLOCKED"
                        : "ACTIVE"
                    }
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

                <div className="mt-6 flex gap-2">

                  <button
                    type="button"
                    disabled={
                      actionLoading ===
                      selectedUser._id
                    }
                    onClick={() =>
                      handleToggleBlock(
                        selectedUser
                      )
                    }
                    className="flex-1 border border-[#3a3a3a] py-3 text-[6px] tracking-[0.12em] text-gray-300 hover:border-gray-500 hover:text-white transition disabled:opacity-40"
                  >
                    {selectedUser.isBlocked
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
                      handleDeleteUser(
                        selectedUser
                      )
                    }
                    className="flex-1 border border-red-900 py-3 text-[6px] tracking-[0.12em] text-red-400 hover:bg-[#241313] transition disabled:opacity-40"
                  >
                    DELETE CUSTOMER
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
};


/* =========================================
   CUSTOMER DETAIL
========================================= */

const CustomerDetail = ({
  label,
  value,
}) => {

  return (
    <div className="flex items-center justify-between border-b border-[#292929] pb-3">

      <span className="text-[6px] tracking-[0.12em] text-gray-600">
        {label}
      </span>

      <span className="max-w-[240px] text-right text-[7px] text-gray-300">
        {value}
      </span>

    </div>
  );
};


export default CustomerManagementPage;