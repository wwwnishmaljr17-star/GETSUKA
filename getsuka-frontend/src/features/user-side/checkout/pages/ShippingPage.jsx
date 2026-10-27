import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getUserAddresses,
  addAddress,
} from "../../account/api/addressApi";

const ShippingPage = () => {
  const navigate = useNavigate();

  // ============================================
  // STATE
  // ============================================

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartItems, setCartItems] = useState([]);

  // ============================================
  // ADD ADDRESS MODAL
  // ============================================

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  // ============================================
  // LOAD CART
  // ============================================

  useEffect(() => {
    const loadCart = () => {
      try {
        const storedCart = localStorage.getItem("getsukaCart");
        if (!storedCart) {
          setCartItems([]);
          return;
        }

        const parsedCart = JSON.parse(storedCart);
        if (Array.isArray(parsedCart)) {
          setCartItems(parsedCart);
        } else {
          setCartItems([]);
        }
      } catch (err) {
        console.error("Load Checkout Cart Error:", err);
        setCartItems([]);
      }
    };

    loadCart();
  }, []);

  // ============================================
  // LOAD ADDRESSES
  // ============================================

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const data = await getUserAddresses();
        if (!data.success) {
          setError(data.message || "Failed to load saved addresses.");
          return;
        }

        const userAddresses = data.addresses || [];
        setAddresses(userAddresses);

        let savedCheckout = null;
        try {
          const storedCheckout = sessionStorage.getItem(
            "getsukaCheckoutShipping"
          );
          if (storedCheckout) {
            savedCheckout = JSON.parse(storedCheckout);
          }
        } catch (storageErr) {
          console.error("Checkout Storage Error:", storageErr);
        }

        if (
          savedCheckout?.selectedAddressId &&
          userAddresses.some(
            (address) =>
              String(address._id) === String(savedCheckout.selectedAddressId)
          )
        ) {
          setSelectedAddressId(savedCheckout.selectedAddressId);
        } else {
          const defaultAddress = userAddresses.find(
            (address) => address.isDefault
          );
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress._id);
          } else if (userAddresses.length > 0) {
            setSelectedAddressId(userAddresses[0]._id);
          }
        }

        if (
          savedCheckout?.deliveryMethod === "standard" ||
          savedCheckout?.deliveryMethod === "express"
        ) {
          setDeliveryMethod(savedCheckout.deliveryMethod);
        }
      } catch (err) {
        console.error("Load Checkout Addresses Error:", err);
        if (err.response?.status === 401) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load addresses."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, [navigate]);

  // ============================================
  // SAVE CHECKOUT SHIPPING
  // ============================================

  useEffect(() => {
    if (!selectedAddressId) return;

    try {
      sessionStorage.setItem(
        "getsukaCheckoutShipping",
        JSON.stringify({
          selectedAddressId,
          deliveryMethod,
        })
      );
    } catch (storageErr) {
      console.error("Save Checkout Shipping Error:", storageErr);
    }
  }, [selectedAddressId, deliveryMethod]);

  // ============================================
  // ORDER CALCULATION
  // ============================================

  const subtotal = useMemo(() => {
    return cartItems.reduce((totalPrice, item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 1);
      return totalPrice + price * quantity;
    }, 0);
  }, [cartItems]);

  const shippingCharge = deliveryMethod === "express" ? 149 : 0;
  const total = subtotal + shippingCharge;

  const formatPrice = (value) => {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  };

  const getItemImage = (item) => {
    if (item.image) return item.image;
    if (Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      if (typeof firstImage === "string") return firstImage;
      return firstImage?.url || "";
    }
    return "";
  };

  const getItemName = (item) => item.name || "GETSUKA PRODUCT";

  const getItemVariant = (item) => {
    const details = [];
    if (item.size) details.push(`Size: ${item.size}`);
    if (item.color) details.push(`Color: ${item.color}`);
    return details.length > 0 ? details.join(" | ") : "Standard";
  };

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);
    setError("");
  };

  const openAddressModal = () => {
    setAddressForm({
      fullName: "",
      phone: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: addresses.length === 0,
    });
    setAddressError("");
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    if (savingAddress) return;
    setShowAddressModal(false);
    setAddressError("");
  };

  useEffect(() => {
    if (!showAddressModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeAddressModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddressModal, savingAddress]);

  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setAddressError("");
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressError("");

    if (!addressForm.fullName.trim()) {
      setAddressError("Full name is required.");
      return;
    }
    if (!/^\d{10}$/.test(addressForm.phone.trim())) {
      setAddressError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!addressForm.addressLine.trim()) {
      setAddressError("Address is required.");
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressError("City is required.");
      return;
    }
    if (!addressForm.state.trim()) {
      setAddressError("State is required.");
      return;
    }
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
      setAddressError("Pincode must be exactly 6 digits.");
      return;
    }

    const payload = {
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      addressLine: addressForm.addressLine.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.trim(),
      isDefault: addressForm.isDefault,
    };

    try {
      setSavingAddress(true);
      const data = await addAddress(payload);

      if (!data.success) {
        setAddressError(data.message || "Failed to add address.");
        return;
      }

      const newAddress = data.address;

      setAddresses((previous) => {
        let updated = previous;
        if (newAddress.isDefault) {
          updated = previous.map((address) => ({
            ...address,
            isDefault: false,
          }));
        }
        return [newAddress, ...updated];
      });

      setSelectedAddressId(newAddress._id);
      setShowAddressModal(false);
      setAddressForm({
        fullName: "",
        phone: "",
        addressLine: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
      });
      setError("");
    } catch (err) {
      console.error("Add Checkout Address Error:", err);
      setAddressError(
        err.response?.data?.message || err.message || "Failed to add address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const handleContinue = () => {
    setError("");

    if (cartItems.length === 0) {
      setError("Your bag is empty.");
      return;
    }

    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }

    const selectedAddress = addresses.find(
      (address) => String(address._id) === String(selectedAddressId)
    );

    if (!selectedAddress) {
      setError("Selected address is no longer available.");
      return;
    }

    const checkoutData = {
      selectedAddressId,
      selectedAddress,
      deliveryMethod,
      shippingCharge,
      subtotal,
      total,
    };

    try {
      sessionStorage.setItem(
        "getsukaCheckoutShipping",
        JSON.stringify(checkoutData)
      );
    } catch (err) {
      console.error("Save Checkout Data Error:", err);
    }

    navigate("/checkout/review");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] text-[#252321] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E5E4E2] border-t-[#6F4E37]" />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#716C67]">
            Loading Checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#252321]">
      {/* CHECKOUT BREADCRUMB STEPS */}
      <div className="border-b border-[#E5E4E2] bg-white">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="text-[#716C67]">01 BAG</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-0.5">
              02 SHIPPING
            </span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">03 REVIEW</span>
            <span className="text-[#D8D3CF]">/</span>
            <span className="text-[#716C67]">04 PAYMENT</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-[1440px] mx-auto px-6 py-10 lg:py-14">
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6F4E37]">
            GETSUKA CHECKOUT
          </p>
          <h1 className="mt-2 text-3xl font-serif font-medium text-[#252321] md:text-5xl">
            Shipping & Delivery
          </h1>
          <p className="mt-2 text-xs text-[#716C67]">
            Select your preferred shipping destination and transit service.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-10 lg:gap-14">
          {/* LEFT: ADDRESSES & DELIVERY */}
          <section>
            {/* STEP 1: DELIVERY ADDRESS */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                    STEP 01
                  </span>
                  <h2 className="text-xl font-serif font-medium text-[#252321]">
                    Delivery Destination
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={openAddressModal}
                  className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37] underline decoration-[#E5E4E2] underline-offset-4 hover:decoration-[#6F4E37] transition"
                >
                  + ADD NEW ADDRESS
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="border border-[#E5E4E2] bg-white min-h-[190px] flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67] mb-4">
                    NO SAVED ADDRESSES FOUND
                  </p>
                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="h-11 px-7 bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-[#211B18] transition"
                  >
                    ADD YOUR FIRST ADDRESS
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((address) => {
                    const isSelected =
                      String(selectedAddressId) === String(address._id);

                    return (
                      <button
                        key={address._id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handleAddressSelect(address._id)}
                        className={`text-left p-6 border transition bg-white relative ${
                          isSelected
                            ? "border-[#6F4E37] shadow-sm ring-1 ring-[#6F4E37]"
                            : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                              {address.fullName}
                            </h3>
                            {address.isDefault && (
                              <span className="inline-block mt-2 text-[8px] font-bold uppercase tracking-[0.15em] bg-[#E6E0F0] text-[#6F4E37] px-2 py-0.5">
                                DEFAULT
                              </span>
                            )}
                          </div>

                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-[#6F4E37]"
                                : "border-[#D8D3CF]"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                            )}
                          </span>
                        </div>

                        <div className="mt-4 text-[11px] text-[#716C67] leading-relaxed">
                          <p>{address.addressLine}</p>
                          <p>
                            {address.city}, {address.state} — {address.pincode}
                          </p>
                        </div>

                        <div className="border-t border-[#E5E4E2] mt-4 pt-3">
                          <p className="text-[10px] font-semibold text-[#252321]">
                            Phone: {address.phone}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={openAddressModal}
                    className="min-h-[170px] border border-dashed border-[#E5E4E2] bg-[#FAF9F7] flex flex-col items-center justify-center hover:border-[#6F4E37] transition p-6 text-center"
                  >
                    <span className="text-2xl text-[#6F4E37] mb-2">+</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#716C67]">
                      ADD ANOTHER ADDRESS
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: DELIVERY METHOD */}
            <div className="mt-12">
              <div className="mb-5">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                  STEP 02
                </span>
                <h2 className="text-xl font-serif font-medium text-[#252321]">
                  Shipping Method
                </h2>
              </div>

              <div className="space-y-3">
                {/* STANDARD */}
                <button
                  type="button"
                  aria-pressed={deliveryMethod === "standard"}
                  onClick={() => setDeliveryMethod("standard")}
                  className={`w-full p-5 border bg-white flex items-center justify-between transition ${
                    deliveryMethod === "standard"
                      ? "border-[#6F4E37] ring-1 ring-[#6F4E37]"
                      : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryMethod === "standard"
                          ? "border-[#6F4E37]"
                          : "border-[#D8D3CF]"
                      }`}
                    >
                      {deliveryMethod === "standard" && (
                        <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                      )}
                    </span>

                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                        STANDARD COMPLIMENTARY COURIER
                      </p>
                      <p className="text-[10px] text-[#716C67] mt-0.5">
                        Delivered within 5–7 business days with end-to-end tracking
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#6F4E37] bg-[#E6E0F0] px-2.5 py-1">
                    FREE
                  </span>
                </button>

                {/* EXPRESS */}
                <button
                  type="button"
                  aria-pressed={deliveryMethod === "express"}
                  onClick={() => setDeliveryMethod("express")}
                  className={`w-full p-5 border bg-white flex items-center justify-between transition ${
                    deliveryMethod === "express"
                      ? "border-[#6F4E37] ring-1 ring-[#6F4E37]"
                      : "border-[#E5E4E2] hover:border-[#6F4E37]/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryMethod === "express"
                          ? "border-[#6F4E37]"
                          : "border-[#D8D3CF]"
                      }`}
                    >
                      {deliveryMethod === "express" && (
                        <span className="w-2 h-2 rounded-full bg-[#6F4E37]" />
                      )}
                    </span>

                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                        EXPRESS PRIORITY AIR COURIER
                      </p>
                      <p className="text-[10px] text-[#716C67] mt-0.5">
                        Guaranteed 2–3 business day delivery with signature on arrival
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-[#252321]">
                    ₹149
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 border border-[#6F4E37] bg-white p-4"
              >
                <p className="text-xs font-semibold text-[#6F4E37]">{error}</p>
              </div>
            )}
          </section>

          {/* RIGHT: SUMMARY ASIDE */}
          <aside className="h-fit lg:sticky lg:top-24">
            <div className="border border-[#E5E4E2] bg-white p-7 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E5E4E2] pb-4">
                <h2 className="text-lg font-serif font-medium text-[#252321]">
                  Order Items
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#716C67]">
                  {cartItems.length} PIECES
                </span>
              </div>

              <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-[#E5E4E2]">
                {cartItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#716C67]">
                    Your bag is empty.
                  </p>
                ) : (
                  cartItems.map((item, index) => {
                    const image = getItemImage(item);
                    const quantity = Number(item.quantity || 1);

                    return (
                      <div
                        key={`${item.productId || item._id || index}-${
                          item.variantId || ""
                        }`}
                        className="py-3 flex gap-3.5 items-center"
                      >
                        <div className="w-14 h-16 bg-[#FAF9F7] border border-[#E5E4E2] shrink-0 overflow-hidden">
                          {image ? (
                            <img
                              src={image}
                              alt={getItemName(item)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[7px] text-[#716C67]">
                              GETSUKA
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#252321] truncate">
                            {getItemName(item)}
                          </p>
                          <p className="text-[10px] text-[#716C67] mt-0.5">
                            {getItemVariant(item)}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-[#716C67]">
                              Qty: {quantity}
                            </span>
                            <span className="text-xs font-bold text-[#252321]">
                              {formatPrice(Number(item.price || 0) * quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-[#E5E4E2] mt-6 pt-4 space-y-3 text-xs">
                <div className="flex justify-between text-[#716C67]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#252321]">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-[#716C67]">
                  <span>Shipping</span>
                  <span
                    className={
                      shippingCharge === 0
                        ? "text-[#6F4E37] font-bold"
                        : "font-semibold text-[#252321]"
                    }
                  >
                    {shippingCharge === 0 ? "FREE" : formatPrice(shippingCharge)}
                  </span>
                </div>

                <div className="border-t border-[#E5E4E2] pt-3 flex items-end justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#252321]">
                    TOTAL
                  </span>
                  <span className="text-xl font-serif font-bold text-[#252321]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={cartItems.length === 0}
                className="w-full h-12 mt-6 bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#211B18] transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-[#D8D3CF]"
              >
                CONTINUE TO REVIEW
                <span>→</span>
              </button>

              <p className="text-center text-[9px] uppercase tracking-wider text-[#716C67] mt-3">
                SECURE 256-BIT ENCRYPTED CHECKOUT
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ADD ADDRESS MODAL */}
      {showAddressModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shipping-address-modal-title"
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddressModal();
          }}
        >
          <div className="w-full max-w-[620px] max-h-[90vh] overflow-y-auto bg-white border border-[#E5E4E2] shadow-xl">
            <div className="px-7 py-5 border-b border-[#E5E4E2] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
                  ADDRESS BOOK
                </span>
                <h2
                  id="shipping-address-modal-title"
                  className="text-xl font-serif font-medium text-[#252321]"
                >
                  Add New Delivery Address
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAddressModal}
                disabled={savingAddress}
                aria-label="Close address modal"
                className="text-2xl text-[#716C67] hover:text-[#252321] transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="shipping-fullName"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    FULL RECIPIENT NAME
                  </label>
                  <input
                    id="shipping-fullName"
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressChange}
                    placeholder="e.g. Ken Kaneki"
                    className="w-full h-11 border border-[#E5E4E2] bg-[#FAF9F7] px-3.5 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-phone"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    10-DIGIT MOBILE NUMBER
                  </label>
                  <input
                    id="shipping-phone"
                    type="tel"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressChange}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                    className="w-full h-11 border border-[#E5E4E2] bg-[#FAF9F7] px-3.5 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label
                    htmlFor="shipping-addressLine"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    STREET ADDRESS / APARTMENT / SUITE
                  </label>
                  <textarea
                    id="shipping-addressLine"
                    name="addressLine"
                    value={addressForm.addressLine}
                    onChange={handleAddressChange}
                    rows={2}
                    placeholder="House / Flat / Building / Street"
                    className="w-full border border-[#E5E4E2] bg-[#FAF9F7] p-3 text-xs text-[#252321] outline-none focus:border-[#6F4E37] resize-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-city"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    CITY
                  </label>
                  <input
                    id="shipping-city"
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressChange}
                    placeholder="e.g. Mumbai"
                    className="w-full h-11 border border-[#E5E4E2] bg-[#FAF9F7] px-3.5 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-state"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    STATE
                  </label>
                  <input
                    id="shipping-state"
                    type="text"
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressChange}
                    placeholder="e.g. Maharashtra"
                    className="w-full h-11 border border-[#E5E4E2] bg-[#FAF9F7] px-3.5 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shipping-pincode"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#716C67] mb-1.5"
                  >
                    6-DIGIT PINCODE
                  </label>
                  <input
                    id="shipping-pincode"
                    type="text"
                    name="pincode"
                    value={addressForm.pincode}
                    onChange={handleAddressChange}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="e.g. 400001"
                    className="w-full h-11 border border-[#E5E4E2] bg-[#FAF9F7] px-3.5 text-xs text-[#252321] outline-none focus:border-[#6F4E37]"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label
                    htmlFor="shipping-isDefault"
                    className="flex items-center gap-2.5 cursor-pointer text-xs text-[#252321]"
                  >
                    <input
                      id="shipping-isDefault"
                      type="checkbox"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressChange}
                      className="w-4 h-4 accent-[#6F4E37]"
                    />
                    <span>Set as primary default address</span>
                  </label>
                </div>
              </div>

              {addressError && (
                <div role="alert" className="mt-4 border border-[#6F4E37] bg-[#FAF9F7] p-3">
                  <p className="text-xs text-[#6F4E37] font-medium">{addressError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 border-t border-[#E5E4E2] pt-4">
                <button
                  type="button"
                  onClick={closeAddressModal}
                  disabled={savingAddress}
                  className="h-11 px-6 border border-[#E5E4E2] text-[10px] font-bold uppercase tracking-[0.16em] text-[#716C67] hover:bg-[#FAF9F7] transition"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={savingAddress}
                  className="h-11 px-7 bg-[#6F4E37] text-white text-[10px] font-bold uppercase tracking-[0.16em] hover:bg-[#211B18] transition disabled:opacity-50"
                >
                  {savingAddress ? "SAVING..." : "SAVE ADDRESS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingPage;