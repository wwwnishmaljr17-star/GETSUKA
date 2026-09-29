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
  const [selectedAddressId, setSelectedAddressId] =
    useState("");

  const [deliveryMethod, setDeliveryMethod] =
    useState("standard");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cartItems, setCartItems] = useState([]);

  // ============================================
  // ADD ADDRESS MODAL
  // ============================================

  const [showAddressModal, setShowAddressModal] =
    useState(false);

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [addressError, setAddressError] =
    useState("");

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
        const storedCart =
          localStorage.getItem("getsukaCart");

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
      } catch (error) {
        console.error(
          "Load Checkout Cart Error:",
          error
        );

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

        if (!data.success) {
          setError(
            data.message ||
              "Failed to load saved addresses."
          );

          return;
        }

        const userAddresses =
          data.addresses || [];

        setAddresses(userAddresses);

        // ========================================
        // RESTORE CHECKOUT DATA
        // ========================================

        let savedCheckout = null;

        try {
          const storedCheckout =
            sessionStorage.getItem(
              "getsukaCheckoutShipping"
            );

          if (storedCheckout) {
            savedCheckout =
              JSON.parse(storedCheckout);
          }
        } catch (error) {
          console.error(
            "Checkout Storage Error:",
            error
          );
        }

        // ========================================
        // SELECT ADDRESS
        // ========================================

        if (
          savedCheckout?.selectedAddressId &&
          userAddresses.some(
            (address) =>
              String(address._id) ===
              String(
                savedCheckout.selectedAddressId
              )
          )
        ) {
          setSelectedAddressId(
            savedCheckout.selectedAddressId
          );
        } else {
          const defaultAddress =
            userAddresses.find(
              (address) =>
                address.isDefault
            );

          if (defaultAddress) {
            setSelectedAddressId(
              defaultAddress._id
            );
          } else if (
            userAddresses.length > 0
          ) {
            setSelectedAddressId(
              userAddresses[0]._id
            );
          }
        }

        // ========================================
        // RESTORE DELIVERY METHOD
        // ========================================

        if (
          savedCheckout?.deliveryMethod ===
            "standard" ||
          savedCheckout?.deliveryMethod ===
            "express"
        ) {
          setDeliveryMethod(
            savedCheckout.deliveryMethod
          );
        }
      } catch (error) {
        console.error(
          "Load Checkout Addresses Error:",
          error
        );

        if (
          error.response?.status === 401
        ) {
          sessionStorage.removeItem(
            "token"
          );

          sessionStorage.removeItem(
            "user"
          );

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          error.response?.data?.message ||
            error.message ||
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
    if (!selectedAddressId) {
      return;
    }

    try {
      sessionStorage.setItem(
        "getsukaCheckoutShipping",
        JSON.stringify({
          selectedAddressId,
          deliveryMethod,
        })
      );
    } catch (error) {
      console.error(
        "Save Checkout Shipping Error:",
        error
      );
    }
  }, [
    selectedAddressId,
    deliveryMethod,
  ]);

  // ============================================
  // ORDER CALCULATION
  // ============================================

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => {
        const price = Number(
          item.price || 0
        );

        const quantity = Number(
          item.quantity || 1
        );

        return (
          total + price * quantity
        );
      },
      0
    );
  }, [cartItems]);

  const shippingCharge =
    deliveryMethod === "express"
      ? 149
      : 0;

  const total =
    subtotal + shippingCharge;

  // ============================================
  // HELPERS
  // ============================================

  const formatPrice = (value) => {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN")}`;
  };

  const getItemImage = (item) => {
    if (item.image) {
      return item.image;
    }

    if (
      Array.isArray(item.images) &&
      item.images.length > 0
    ) {
      const firstImage =
        item.images[0];

      if (
        typeof firstImage ===
        "string"
      ) {
        return firstImage;
      }

      return firstImage?.url || "";
    }

    return "";
  };

  const getItemName = (item) => {
    return (
      item.name ||
      "GETSUKA PRODUCT"
    );
  };

  const getItemVariant = (item) => {
    const details = [];

    if (item.size) {
      details.push(
        `Size: ${item.size}`
      );
    }

    if (item.color) {
      details.push(
        `Color: ${item.color}`
      );
    }

    if (details.length > 0) {
      return details.join(" | ");
    }

    return "Standard";
  };

  // ============================================
  // SELECT ADDRESS
  // ============================================

  const handleAddressSelect = (
    addressId
  ) => {
    setSelectedAddressId(
      addressId
    );

    setError("");
  };

  // ============================================
  // OPEN ADDRESS MODAL
  // ============================================

  const openAddressModal = () => {
    setAddressForm({
      fullName: "",
      phone: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      isDefault:
        addresses.length === 0,
    });

    setAddressError("");
    setShowAddressModal(true);
  };

  // ============================================
  // CLOSE ADDRESS MODAL
  // ============================================

  const closeAddressModal = () => {
    if (savingAddress) {
      return;
    }

    setShowAddressModal(false);
    setAddressError("");
  };

  // ============================================
  // ADDRESS INPUT
  // ============================================

  const handleAddressChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setAddressForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setAddressError("");
  };

  // ============================================
  // SAVE NEW ADDRESS
  // ============================================

  const handleSaveAddress = async (
    e
  ) => {
    e.preventDefault();

    setAddressError("");

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !addressForm.fullName.trim()
    ) {
      setAddressError(
        "Full name is required."
      );

      return;
    }

    if (
      !/^\d{10}$/.test(
        addressForm.phone.trim()
      )
    ) {
      setAddressError(
        "Phone number must be exactly 10 digits."
      );

      return;
    }

    if (
      !addressForm.addressLine.trim()
    ) {
      setAddressError(
        "Address is required."
      );

      return;
    }

    if (
      !addressForm.city.trim()
    ) {
      setAddressError(
        "City is required."
      );

      return;
    }

    if (
      !addressForm.state.trim()
    ) {
      setAddressError(
        "State is required."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        addressForm.pincode.trim()
      )
    ) {
      setAddressError(
        "Pincode must be exactly 6 digits."
      );

      return;
    }

    // ========================================
    // PAYLOAD
    // ========================================

    const payload = {
      fullName:
        addressForm.fullName.trim(),

      phone:
        addressForm.phone.trim(),

      addressLine:
        addressForm.addressLine.trim(),

      city:
        addressForm.city.trim(),

      state:
        addressForm.state.trim(),

      pincode:
        addressForm.pincode.trim(),

      isDefault:
        addressForm.isDefault,
    };

    try {
      setSavingAddress(true);

      const data =
        await addAddress(payload);

      if (!data.success) {
        setAddressError(
          data.message ||
            "Failed to add address."
        );

        return;
      }

      const newAddress =
        data.address;

      // ========================================
      // UPDATE CHECKOUT ADDRESS LIST
      // ========================================

      setAddresses((previous) => {
        let updated =
          previous;

        if (
          newAddress.isDefault
        ) {
          updated =
            previous.map(
              (address) => ({
                ...address,
                isDefault: false,
              })
            );
        }

        return [
          newAddress,
          ...updated,
        ];
      });

      // ========================================
      // AUTO SELECT NEW ADDRESS
      // ========================================

      setSelectedAddressId(
        newAddress._id
      );

      // ========================================
      // CLOSE MODAL
      // ========================================

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
    } catch (error) {
      console.error(
        "Add Checkout Address Error:",
        error
      );

      setAddressError(
        error.response?.data
          ?.message ||
          error.message ||
          "Failed to add address."
      );
    } finally {
      setSavingAddress(false);
    }
  };

  // ============================================
  // CONTINUE TO REVIEW
  // ============================================

  const handleContinue = () => {
    setError("");

    if (
      cartItems.length === 0
    ) {
      setError(
        "Your cart is empty."
      );

      return;
    }

    if (!selectedAddressId) {
      setError(
        "Please select a delivery address."
      );

      return;
    }

    const selectedAddress =
      addresses.find(
        (address) =>
          String(address._id) ===
          String(
            selectedAddressId
          )
      );

    if (!selectedAddress) {
      setError(
        "Selected address is no longer available."
      );

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
        JSON.stringify(
          checkoutData
        )
      );
    } catch (error) {
      console.error(
        "Save Checkout Data Error:",
        error
      );
    }

    // SHIPPING → REVIEW
    navigate(
      "/checkout/review"
    );
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] text-white/50">
          LOADING CHECKOUT...
        </p>
      </div>
    );
  }

  // ============================================
  // PAGE
  // ============================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ======================================
          CHECKOUT STEPS
      ====================================== */}

      <div className="border-b border-white/10">
        <div className="max-w-[1500px] mx-auto px-[32px] py-[24px]">

          <div className="flex items-center gap-4 text-[9px] tracking-[0.22em]">

            <span className="text-white">
              CART
            </span>

            <span className="text-white/25">
              /
            </span>

            <span className="text-red-500">
              SHIPPING
            </span>

            <span className="text-white/25">
              /
            </span>

            <span className="text-white/30">
              REVIEW
            </span>

            <span className="text-white/25">
              /
            </span>

            <span className="text-white/30">
              PAYMENT
            </span>

            <span className="text-white/25">
              /
            </span>

            <span className="text-white/30">
              SUCCESS
            </span>

          </div>

        </div>
      </div>

      {/* ======================================
          MAIN
      ====================================== */}

      <main className="bg-black px-[32px] py-[55px]">

        <div className="max-w-[1500px] mx-auto">

          <div className="mb-[48px]">

            <p className="text-[9px] tracking-[0.35em] text-white/35 mb-[14px]">
              GETSUKA CHECKOUT
            </p>

            <h1 className="text-[30px] font-light tracking-[0.12em]">
              SHIPPING
            </h1>

            <p className="text-[11px] text-white/35 mt-[12px]">
              Select your delivery
              address and preferred
              delivery method.
            </p>

          </div>

          <div className="grid grid-cols-[1fr_390px] gap-[60px]">

            {/* ==================================
                LEFT
            ================================== */}

            <section>

              {/* DELIVERY ADDRESS */}

              <div>

                <div className="flex items-center justify-between mb-[22px]">

                  <div>

                    <p className="text-[9px] tracking-[0.25em] text-white/30 mb-[8px]">
                      STEP 01
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      DELIVERY ADDRESS
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      openAddressModal
                    }
                    className="text-[9px] tracking-[0.18em] text-red-500 hover:text-red-400 transition"
                  >
                    ADD NEW
                  </button>

                </div>

                {addresses.length ===
                0 ? (
                  <div className="border border-white/10 bg-black min-h-[190px] flex flex-col items-center justify-center">

                    <p className="text-[10px] tracking-[0.15em] text-white/30 mb-[22px]">
                      NO SAVED ADDRESSES
                    </p>

                    <button
                      type="button"
                      onClick={
                        openAddressModal
                      }
                      className="h-[44px] px-[28px] border border-white text-white text-[9px] tracking-[0.18em] hover:bg-white hover:text-black transition"
                    >
                      ADD NEW ADDRESS
                    </button>

                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-[12px]">

                    {addresses.map(
                      (address) => {
                        const isSelected =
                          String(
                            selectedAddressId
                          ) ===
                          String(
                            address._id
                          );

                        return (
                          <button
                            key={
                              address._id
                            }
                            type="button"
                            onClick={() =>
                              handleAddressSelect(
                                address._id
                              )
                            }
                            className={`text-left min-h-[190px] p-[22px] border bg-black transition ${
                              isSelected
                                ? "border-red-500"
                                : "border-white/10 hover:border-white/30"
                            }`}
                          >

                            <div className="flex items-start justify-between">

                              <div>

                                <h3 className="text-[12px] uppercase tracking-[0.08em]">
                                  {
                                    address.fullName
                                  }
                                </h3>

                                {address.isDefault && (
                                  <span className="inline-block mt-[10px] text-[8px] tracking-[0.16em] text-red-500 border border-red-500/50 px-[8px] py-[4px]">
                                    DEFAULT
                                  </span>
                                )}

                              </div>

                              <span
                                className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-red-500"
                                    : "border-white/30"
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-[7px] h-[7px] rounded-full bg-red-500" />
                                )}
                              </span>

                            </div>

                            <div className="mt-[22px] text-[10px] text-white/45 leading-[1.9]">

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
                                }
                              </p>

                              <p>
                                {
                                  address.pincode
                                }
                              </p>

                            </div>

                            <div className="border-t border-white/10 mt-[16px] pt-[13px]">

                              <p className="text-[9px] text-white/40">
                                {
                                  address.phone
                                }
                              </p>

                            </div>

                          </button>
                        );
                      }
                    )}

                    {/* ADD NEW CARD */}

                    <button
                      type="button"
                      onClick={
                        openAddressModal
                      }
                      className="min-h-[190px] border border-dashed border-white/15 bg-black flex flex-col items-center justify-center hover:border-white/30 transition"
                    >

                      <span className="text-[25px] font-light text-white/40 mb-[12px]">
                        +
                      </span>

                      <span className="text-[9px] tracking-[0.2em] text-white/40">
                        ADD NEW ADDRESS
                      </span>

                    </button>

                  </div>
                )}

              </div>

              {/* ==================================
                  DELIVERY METHOD
              ================================== */}

              <div className="mt-[55px]">

                <div className="mb-[22px]">

                  <p className="text-[9px] tracking-[0.25em] text-white/30 mb-[8px]">
                    STEP 02
                  </p>

                  <h2 className="text-[17px] font-light tracking-[0.12em]">
                    DELIVERY METHOD
                  </h2>

                </div>

                <div className="space-y-[10px]">

                  {/* STANDARD */}

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMethod(
                        "standard"
                      )
                    }
                    className={`w-full min-h-[76px] px-[22px] border bg-black flex items-center justify-between transition ${
                      deliveryMethod ===
                      "standard"
                        ? "border-red-500"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center ${
                          deliveryMethod ===
                          "standard"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >
                        {deliveryMethod ===
                          "standard" && (
                          <span className="w-[7px] h-[7px] rounded-full bg-red-500" />
                        )}
                      </span>

                      <div className="text-left">

                        <p className="text-[10px] tracking-[0.08em]">
                          STANDARD DELIVERY
                        </p>

                        <p className="text-[9px] text-white/35 mt-[6px]">
                          5–7 BUSINESS DAYS
                        </p>

                      </div>

                    </div>

                    <span className="text-[10px] text-red-500">
                      FREE
                    </span>

                  </button>

                  {/* EXPRESS */}

                  <button
                    type="button"
                    onClick={() =>
                      setDeliveryMethod(
                        "express"
                      )
                    }
                    className={`w-full min-h-[76px] px-[22px] border bg-black flex items-center justify-between transition ${
                      deliveryMethod ===
                      "express"
                        ? "border-red-500"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center ${
                          deliveryMethod ===
                          "express"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >
                        {deliveryMethod ===
                          "express" && (
                          <span className="w-[7px] h-[7px] rounded-full bg-red-500" />
                        )}
                      </span>

                      <div className="text-left">

                        <p className="text-[10px] tracking-[0.08em]">
                          EXPRESS DELIVERY
                        </p>

                        <p className="text-[9px] text-white/35 mt-[6px]">
                          2–3 BUSINESS DAYS
                        </p>

                      </div>

                    </div>

                    <span className="text-[10px]">
                      ₹149
                    </span>

                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-[25px] border border-red-500/30 px-[18px] py-[15px]">

                  <p className="text-[10px] text-red-500">
                    {error}
                  </p>

                </div>
              )}

            </section>

            {/* ==================================
                ORDER SUMMARY
            ================================== */}

            <aside className="h-fit border border-white/10 bg-black">

              <div className="p-[25px]">

                <div className="flex items-center justify-between">

                  <h2 className="text-[15px] font-light tracking-[0.14em]">
                    ORDER SUMMARY
                  </h2>

                  <span className="text-[9px] text-white/30 tracking-[0.15em]">
                    {cartItems.length} ITEMS
                  </span>

                </div>

                <div className="mt-[25px]">

                  {cartItems.length ===
                  0 ? (
                    <p className="text-[10px] text-white/30 py-[20px]">
                      YOUR CART IS EMPTY
                    </p>
                  ) : (
                    <div className="space-y-[18px]">

                      {cartItems.map(
                        (
                          item,
                          index
                        ) => {
                          const image =
                            getItemImage(
                              item
                            );

                          const quantity =
                            Number(
                              item.quantity ||
                                1
                            );

                          return (
                            <div
                              key={`${
                                item.productId ||
                                item._id ||
                                index
                              }-${
                                item.variantId ||
                                ""
                              }`}
                              className="flex gap-[12px]"
                            >

                              <div className="w-[65px] h-[80px] bg-black border border-white/10 shrink-0 overflow-hidden">

                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt={getItemName(
                                      item
                                    )}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] tracking-[0.15em] text-white/20">
                                    GETSUKA
                                  </div>
                                )}

                              </div>

                              <div className="flex-1 min-w-0">

                                <p className="text-[9px] tracking-[0.08em] uppercase truncate">
                                  {getItemName(
                                    item
                                  )}
                                </p>

                                <p className="text-[8px] text-white/30 mt-[5px]">
                                  {getItemVariant(
                                    item
                                  )}
                                </p>

                                <div className="flex justify-between items-center mt-[12px]">

                                  <span className="text-[8px] text-white/30">
                                    QTY{" "}
                                    {
                                      quantity
                                    }
                                  </span>

                                  <span className="text-[9px]">
                                    {formatPrice(
                                      Number(
                                        item.price ||
                                          0
                                      ) *
                                        quantity
                                    )}
                                  </span>

                                </div>

                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>

                <div className="border-t border-white/10 mt-[25px] pt-[20px]">

                  <div className="flex justify-between mb-[14px] text-[10px]">

                    <span className="text-white/35">
                      SUBTOTAL
                    </span>

                    <span>
                      {formatPrice(
                        subtotal
                      )}
                    </span>

                  </div>

                  <div className="flex justify-between text-[10px]">

                    <span className="text-white/35">
                      SHIPPING
                    </span>

                    <span
                      className={
                        shippingCharge ===
                        0
                          ? "text-red-500"
                          : "text-white"
                      }
                    >
                      {shippingCharge ===
                      0
                        ? "FREE"
                        : formatPrice(
                            shippingCharge
                          )}
                    </span>

                  </div>

                </div>

                <div className="border-t border-white/10 mt-[20px] pt-[20px] flex items-center justify-between">

                  <span className="text-[10px] tracking-[0.16em]">
                    TOTAL
                  </span>

                  <span className="text-[16px] text-red-500">
                    {formatPrice(
                      total
                    )}
                  </span>

                </div>

                <button
                  type="button"
                  onClick={
                    handleContinue
                  }
                  disabled={
                    cartItems.length ===
                    0
                  }
                  className="w-full h-[50px] mt-[28px] bg-white text-black text-[9px] tracking-[0.2em] hover:bg-red-500 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  CONTINUE TO REVIEW
                  <span className="ml-[12px]">
                    →
                  </span>
                </button>

                <p className="text-center text-[8px] text-white/20 mt-[14px] tracking-[0.12em]">
                  SECURE CHECKOUT
                </p>

              </div>

            </aside>

          </div>

        </div>

      </main>

      {/* ========================================
          ADD ADDRESS MODAL
      ======================================== */}

      {showAddressModal && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center px-[20px] py-[30px]"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeAddressModal();
            }
          }}
        >

          <div className="w-full max-w-[650px] max-h-[90vh] overflow-y-auto bg-black border border-white/15">

            {/* MODAL HEADER */}

            <div className="px-[30px] py-[24px] border-b border-white/10 flex items-center justify-between">

              <div>

                <p className="text-[9px] tracking-[0.28em] text-white/35 mb-[8px]">
                  DELIVERY
                </p>

                <h2 className="text-[21px] font-light tracking-[0.08em]">
                  ADD NEW ADDRESS
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeAddressModal
                }
                disabled={
                  savingAddress
                }
                className="text-[25px] font-light text-white/40 hover:text-white transition disabled:opacity-30"
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSaveAddress
              }
              className="px-[30px] py-[30px]"
            >

              <div className="grid grid-cols-2 gap-[20px]">

                {/* FULL NAME */}

                <div>

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    FULL NAME
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={
                      addressForm.fullName
                    }
                    onChange={
                      handleAddressChange
                    }
                    placeholder="Full name"
                    className="w-full h-[46px] bg-black border border-white/15 px-[13px] text-[11px] text-white outline-none focus:border-white transition placeholder:text-white/20"
                  />

                </div>

                {/* PHONE */}

                <div>

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    PHONE
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      addressForm.phone
                    }
                    onChange={
                      handleAddressChange
                    }
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="10 digit phone"
                    className="w-full h-[46px] bg-black border border-white/15 px-[13px] text-[11px] text-white outline-none focus:border-white transition placeholder:text-white/20"
                  />

                </div>

                {/* ADDRESS */}

                <div className="col-span-2">

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    ADDRESS
                  </label>

                  <textarea
                    name="addressLine"
                    value={
                      addressForm.addressLine
                    }
                    onChange={
                      handleAddressChange
                    }
                    rows={3}
                    placeholder="House / Flat / Street / Area"
                    className="w-full bg-black border border-white/15 px-[13px] py-[12px] text-[11px] text-white outline-none focus:border-white transition resize-none placeholder:text-white/20"
                  />

                </div>

                {/* CITY */}

                <div>

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    CITY
                  </label>

                  <input
                    type="text"
                    name="city"
                    value={
                      addressForm.city
                    }
                    onChange={
                      handleAddressChange
                    }
                    placeholder="City"
                    className="w-full h-[46px] bg-black border border-white/15 px-[13px] text-[11px] text-white outline-none focus:border-white transition placeholder:text-white/20"
                  />

                </div>

                {/* STATE */}

                <div>

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    STATE
                  </label>

                  <input
                    type="text"
                    name="state"
                    value={
                      addressForm.state
                    }
                    onChange={
                      handleAddressChange
                    }
                    placeholder="State"
                    className="w-full h-[46px] bg-black border border-white/15 px-[13px] text-[11px] text-white outline-none focus:border-white transition placeholder:text-white/20"
                  />

                </div>

                {/* PINCODE */}

                <div>

                  <label className="block text-[9px] tracking-[0.16em] text-white/40 mb-[9px]">
                    PINCODE
                  </label>

                  <input
                    type="text"
                    name="pincode"
                    value={
                      addressForm.pincode
                    }
                    onChange={
                      handleAddressChange
                    }
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6 digit pincode"
                    className="w-full h-[46px] bg-black border border-white/15 px-[13px] text-[11px] text-white outline-none focus:border-white transition placeholder:text-white/20"
                  />

                </div>

                {/* DEFAULT */}

                <div className="flex items-center">

                  <label className="flex items-center gap-[10px] cursor-pointer">

                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={
                        addressForm.isDefault
                      }
                      onChange={
                        handleAddressChange
                      }
                      className="w-[14px] h-[14px] accent-red-500"
                    />

                    <span className="text-[9px] tracking-[0.12em] text-white/45">
                      SET AS DEFAULT
                    </span>

                  </label>

                </div>

              </div>

              {/* ERROR */}

              {addressError && (
                <div className="mt-[20px] border border-red-500/30 px-[14px] py-[12px]">

                  <p className="text-[10px] text-red-500">
                    {addressError}
                  </p>

                </div>
              )}

              {/* ACTIONS */}

              <div className="flex justify-end gap-[10px] mt-[25px]">

                <button
                  type="button"
                  onClick={
                    closeAddressModal
                  }
                  disabled={
                    savingAddress
                  }
                  className="h-[44px] px-[24px] border border-white/15 text-[9px] tracking-[0.15em] text-white/60 hover:border-white hover:text-white transition disabled:opacity-30"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={
                    savingAddress
                  }
                  className="h-[44px] px-[25px] bg-white text-black text-[9px] tracking-[0.15em] hover:bg-red-500 hover:text-white transition disabled:opacity-40"
                >
                  {savingAddress
                    ? "SAVING..."
                    : "SAVE ADDRESS"}
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