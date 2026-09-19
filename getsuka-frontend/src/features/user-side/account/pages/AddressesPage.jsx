import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../api/addressApi";

const AddressesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ============================================
  // STATE
  // ============================================

  const [addresses, setAddresses] = useState([]);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  const [editingAddressId, setEditingAddressId] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddressForm, setShowAddressForm] =
    useState(false);

  // ============================================
  // FETCH ADDRESSES
  // ============================================

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const token =
          sessionStorage.getItem("token") ||
          localStorage.getItem("token");

        if (!token) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        const data = await getUserAddresses();

        if (data.success) {
          setAddresses(data.addresses || []);
        } else {
          setError(
            data.message ||
              "Failed to load addresses."
          );
        }
      } catch (err) {
        console.error(
          "Get Addresses Error:",
          err
        );

        if (err.response?.status === 401) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");

          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err.response?.data?.message ||
            "Failed to load addresses."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [navigate]);

  // ============================================
  // SIDEBAR ACTIVE
  // ============================================

  const isActive = (path) => {
    return location.pathname === path;
  };

  // ============================================
  // INPUT CHANGE
  // ============================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
    setSuccess("");
  };

  // ============================================
  // RESET FORM
  // ============================================

  const resetForm = () => {
    setFormData({
      fullName: "",
      phone: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
    });

    setEditingAddressId(null);
    setError("");
  };

  // ============================================
  // OPEN ADD
  // ============================================

  const openAddForm = () => {
    resetForm();
    setSuccess("");
    setShowAddressForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================
  // OPEN EDIT
  // ============================================

  const openEditForm = (address) => {
    setFormData({
      fullName: address.fullName || "",
      phone: address.phone || "",
      addressLine:
        address.addressLine || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      isDefault: Boolean(
        address.isDefault
      ),
    });

    setEditingAddressId(address._id);

    setError("");
    setSuccess("");
    setShowAddressForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================
  // CLOSE FORM
  // ============================================

  const closeAddressForm = () => {
    if (saving) return;

    resetForm();
    setShowAddressForm(false);
  };

  // ============================================
  // SUBMIT ADD / EDIT
  // ============================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // ========================================
    // VALIDATION
    // ========================================

    if (!formData.fullName.trim()) {
      setError(
        "Full name is required."
      );
      return;
    }

    if (
      !/^\d{10}$/.test(
        formData.phone.trim()
      )
    ) {
      setError(
        "Phone number must be exactly 10 digits."
      );
      return;
    }

    if (!formData.addressLine.trim()) {
      setError("Address is required.");
      return;
    }

    if (!formData.city.trim()) {
      setError("City is required.");
      return;
    }

    if (!formData.state.trim()) {
      setError("State is required.");
      return;
    }

    if (
      !/^\d{6}$/.test(
        formData.pincode.trim()
      )
    ) {
      setError(
        "Pincode must be exactly 6 digits."
      );
      return;
    }

    const payload = {
      fullName:
        formData.fullName.trim(),

      phone:
        formData.phone.trim(),

      addressLine:
        formData.addressLine.trim(),

      city:
        formData.city.trim(),

      state:
        formData.state.trim(),

      pincode:
        formData.pincode.trim(),

      isDefault:
        formData.isDefault,
    };

    try {
      setSaving(true);

      // ======================================
      // UPDATE ADDRESS
      // ======================================

      if (editingAddressId) {
        const data =
          await updateAddress(
            editingAddressId,
            payload
          );

        if (!data.success) {
          setError(
            data.message ||
              "Failed to update address."
          );
          return;
        }

        setAddresses((previous) =>
          previous.map((address) => {
            if (
              address._id ===
              editingAddressId
            ) {
              return data.address;
            }

            if (
              data.address.isDefault
            ) {
              return {
                ...address,
                isDefault: false,
              };
            }

            return address;
          })
        );

        setSuccess(
          "Address updated successfully."
        );
      }

      // ======================================
      // ADD ADDRESS
      // ======================================

      else {
        const data =
          await addAddress(payload);

        if (!data.success) {
          setError(
            data.message ||
              "Failed to add address."
          );
          return;
        }

        setAddresses((previous) => {
          const updated =
            previous.map(
              (address) => {
                if (
                  data.address
                    .isDefault
                ) {
                  return {
                    ...address,
                    isDefault: false,
                  };
                }

                return address;
              }
            );

          return [
            data.address,
            ...updated,
          ];
        });

        setSuccess(
          "Address added successfully."
        );
      }

      resetForm();
      setShowAddressForm(false);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Save Address Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save address."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // DELETE
  // ============================================

  const openDeleteModal = (address) => {
    setDeleteTarget(address);
    setError("");
    setSuccess("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setDeleteTarget(null);
  };

  const handleDeleteAddress = async () => {
    if (!deleteTarget?._id) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const data =
        await deleteAddress(
          deleteTarget._id
        );

      if (!data.success) {
        setError(
          data.message ||
            "Failed to delete address."
        );
        return;
      }

      setDeleteTarget(null);

      const refreshed =
        await getUserAddresses();

      if (refreshed.success) {
        setAddresses(
          refreshed.addresses || []
        );
      } else {
        setAddresses((previous) =>
          previous.filter(
            (address) =>
              address._id !==
              deleteTarget._id
          )
        );
      }

      setSuccess(
        "Address deleted successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Delete Address Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete address."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-5">
        <p className="text-[11px] tracking-[0.2em] text-gray-500">
          LOADING...
        </p>
      </div>
    );
  }

  // ============================================
  // PAGE
  // ============================================

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      <main className="w-full max-w-[1400px] mx-auto min-h-[calc(100vh-78px)] flex flex-col lg:flex-row">

        {/* ======================================
            DESKTOP SIDEBAR
        ====================================== */}

        <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 border-r border-white/10 px-8 xl:px-12 pt-[54px]">

          <p className="text-[12px] tracking-[0.25em] text-gray-500 mb-10 whitespace-nowrap">
            MY ACCOUNT
          </p>

          <nav className="space-y-8">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate("/account")
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive("/account")
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            {/* PERSONAL INFORMATION */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive(
                  "/account/update-profile"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            {/* ORDER HISTORY */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/orders"
                )
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive(
                  "/account/orders"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              ORDER HISTORY
            </button>

            {/* SAVED ADDRESSES */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/addresses"
                )
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive(
                  "/account/addresses"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              SAVED ADDRESSES
            </button>

            {/* REFER & EARN */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/referral"
                )
              }
              className="block text-left text-[13px] text-gray-500 hover:text-white whitespace-nowrap transition"
            >
              REFER & EARN
            </button>

            {/* MY WALLET */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/wallet"
                )
              }
              className="block text-left text-[13px] text-gray-500 hover:text-white whitespace-nowrap transition"
            >
              MY WALLET
            </button>

          </nav>

          {/* SIGN OUT */}

          <div className="border-t border-white/10 mt-14 pt-8">

            <button
              type="button"
              onClick={handleLogout}
              className="text-[13px] text-red-500 hover:text-red-400 transition"
            >
              SIGN OUT
            </button>

          </div>

        </aside>

        {/* ======================================
            MOBILE ACCOUNT NAVIGATION
        ====================================== */}

        <div className="lg:hidden w-full border-b border-white/10 px-5 sm:px-8 py-5">

          <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-5">
            MY ACCOUNT
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate("/account")
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive("/account")
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            {/* PERSONAL INFORMATION */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive(
                  "/account/update-profile"
                )
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            {/* ORDER HISTORY */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/orders"
                )
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive(
                  "/account/orders"
                )
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              ORDER HISTORY
            </button>

            {/* SAVED ADDRESSES */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/addresses"
                )
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive(
                  "/account/addresses"
                )
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              SAVED ADDRESSES
            </button>

            {/* REFER & EARN */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/referral"
                )
              }
              className="text-left text-[11px] tracking-wide py-2 text-gray-500 hover:text-white transition"
            >
              REFER & EARN
            </button>

            {/* MY WALLET */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/wallet"
                )
              }
              className="text-left text-[11px] tracking-wide py-2 text-gray-500 hover:text-white transition"
            >
              MY WALLET
            </button>

          </div>

          {/* MOBILE SIGN OUT */}

          <div className="mt-4 pt-4 border-t border-white/10">

            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] tracking-wide text-red-500 hover:text-red-400 transition"
            >
              SIGN OUT
            </button>

          </div>

        </div>

        {/* ======================================
            CONTENT
        ====================================== */}

        <section className="flex-1 min-w-0 px-5 sm:px-8 lg:px-[51px] xl:pr-[70px] pt-8 sm:pt-10 lg:pt-[54px] pb-12">

          {/* ====================================
              HEADER
          ==================================== */}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

            <div>

              <p className="text-[10px] sm:text-[12px] tracking-[0.28em] text-gray-500 mb-3 sm:mb-4">
                ACCOUNT
              </p>

              <h1 className="text-[25px] sm:text-[30px] lg:text-[32px] font-light">
                Saved Addresses
              </h1>

            </div>

            {!showAddressForm && (
              <button
                type="button"
                onClick={openAddForm}
                className="w-full sm:w-auto h-[46px] sm:h-[48px] px-7 border border-white/20 text-[11px] sm:text-[12px] hover:bg-white hover:text-black transition"
              >
                ADD ADDRESS
              </button>
            )}

          </div>

          <p className="text-[11px] sm:text-[12px] text-gray-500 mt-4">
            Manage your delivery addresses.
          </p>

          {/* ====================================
              SUCCESS
          ==================================== */}

          {success && (
            <p className="text-[12px] text-green-500 mt-6">
              {success}
            </p>
          )}

          {/* ====================================
              ERROR
          ==================================== */}

          {error && !showAddressForm && (
            <p className="text-[12px] text-red-500 mt-6">
              {error}
            </p>
          )}

          {/* ====================================
              ADD / EDIT FORM
          ==================================== */}

          {showAddressForm && (
            <div className="border border-white/10 mt-8 sm:mt-11">

              {/* FORM HEADER */}

              <div className="px-5 sm:px-8 py-6 sm:py-7 border-b border-white/10 flex items-start justify-between gap-4">

                <div>

                  <p className="text-[10px] sm:text-[11px] tracking-[0.25em] text-gray-500 mb-3 sm:mb-4">
                    {editingAddressId
                      ? "EDIT ADDRESS"
                      : "NEW ADDRESS"}
                  </p>

                  <h2 className="text-[21px] sm:text-[24px] font-light">
                    {editingAddressId
                      ? "Edit Address"
                      : "Add Address"}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={closeAddressForm}
                  disabled={saving}
                  className="text-gray-500 hover:text-white text-[20px] transition disabled:opacity-40"
                >
                  ×
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="px-5 sm:px-8 py-7 sm:py-9"
              >

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 sm:gap-x-8 sm:gap-y-7">

                  {/* FULL NAME */}

                  <div>

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      FULL NAME
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      value={
                        formData.fullName
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter full name"
                      className="w-full h-[48px] bg-[#111111] border border-white/15 px-4 text-[13px] outline-none focus:border-white transition"
                    />

                  </div>

                  {/* PHONE */}

                  <div>

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      PHONE
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="10 digit phone number"
                      className="w-full h-[48px] bg-[#111111] border border-white/15 px-4 text-[13px] outline-none focus:border-white transition"
                    />

                  </div>

                  {/* ADDRESS */}

                  <div className="sm:col-span-2">

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      ADDRESS
                    </label>

                    <textarea
                      name="addressLine"
                      value={
                        formData.addressLine
                      }
                      onChange={
                        handleChange
                      }
                      rows={4}
                      placeholder="House / Flat / Street / Area"
                      className="w-full bg-[#111111] border border-white/15 px-4 py-3 text-[13px] outline-none focus:border-white transition resize-none"
                    />

                  </div>

                  {/* CITY */}

                  <div>

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      CITY
                    </label>

                    <input
                      type="text"
                      name="city"
                      value={
                        formData.city
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="City"
                      className="w-full h-[48px] bg-[#111111] border border-white/15 px-4 text-[13px] outline-none focus:border-white transition"
                    />

                  </div>

                  {/* STATE */}

                  <div>

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      STATE
                    </label>

                    <input
                      type="text"
                      name="state"
                      value={
                        formData.state
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="State"
                      className="w-full h-[48px] bg-[#111111] border border-white/15 px-4 text-[13px] outline-none focus:border-white transition"
                    />

                  </div>

                  {/* PINCODE */}

                  <div>

                    <label className="block text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                      PINCODE
                    </label>

                    <input
                      type="text"
                      name="pincode"
                      value={
                        formData.pincode
                      }
                      onChange={
                        handleChange
                      }
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="6 digit pincode"
                      className="w-full h-[48px] bg-[#111111] border border-white/15 px-4 text-[13px] outline-none focus:border-white transition"
                    />

                  </div>

                  {/* DEFAULT */}

                  <div className="flex items-center">

                    <label className="flex items-center gap-3 cursor-pointer">

                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={
                          formData.isDefault
                        }
                        onChange={
                          handleChange
                        }
                        className="w-4 h-4 accent-white"
                      />

                      <span className="text-[10px] sm:text-[11px] text-gray-400">
                        SET AS DEFAULT ADDRESS
                      </span>

                    </label>

                  </div>

                </div>

                {/* FORM ERROR */}

                {error && (
                  <p className="text-[12px] text-red-500 mt-6 sm:mt-7">
                    {error}
                  </p>
                )}

                {/* FORM ACTIONS */}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-7 sm:mt-9">

                  <button
                    type="button"
                    onClick={
                      closeAddressForm
                    }
                    disabled={saving}
                    className="w-full sm:w-auto h-[45px] px-7 border border-white/15 text-[11px] hover:border-white transition disabled:opacity-40"
                  >
                    CANCEL
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto h-[45px] px-7 bg-white text-black text-[11px] hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    {saving
                      ? "SAVING..."
                      : editingAddressId
                      ? "UPDATE ADDRESS"
                      : "ADD ADDRESS"}
                  </button>

                </div>

              </form>

            </div>
          )}

          {/* ====================================
              ADDRESS LIST
          ==================================== */}

          {!showAddressForm &&
            addresses.length > 0 && (
              <div className="mt-8 sm:mt-11 space-y-4">

                {addresses.map(
                  (address) => (
                    <div
                      key={address._id}
                      className="border border-white/10"
                    >

                      <div className="px-5 sm:px-8 py-6 sm:py-7">

                        {/* ADDRESS HEADER */}

                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-3">

                              <h2 className="text-[16px] sm:text-[17px] font-normal">
                                {
                                  address.fullName
                                }
                              </h2>

                              {address.isDefault && (
                                <span className="border border-white/20 px-2 py-1 text-[8px] sm:text-[9px] tracking-[0.12em] text-gray-400">
                                  DEFAULT
                                </span>
                              )}

                            </div>

                            <p className="text-[12px] text-gray-500 mt-3">
                              {
                                address.phone
                              }
                            </p>

                          </div>

                          {/* ACTIONS */}

                          <div className="flex items-center gap-6">

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  address
                                )
                              }
                              className="text-[10px] tracking-[0.12em] text-gray-400 hover:text-white transition"
                            >
                              EDIT
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteModal(
                                  address
                                )
                              }
                              className="text-[10px] tracking-[0.12em] text-red-500 hover:text-red-400 transition"
                            >
                              DELETE
                            </button>

                          </div>

                        </div>

                        {/* ADDRESS */}

                        <div className="mt-5 sm:mt-6 text-[12px] text-gray-400 leading-6 break-words">

                          <p>
                            {
                              address.addressLine
                            }
                          </p>

                          <p>
                            {
                              address.city
                            }
                            ,{" "}
                            {
                              address.state
                            }{" "}
                            {
                              address.pincode
                            }
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          {/* ====================================
              EMPTY STATE
          ==================================== */}

          {!showAddressForm &&
            addresses.length === 0 && (
              <div className="border border-white/10 mt-8 sm:mt-11 px-5 sm:px-8 py-14 sm:py-16 text-center">

                <p className="text-[11px] sm:text-[12px] tracking-[0.15em] text-gray-500">
                  NO SAVED ADDRESSES
                </p>

                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-7 w-full sm:w-auto h-[45px] px-7 border border-white/20 text-[11px] hover:bg-white hover:text-black transition"
                >
                  ADD ADDRESS
                </button>

              </div>
            )}

        </section>

      </main>

      {/* ========================================
          DELETE MODAL
      ======================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center px-4 sm:px-5">

          <div className="w-full max-w-[420px] max-h-[90vh] overflow-y-auto bg-[#0b0b0b] border border-white/10">

            {/* HEADER */}

            <div className="px-5 sm:px-8 py-6 sm:py-7 border-b border-white/10">

              <p className="text-[10px] tracking-[0.2em] text-gray-500 mb-4">
                REMOVE ADDRESS
              </p>

              <h2 className="text-[21px] sm:text-[23px] font-light">
                Delete Address?
              </h2>

              <p className="text-[11px] sm:text-[12px] text-gray-500 mt-3 leading-5">
                Are you sure you want to delete
                this saved address?
              </p>

            </div>

            {/* ADDRESS PREVIEW */}

            <div className="px-5 sm:px-8 py-6 border-b border-white/10">

              <p className="text-[13px]">
                {
                  deleteTarget.fullName
                }
              </p>

              <p className="text-[11px] text-gray-500 mt-2 leading-5 break-words">

                {
                  deleteTarget.addressLine
                }

                <br />

                {
                  deleteTarget.city
                }
                ,{" "}
                {
                  deleteTarget.state
                }{" "}
                {
                  deleteTarget.pincode
                }

              </p>

            </div>

            {/* MODAL ACTIONS */}

            <div className="px-5 sm:px-8 py-5 flex flex-col-reverse sm:flex-row justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={deleting}
                className="w-full sm:w-auto h-[43px] px-7 border border-white/15 text-[10px] hover:border-white transition disabled:opacity-40"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteAddress
                }
                disabled={deleting}
                className="w-full sm:w-auto h-[43px] px-7 bg-red-500 text-white text-[10px] hover:bg-red-600 transition disabled:opacity-50"
              >
                {deleting
                  ? "DELETING..."
                  : "DELETE ADDRESS"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AddressesPage;