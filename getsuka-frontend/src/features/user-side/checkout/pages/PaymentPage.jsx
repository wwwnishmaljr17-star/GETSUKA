import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../../orders/api/orderApi";

const PaymentPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // CHECKOUT DATA
  // =========================================================

  const [checkoutData, setCheckoutData] =
    useState(null);

  const [checkoutLoading, setCheckoutLoading] =
    useState(true);

  const selectedAddress =
    checkoutData?.selectedAddress || null;

  const deliveryMethod =
    checkoutData?.deliveryMethod ||
    "standard";

  const shippingCost =
    Number(
      checkoutData?.shippingCharge ??
        (deliveryMethod === "express"
          ? 149
          : 0)
    ) || 0;

  // =========================================================
  // PAYMENT STATE
  // =========================================================

  const [paymentMethod, setPaymentMethod] =
    useState("upi");

  const [upiId, setUpiId] =
    useState("");

  const [upiVerified, setUpiVerified] =
    useState(false);

  const [cardNumber, setCardNumber] =
    useState("");

  const [cardName, setCardName] =
    useState("");

  const [cardExpiry, setCardExpiry] =
    useState("");

  const [cardCvv, setCardCvv] =
    useState("");

  const [selectedBank, setSelectedBank] =
    useState("");

  const [error, setError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  // =========================================================
  // CART
  // =========================================================

  const [cartItems, setCartItems] =
    useState([]);

  useEffect(() => {
    try {
      const storedCart =
        localStorage.getItem(
          "getsukaCart"
        );

      if (!storedCart) {
        setCartItems([]);
        return;
      }

      const parsedCart =
        JSON.parse(storedCart);

      if (Array.isArray(parsedCart)) {
        setCartItems(parsedCart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error(
        "Payment Cart Error:",
        error
      );

      setCartItems([]);
    }
  }, []);

  // =========================================================
  // LOAD REVIEW DATA
  // =========================================================

  useEffect(() => {
    const loadCheckoutData = () => {
      try {
        /*
         * IMPORTANT
         *
         * ReviewPage stores the final shipping
         * information here before entering payment.
         */

        const savedReview =
          sessionStorage.getItem(
            "getsukaCheckoutReview"
          );

        if (!savedReview) {
          setCheckoutData(null);
          return;
        }

        const parsedReview =
          JSON.parse(savedReview);

        const selectedAddress =
          parsedReview?.selectedAddress ||
          parsedReview?.address ||
          null;

        setCheckoutData({
          ...parsedReview,
          selectedAddress,
        });

        // Restore payment data if user
        // comes back to this page.
        const savedPayment =
          sessionStorage.getItem(
            "getsukaCheckoutPayment"
          );

        if (savedPayment) {
          try {
            const paymentData =
              JSON.parse(savedPayment);

            if (
              paymentData?.paymentMethod
            ) {
              setPaymentMethod(
                paymentData.paymentMethod
              );
            }

            if (
              paymentData?.upiId
            ) {
              setUpiId(
                paymentData.upiId
              );
            }

            if (
              paymentData?.upiVerified
            ) {
              setUpiVerified(true);
            }

            if (
              paymentData?.selectedBank
            ) {
              setSelectedBank(
                paymentData.selectedBank
              );
            }
          } catch (error) {
            console.error(
              "Payment Storage Parse Error:",
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "Load Checkout Data Error:",
          error
        );

        setCheckoutData(null);
      } finally {
        setCheckoutLoading(false);
      }
    };

    loadCheckoutData();
  }, []);

  // =========================================================
  // SUBTOTAL
  // =========================================================

  const subtotal = useMemo(() => {
    if (
      checkoutData?.subtotal !==
      undefined
    ) {
      return (
        Number(
          checkoutData.subtotal
        ) || 0
      );
    }

    return cartItems.reduce(
      (total, item) => {
        const price =
          Number(
            item?.price || 0
          );

        const quantity =
          Number(
            item?.quantity || 1
          );

        return (
          total +
          price * quantity
        );
      },
      0
    );
  }, [
    cartItems,
    checkoutData,
  ]);

  // =========================================================
  // DISCOUNT
  // =========================================================

  const discount =
    Number(
      checkoutData?.discount ||
        checkoutData?.discountAmount ||
        0
    ) || 0;

  // =========================================================
  // TAX
  // =========================================================

  const tax =
    Number(
      checkoutData?.tax ||
        checkoutData?.taxAmount ||
        0
    ) || 0;

  // =========================================================
  // TOTAL
  // =========================================================

  const total =
    Number(
      checkoutData?.total
    ) ||
    subtotal -
      discount +
      tax +
      shippingCost;

  // =========================================================
  // HELPERS
  // =========================================================

  const formatPrice = (value) => {
    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN"
    )}`;
  };

  const getProductName = (
    item
  ) => {
    return (
      item?.name ||
      item?.productName ||
      item?.product?.name ||
      item?.title ||
      "GETSUKA PRODUCT"
    );
  };

  const getProductImage = (
    item
  ) => {
    if (item?.image) {
      return item.image;
    }

    if (
      Array.isArray(
        item?.images
      ) &&
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

      return (
        firstImage?.url ||
        firstImage?.secure_url ||
        ""
      );
    }

    if (
      Array.isArray(
        item?.product?.images
      ) &&
      item.product.images.length >
        0
    ) {
      const firstImage =
        item.product.images[0];

      if (
        typeof firstImage ===
        "string"
      ) {
        return firstImage;
      }

      return (
        firstImage?.url ||
        firstImage?.secure_url ||
        ""
      );
    }

    return (
      item?.imageUrl ||
      item?.product?.image ||
      item?.product?.imageUrl ||
      ""
    );
  };

  const getProductPrice = (
    item
  ) => {
    return Number(
      item?.price ??
        item?.productPrice ??
        item?.product?.price ??
        item?.sellingPrice ??
        item?.product?.sellingPrice ??
        0
    );
  };

  const getQuantity = (
    item
  ) => {
    return Number(
      item?.quantity ??
        item?.qty ??
        1
    );
  };

  const getSize = (
    item
  ) => {
    return (
      item?.size ||
      item?.selectedSize ||
      item?.variant?.size ||
      "—"
    );
  };

  const getColor = (
    item
  ) => {
    return (
      item?.color ||
      item?.selectedColor ||
      item?.variant?.color ||
      "—"
    );
  };

  // =========================================================
  // PAYMENT METHOD
  // =========================================================

  const handlePaymentMethodChange =
    (method) => {
      setPaymentMethod(method);
      setError("");

      if (method !== "upi") {
        setUpiVerified(false);
      }
    };

  // =========================================================
  // VERIFY UPI
  // =========================================================

  const handleVerifyUpi = () => {
    setError("");

    if (!upiId.trim()) {
      setError(
        "Please enter your UPI ID."
      );

      return;
    }

    const upiPattern =
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

    if (
      !upiPattern.test(
        upiId.trim()
      )
    ) {
      setError(
        "Please enter a valid UPI ID."
      );

      return;
    }

    /*
     * This is only frontend validation.
     *
     * Real UPI verification will be
     * connected with the payment gateway
     * and backend later.
     */

    setUpiVerified(true);
  };

  // =========================================================
  // CARD VALIDATION
  // =========================================================

  const validateCard = () => {
    const cleanCardNumber =
      cardNumber.replace(
        /\s/g,
        ""
      );

    if (
      !/^\d{12,19}$/.test(
        cleanCardNumber
      )
    ) {
      return (
        "Please enter a valid card number."
      );
    }

    if (!cardName.trim()) {
      return (
        "Please enter the name on your card."
      );
    }

    if (
      !/^\d{2}\s*\/\s*\d{2}$/.test(
        cardExpiry.trim()
      )
    ) {
      return (
        "Please enter a valid expiry date."
      );
    }

    if (
      !/^\d{3,4}$/.test(
        cardCvv.trim()
      )
    ) {
      return (
        "Please enter a valid CVV."
      );
    }

    return "";
  };

  // =========================================================
  // PLACE ORDER
  // =========================================================

  const handlePlaceOrder =
    async () => {
      setError("");

      // -------------------------------------------------------
      // ADDRESS
      // -------------------------------------------------------

      if (!selectedAddress) {
        setError(
          "Shipping address is missing."
        );

        return;
      }

      // -------------------------------------------------------
      // CART
      // -------------------------------------------------------

      if (
        cartItems.length === 0
      ) {
        setError(
          "Your cart is empty."
        );

        return;
      }

      // -------------------------------------------------------
      // UPI
      // -------------------------------------------------------

      if (
        paymentMethod ===
        "upi"
      ) {
        if (!upiVerified) {
          setError(
            "Please verify your UPI ID."
          );

          return;
        }
      }

      // -------------------------------------------------------
      // CARD
      // -------------------------------------------------------

      if (
        paymentMethod ===
        "card"
      ) {
        const cardError =
          validateCard();

        if (cardError) {
          setError(
            cardError
          );

          return;
        }
      }

      // -------------------------------------------------------
      // NET BANKING
      // -------------------------------------------------------

      if (
        paymentMethod ===
        "netbanking"
      ) {
        if (!selectedBank) {
          setError(
            "Please select your bank."
          );

          return;
        }
      }

      // -------------------------------------------------------
      // SAVE PAYMENT DATA
      // -------------------------------------------------------

      const paymentData = {
        paymentMethod,

        upiId:
          paymentMethod ===
          "upi"
            ? upiId.trim()
            : "",

        upiVerified:
          paymentMethod ===
          "upi"
            ? upiVerified
            : false,

        selectedBank:
          paymentMethod ===
          "netbanking"
            ? selectedBank
            : "",

        selectedAddress,

        deliveryMethod,

        shippingCharge:
          shippingCost,

        subtotal,

        discount,

        tax,

        total,
      };

      try {
        sessionStorage.setItem(
          "getsukaCheckoutPayment",
          JSON.stringify(
            paymentData
          )
        );
      } catch (error) {
        console.error(
          "Save Payment Data Error:",
          error
        );

        setError(
          "Unable to save payment details."
        );

        return;
      }

      /*
       * BACKEND ORDER CREATION
       *
       * We will connect this button to the
       * actual order API next.
       *
       * For now, the complete frontend
       * checkout flow continues to success.
       */

      try {
        setProcessing(true);

        const orderItems = cartItems.map((item) => {
          const productId =
            item?.productId ||
            item?.product?._id ||
            item?._id;

          const variantId =
            item?.variantId ||
            item?.variant?._id ||
            item?.selectedVariantId;

          const quantity = getQuantity(item);

          if (!productId || !variantId) {
            throw new Error(
              "Product or variant information is missing from the cart."
            );
          }

          return {
            productId,
            variantId,
            quantity,
          };
        });

        const orderData = {
          items: orderItems,
          addressId:
            selectedAddress?._id ||
            selectedAddress?.id,
          deliveryMethod,
          paymentMethod,
          couponCode:
            checkoutData?.couponCode || "",
          discount,
          tax,
        };

        const response = await createOrder(orderData);

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to create your order."
          );
        }

        const createdOrder =
          response?.order ||
          response?.data ||
          response;

        sessionStorage.setItem(
          "getsukaOrder",
          JSON.stringify(createdOrder)
        );

        localStorage.removeItem("getsukaCart");

        window.dispatchEvent(
          new Event("cartUpdated")
        );

        navigate(
          "/checkout/order-placed",
          {
            state: {
              order: createdOrder,
            },
          }
        );
      } catch (error) {
        console.error(
          "Place Order Error:",
          error
        );

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Something went wrong while placing your order."
        );

        setProcessing(false);
      }
    };

  // =========================================================
  // BACK TO REVIEW
  // =========================================================

  const handleBackToReview =
    () => {
      navigate(
        "/checkout/review"
      );
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (checkoutLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">

        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40">
          LOADING PAYMENT...
        </p>

      </div>
    );
  }

  // =========================================================
  // CHECKOUT DATA MISSING
  // =========================================================

  if (
    !checkoutData ||
    !selectedAddress
  ) {
    return (
      <div className="min-h-screen bg-black text-white">

        <div className="flex min-h-screen flex-col items-center justify-center">

          <p className="text-[9px] uppercase tracking-[0.3em] text-white/40">
            CHECKOUT INFORMATION
            MISSING
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/checkout"
              )
            }
            className="mt-6 border border-white px-7 py-3 text-[8px] uppercase tracking-[0.2em] transition hover:bg-white hover:text-black"
          >
            BACK TO SHIPPING
          </button>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          CHECKOUT STEPS
      ===================================================== */}

      <div className="border-b border-white/10">

        <div className="mx-auto max-w-[1500px] px-[32px] py-[24px]">

          <div className="flex items-center gap-4 text-[9px] tracking-[0.22em]">

            <span className="text-white">
              CART
            </span>

            <span className="text-white/25">
              /
            </span>

            <span className="text-white/30">
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

            <span className="text-red-500">
              PAYMENT
            </span>

          </div>

        </div>

      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="bg-black px-[32px] py-[55px]">

        <div className="mx-auto max-w-[1500px]">

          {/* PAGE TITLE */}

          <div className="mb-[48px]">

            <p className="mb-[14px] text-[9px] tracking-[0.35em] text-white/35">
              GETSUKA CHECKOUT
            </p>

            <h1 className="text-[30px] font-light tracking-[0.12em]">
              PAYMENT
            </h1>

            <p className="mt-[12px] text-[11px] text-white/35">
              Select your preferred
              payment method to
              complete your order.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-[30px] border border-red-500/40 bg-black px-[20px] py-[14px]">

              <p className="text-[9px] tracking-[0.08em] text-red-500">
                {error}
              </p>

            </div>
          )}

          {/* CONTENT */}

          <div className="grid grid-cols-[1fr_390px] gap-[60px]">

            {/* =================================================
                LEFT
            ================================================= */}

            <section>

              {/* PAYMENT METHOD */}

              <div>

                <div className="mb-[22px] flex items-center justify-between">

                  <div>

                    <p className="mb-[8px] text-[9px] tracking-[0.25em] text-white/30">
                      STEP 04
                    </p>

                    <h2 className="text-[17px] font-light tracking-[0.12em]">
                      PAYMENT METHOD
                    </h2>

                  </div>

                </div>

                {/* =================================================
                    UPI
                ================================================= */}

                <div
                  className={`border ${
                    paymentMethod ===
                    "upi"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "upi"
                      )
                    }
                    className="flex w-full items-center justify-between px-[24px] py-[20px]"
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`flex h-[12px] w-[12px] items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "upi"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "upi" && (
                          <span className="h-[5px] w-[5px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <span className="text-[10px] tracking-[0.12em]">
                        UPI
                      </span>

                    </div>

                    <span className="text-[8px] tracking-[0.15em] text-white/30">
                      UPI
                    </span>

                  </button>

                  {paymentMethod ===
                    "upi" && (
                    <div className="border-t border-white/10 px-[24px] py-[20px]">

                      <p className="mb-[10px] text-[9px] tracking-[0.18em] text-white/30">
                        UPI ID
                      </p>

                      <div className="flex gap-[10px]">

                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => {
                            setUpiId(
                              e.target.value
                            );

                            setUpiVerified(
                              false
                            );

                            setError("");
                          }}
                          placeholder="example@upi"
                          className="h-[42px] flex-1 border border-white/15 bg-black px-[14px] text-[10px] text-white outline-none placeholder:text-white/20 focus:border-red-500"
                        />

                        <button
                          type="button"
                          onClick={
                            handleVerifyUpi
                          }
                          className={`h-[42px] border px-[20px] text-[8px] tracking-[0.15em] transition ${
                            upiVerified
                              ? "border-red-500 text-red-500"
                              : "border-white/40 hover:bg-white hover:text-black"
                          }`}
                        >
                          {upiVerified
                            ? "VERIFIED"
                            : "VERIFY"}
                        </button>

                      </div>

                      <p className="mt-[10px] text-[8px] text-white/25">
                        UPI verification
                        will be connected
                        with the payment
                        gateway later.
                      </p>

                    </div>
                  )}

                </div>

                {/* =================================================
                    CARD
                ================================================= */}

                <div
                  className={`mt-[8px] border ${
                    paymentMethod ===
                    "card"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "card"
                      )
                    }
                    className="flex w-full items-center justify-between px-[24px] py-[20px]"
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`flex h-[12px] w-[12px] items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "card"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "card" && (
                          <span className="h-[5px] w-[5px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <span className="text-[10px] tracking-[0.12em]">
                        CREDIT / DEBIT CARD
                      </span>

                    </div>

                    <span className="text-white/30">
                      ▤
                    </span>

                  </button>

                  {paymentMethod ===
                    "card" && (
                    <div className="border-t border-white/10 px-[24px] py-[20px]">

                      <div className="grid gap-[10px]">

                        <input
                          type="text"
                          value={
                            cardNumber
                          }
                          onChange={(e) =>
                            setCardNumber(
                              e.target.value
                            )
                          }
                          placeholder="CARD NUMBER"
                          maxLength={19}
                          inputMode="numeric"
                          className="h-[42px] border border-white/15 bg-black px-[14px] text-[10px] outline-none placeholder:text-white/20 focus:border-red-500"
                        />

                        <input
                          type="text"
                          value={
                            cardName
                          }
                          onChange={(e) =>
                            setCardName(
                              e.target.value
                            )
                          }
                          placeholder="NAME ON CARD"
                          className="h-[42px] border border-white/15 bg-black px-[14px] text-[10px] uppercase outline-none placeholder:text-white/20 focus:border-red-500"
                        />

                        <div className="grid grid-cols-2 gap-[10px]">

                          <input
                            type="text"
                            value={
                              cardExpiry
                            }
                            onChange={(e) =>
                              setCardExpiry(
                                e.target.value
                              )
                            }
                            placeholder="MM / YY"
                            maxLength={7}
                            className="h-[42px] border border-white/15 bg-black px-[14px] text-[10px] outline-none placeholder:text-white/20 focus:border-red-500"
                          />

                          <input
                            type="password"
                            value={
                              cardCvv
                            }
                            onChange={(e) =>
                              setCardCvv(
                                e.target.value
                              )
                            }
                            placeholder="CVV"
                            maxLength={4}
                            inputMode="numeric"
                            className="h-[42px] border border-white/15 bg-black px-[14px] text-[10px] outline-none placeholder:text-white/20 focus:border-red-500"
                          />

                        </div>

                      </div>

                      <p className="mt-[10px] text-[8px] text-white/25">
                        Card payment will
                        be processed through
                        the payment gateway.
                      </p>

                    </div>
                  )}

                </div>

                {/* =================================================
                    NET BANKING
                ================================================= */}

                <div
                  className={`mt-[8px] border ${
                    paymentMethod ===
                    "netbanking"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "netbanking"
                      )
                    }
                    className="flex w-full items-center justify-between px-[24px] py-[20px]"
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`flex h-[12px] w-[12px] items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "netbanking"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "netbanking" && (
                          <span className="h-[5px] w-[5px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <span className="text-[10px] tracking-[0.12em]">
                        NET BANKING
                      </span>

                    </div>

                    <span className="text-white/30">
                      ♜
                    </span>

                  </button>

                  {paymentMethod ===
                    "netbanking" && (
                    <div className="border-t border-white/10 px-[24px] py-[20px]">

                      <select
                        value={
                          selectedBank
                        }
                        onChange={(e) => {
                          setSelectedBank(
                            e.target.value
                          );

                          setError("");
                        }}
                        className="h-[42px] w-full border border-white/15 bg-black px-[14px] text-[10px] text-white/70 outline-none focus:border-red-500"
                      >

                        <option value="">
                          SELECT YOUR BANK
                        </option>

                        <option value="sbi">
                          STATE BANK OF INDIA
                        </option>

                        <option value="hdfc">
                          HDFC BANK
                        </option>

                        <option value="icici">
                          ICICI BANK
                        </option>

                        <option value="axis">
                          AXIS BANK
                        </option>

                      </select>

                    </div>
                  )}

                </div>

                {/* =================================================
                    COD
                ================================================= */}

                <div
                  className={`mt-[8px] border ${
                    paymentMethod ===
                    "cod"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "cod"
                      )
                    }
                    className="flex w-full items-center justify-between px-[24px] py-[20px]"
                  >

                    <div className="flex items-center gap-[15px]">

                      <span
                        className={`flex h-[12px] w-[12px] items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "cod"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "cod" && (
                          <span className="h-[5px] w-[5px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <span className="text-[10px] tracking-[0.12em]">
                        CASH ON DELIVERY
                      </span>

                    </div>

                    <span className="text-white/30">
                      ▣
                    </span>

                  </button>

                  {paymentMethod ===
                    "cod" && (
                    <div className="border-t border-white/10 px-[24px] py-[16px]">

                      <p className="text-[8px] text-white/30">
                        Pay for your order
                        when it is delivered.
                      </p>

                    </div>
                  )}

                </div>

              </div>

              {/* SECURITY */}

              <div className="mt-[30px] border-t border-white/10 pt-[20px]">

                <p className="text-[8px] tracking-[0.18em] text-white/25">
                  SECURE PAYMENT · GETSUKA
                </p>

              </div>

            </section>

            {/* =================================================
                RIGHT — ORDER SUMMARY
            ================================================= */}

            <aside className="h-fit border border-white/10 bg-black">

              {/* HEADER */}

              <div className="border-b border-white/10 px-[26px] py-[24px]">

                <div className="flex items-center justify-between">

                  <h2 className="text-[15px] font-light tracking-[0.15em]">
                    ORDER SUMMARY
                  </h2>

                  <span className="text-[8px] tracking-[0.15em] text-white/30">
                    {cartItems.length}{" "}
                    {cartItems.length ===
                    1
                      ? "ITEM"
                      : "ITEMS"}
                  </span>

                </div>

              </div>

              {/* PRODUCTS */}

              <div className="max-h-[330px] overflow-y-auto px-[26px]">

                {cartItems.length ===
                0 ? (
                  <div className="py-[30px]">

                    <p className="text-[9px] text-white/30">
                      YOUR CART IS EMPTY
                    </p>

                  </div>
                ) : (
                  cartItems.map(
                    (
                      item,
                      index
                    ) => {
                      const image =
                        getProductImage(
                          item
                        );

                      const price =
                        getProductPrice(
                          item
                        );

                      const quantity =
                        getQuantity(
                          item
                        );

                      return (
                        <div
                          key={
                            item?.productId ||
                            item?._id ||
                            index
                          }
                          className="flex gap-[14px] border-b border-white/10 py-[18px]"
                        >

                          {/* IMAGE */}

                          <div className="h-[72px] w-[58px] shrink-0 overflow-hidden bg-black">

                            {image ? (
                              <img
                                src={
                                  image
                                }
                                alt={getProductName(
                                  item
                                )}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[7px] text-white/20">
                                GETSUKA
                              </div>
                            )}

                          </div>

                          {/* DETAILS */}

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-[10px]">

                              <p className="truncate text-[9px] uppercase tracking-[0.05em]">
                                {getProductName(
                                  item
                                )}
                              </p>

                              <p className="shrink-0 text-[9px]">
                                {formatPrice(
                                  price *
                                    quantity
                                )}
                              </p>

                            </div>

                            <p className="mt-[7px] text-[7px] text-white/30">
                              Size:{" "}
                              {getSize(
                                item
                              )}
                              {" | "}
                              Color:{" "}
                              {getColor(
                                item
                              )}
                            </p>

                            <p className="mt-[7px] text-[7px] text-white/30">
                              QTY:{" "}
                              {quantity}
                            </p>

                          </div>

                        </div>
                      );
                    }
                  )
                )}

              </div>

              {/* TOTALS */}

              <div className="px-[26px] py-[24px]">

                <div className="flex items-center justify-between">

                  <span className="text-[9px] text-white/40">
                    SUBTOTAL
                  </span>

                  <span className="text-[9px]">
                    {formatPrice(
                      subtotal
                    )}
                  </span>

                </div>

                {discount > 0 && (
                  <div className="mt-[15px] flex items-center justify-between">

                    <span className="text-[9px] text-white/40">
                      DISCOUNT
                    </span>

                    <span className="text-[9px] text-red-500">
                      -
                      {formatPrice(
                        discount
                      )}
                    </span>

                  </div>
                )}

                {tax > 0 && (
                  <div className="mt-[15px] flex items-center justify-between">

                    <span className="text-[9px] text-white/40">
                      TAX
                    </span>

                    <span className="text-[9px]">
                      {formatPrice(
                        tax
                      )}
                    </span>

                  </div>
                )}

                <div className="mt-[15px] flex items-center justify-between">

                  <span className="text-[9px] text-white/40">
                    SHIPPING
                  </span>

                  <span
                    className={`text-[9px] ${
                      shippingCost ===
                      0
                        ? "text-red-500"
                        : "text-white"
                    }`}
                  >
                    {shippingCost ===
                    0
                      ? "FREE"
                      : formatPrice(
                          shippingCost
                        )}
                  </span>

                </div>

                <div className="my-[22px] border-t border-white/10" />

                <div className="flex items-center justify-between">

                  <span className="text-[10px] tracking-[0.15em]">
                    TOTAL
                  </span>

                  <div className="flex items-center gap-[8px]">

                    <span className="text-[7px] text-white/30">
                      INR
                    </span>

                    <span className="text-[17px]">
                      {formatPrice(
                        total
                      )}
                    </span>

                  </div>

                </div>

                {/* PLACE ORDER */}

                <button
                  type="button"
                  onClick={
                    handlePlaceOrder
                  }
                  disabled={
                    processing
                  }
                  className="mt-[28px] flex h-[50px] w-full items-center justify-center gap-[10px] bg-white text-[9px] font-medium tracking-[0.2em] text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {processing
                    ? "PROCESSING..."
                    : "PLACE ORDER"}

                  {!processing && (
                    <span>
                      →
                    </span>
                  )}

                </button>

                {/* BACK TO REVIEW */}

                <button
                  type="button"
                  onClick={
                    handleBackToReview
                  }
                  className="mt-[16px] block w-full text-center text-[8px] tracking-[0.18em] text-white/35 transition hover:text-white"
                >
                  ← BACK TO REVIEW
                </button>

              </div>

            </aside>

          </div>

        </div>

      </main>

    </div>
  );
};

export default PaymentPage;