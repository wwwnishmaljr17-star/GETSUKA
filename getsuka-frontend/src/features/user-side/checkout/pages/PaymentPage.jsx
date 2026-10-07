import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { createOrder } from "../../orders/api/orderApi";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api/paymentApi";

import {
  getWallet,
} from "../../wallet/api/walletApi";

import { loadRazorpay } from "../utils/loadRazorpay";

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
    useState("razorpay");

  const [error, setError] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  // =========================================================
  // WALLET STATE
  // =========================================================

  const [walletBalance, setWalletBalance] =
    useState(0);

  const [walletLoading, setWalletLoading] =
    useState(false);

  const [walletLoaded, setWalletLoaded] =
    useState(false);

  // =========================================================
  // CART
  // =========================================================

  const [cartItems, setCartItems] =
    useState([]);

  // =========================================================
  // LOAD CART
  // =========================================================

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
  // LOAD CHECKOUT DATA
  // =========================================================

  useEffect(() => {
    const loadCheckoutData = () => {
      try {
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

        // =====================================================
        // RESTORE PAYMENT METHOD
        // =====================================================

        const savedPayment =
          sessionStorage.getItem(
            "getsukaCheckoutPayment"
          );

        if (savedPayment) {
          try {
            const paymentData =
              JSON.parse(savedPayment);

            if (
              paymentData?.paymentMethod ===
                "razorpay" ||
              paymentData?.paymentMethod ===
                "cod" ||
              paymentData?.paymentMethod ===
                "wallet"
            ) {
              setPaymentMethod(
                paymentData.paymentMethod
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
  // LOAD WALLET BALANCE
  // =========================================================

  useEffect(() => {
    if (paymentMethod !== "wallet") {
      return;
    }

    let cancelled = false;

    const fetchWalletBalance = async () => {
      try {
        setWalletLoading(true);
        setWalletLoaded(false);
        setError("");

        const response =
          await getWallet();

        if (cancelled) {
          return;
        }

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to load wallet balance."
          );
        }

        setWalletBalance(
          Number(
            response?.wallet?.balance
          ) || 0
        );

        setWalletLoaded(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Payment Wallet Error:",
          error
        );

        setWalletBalance(0);
        setWalletLoaded(false);

        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load wallet balance."
        );
      } finally {
        if (!cancelled) {
          setWalletLoading(false);
        }
      }
    };

    fetchWalletBalance();

    return () => {
      cancelled = true;
    };
  }, [paymentMethod]);

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
  // WALLET VALIDATION
  // =========================================================

  const walletInsufficient =
    paymentMethod === "wallet" &&
    walletLoaded &&
    walletBalance < total;

  const walletSufficient =
    paymentMethod === "wallet" &&
    walletLoaded &&
    walletBalance >= total;

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

      const paymentData = {
        paymentMethod: method,
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
          "Payment Session Error:",
          error
        );
      }
    };

  // =========================================================
  // SAVE PENDING PAYMENT SESSION
  // =========================================================

  const savePendingPayment =
    ({
      razorpayOrderId,
      orderData,
    }) => {
      const pendingPayment = {
        razorpayOrderId,
        orderData,
        total,
        paymentMethod: "razorpay",
        createdAt:
          new Date().toISOString(),

        // =====================================================
        // PRODUCTS RESERVED FOR FAILED PAYMENT RETRY
        // =====================================================
        // Keep a snapshot of the cart inside the payment
        // session. If Razorpay fails, PaymentFailedPage can
        // temporarily remove these products from the cart and
        // restore them automatically after the retry window.
        // =====================================================

        failedCartItems:
          Array.isArray(cartItems)
            ? cartItems
            : [],
      };

      sessionStorage.setItem(
        "getsukaPendingPayment",
        JSON.stringify(
          pendingPayment
        )
      );
    };

  // =========================================================
  // CLEAR COMPLETED CHECKOUT SESSION
  // =========================================================

  const clearCompletedCheckout =
    () => {
      sessionStorage.removeItem(
        "getsukaCheckoutPayment"
      );

      sessionStorage.removeItem(
        "getsukaCheckoutReview"
      );

      sessionStorage.removeItem(
        "getsukaCheckoutShipping"
      );

      sessionStorage.removeItem(
        "getsukaPendingPayment"
      );
    };

  // =========================================================
  // BUILD ORDER ITEMS
  // =========================================================

  const buildOrderItems =
    () => {
      return cartItems.map(
        (item) => {
          const productId =
            item?.productId ||
            item?.product?._id ||
            item?._id;

          const variantId =
            item?.variantId ||
            item?.variant?._id ||
            item?.selectedVariantId;

          const quantity =
            getQuantity(item);

          if (
            !productId ||
            !variantId
          ) {
            throw new Error(
              "Product or variant information is missing from the cart."
            );
          }

          return {
            productId,
            variantId,
            quantity,
          };
        }
      );
    };

  // =========================================================
  // CREATE ORDER AFTER SUCCESSFUL RAZORPAY PAYMENT
  // =========================================================

  const completeSuccessfulOrder =
    async ({
      orderData,
      paymentResponse,
    }) => {
      const response =
        await createOrder({
          ...orderData,

          razorpayOrderId:
            paymentResponse?.razorpay_order_id,

          razorpayPaymentId:
            paymentResponse?.razorpay_payment_id,

          paymentStatus:
            "paid",
        });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Payment was successful, but the order could not be created."
        );
      }

      const createdOrder =
        response?.order ||
        response?.data ||
        response;

      sessionStorage.setItem(
        "getsukaOrder",
        JSON.stringify(
          createdOrder
        )
      );

      clearCompletedCheckout();

      localStorage.removeItem(
        "getsukaCart"
      );

      window.dispatchEvent(
        new Event(
          "cartUpdated"
        )
      );

      return createdOrder;
    };

  // =========================================================
  // OPEN RAZORPAY
  // =========================================================

  const openRazorpay =
    async ({
      orderData,
    }) => {
      setError("");
      setProcessing(true);

      try {
        const razorpayLoaded =
          await loadRazorpay();

        if (!razorpayLoaded) {
          throw new Error(
            "Unable to load Razorpay. Please check your internet connection and try again."
          );
        }

        // =====================================================
        // ALWAYS CREATE A NEW RAZORPAY ORDER
        // =====================================================

        const razorpayResponse =
          await createRazorpayOrder(
            total
          );

        if (
          !razorpayResponse?.success ||
          !razorpayResponse?.order?.id
        ) {
          throw new Error(
            razorpayResponse?.message ||
              "Unable to create Razorpay payment order."
          );
        }

        const razorpayOrder =
          razorpayResponse.order;

        const razorpayKey =
          import.meta.env
            .VITE_RAZORPAY_KEY_ID;

        if (!razorpayKey) {
          throw new Error(
            "Razorpay key is missing. Please check the frontend .env file."
          );
        }

        // =====================================================
        // SAVE PENDING PAYMENT
        // =====================================================

        savePendingPayment({
          razorpayOrderId:
            razorpayOrder.id,
          orderData,
        });

        // =====================================================
        // RAZORPAY OPTIONS
        // =====================================================

        const options = {
          key: razorpayKey,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency ||
            "INR",

          name: "GETSUKA",

          description:
            "GETSUKA Anime Clothing Order",

          order_id:
            razorpayOrder.id,

          prefill: {
            name:
              selectedAddress?.fullName ||
              "",

            contact:
              selectedAddress?.phone ||
              "",
          },

          notes: {
            paymentMethod:
              "razorpay",
          },

          theme: {
            color: "#000000",
          },

          // ===================================================
          // RAZORPAY SUCCESS
          // ===================================================

          handler:
            async (
              paymentResponse
            ) => {
              try {
                setProcessing(true);
                setError("");

                // =============================================
                // VERIFY PAYMENT
                // =============================================

                const verificationResponse =
                  await verifyRazorpayPayment(
                    {
                      razorpay_order_id:
                        paymentResponse?.razorpay_order_id,

                      razorpay_payment_id:
                        paymentResponse?.razorpay_payment_id,

                      razorpay_signature:
                        paymentResponse?.razorpay_signature,
                    }
                  );

                if (
                  !verificationResponse?.success
                ) {
                  throw new Error(
                    verificationResponse?.message ||
                      "Payment verification failed. Please try again."
                  );
                }

                // =============================================
                // CREATE ORDER
                // =============================================

                const createdOrder =
                  await completeSuccessfulOrder(
                    {
                      orderData,
                      paymentResponse,
                    }
                  );

                // =============================================
                // GO TO ORDER PLACED
                // =============================================

                setProcessing(false);

                navigate(
                  "/checkout/order-placed",
                  {
                    replace: true,

                    state: {
                      order:
                        createdOrder,
                    },
                  }
                );
              } catch (error) {
                console.error(
                  "Razorpay Success Processing Error:",
                  error
                );

                setProcessing(false);

                setError(
                  error?.response
                    ?.data?.message ||
                    error?.message ||
                    "Payment was received, but we could not complete the order. Please contact support before trying again."
                );
              }
            },

          // ===================================================
          // RAZORPAY CLOSED BY USER
          // ===================================================

          modal: {
            ondismiss: () => {
              setProcessing(false);

              navigate(
                "/checkout/payment-failed",
                {
                  replace: true,

                  state: {
                    message:
                      "You closed the payment window before the payment was completed.",

                    paymentMethod:
                      "razorpay",
                  },
                }
              );
            },
          },
        };

        const razorpay =
          new window.Razorpay(
            options
          );

        // =====================================================
        // ACTUAL RAZORPAY PAYMENT FAILURE
        // =====================================================

        razorpay.on(
          "payment.failed",
          (response) => {
            console.error(
              "Razorpay Payment Failed:",
              response
            );

            // =================================================
            // SAVE FAILED PAYMENT PRODUCTS
            // =================================================
            // The cart is temporarily removed while the user
            // has the 2-minute retry window.
            // PaymentFailedPage will restore these products
            // automatically if the timer expires.
            // =================================================

            try {
              const storedPendingPayment =
                sessionStorage.getItem(
                  "getsukaPendingPayment"
                );

              const pendingPayment =
                storedPendingPayment
                  ? JSON.parse(
                      storedPendingPayment
                    )
                  : {};

              const failedPayment = {
                ...pendingPayment,

                paymentStatus:
                  "failed",

                paymentMethod:
                  "razorpay",

                failureMessage:
                  response?.error
                    ?.description ||
                  response?.error
                    ?.reason ||
                  "Your payment could not be completed. Please try again.",

                failedCartItems:
                  Array.isArray(
                    pendingPayment?.failedCartItems
                  ) &&
                  pendingPayment.failedCartItems.length > 0
                    ? pendingPayment.failedCartItems
                    : Array.isArray(cartItems)
                    ? cartItems
                    : [],
              };

              sessionStorage.setItem(
                "getsukaPendingPayment",
                JSON.stringify(
                  failedPayment
                )
              );

              sessionStorage.setItem(
                "getsukaFailedPayment",
                JSON.stringify(
                  failedPayment
                )
              );

              // -----------------------------------------------
              // TEMPORARILY REMOVE PRODUCTS FROM CART
              // -----------------------------------------------

              localStorage.removeItem(
                "getsukaCart"
              );

              window.dispatchEvent(
                new Event(
                  "cartUpdated"
                )
              );
            } catch (storageError) {
              console.error(
                "Failed Payment Cart Session Error:",
                storageError
              );
            }

            setProcessing(false);

            navigate(
              "/checkout/payment-failed",
              {
                replace: true,

                state: {
                  message:
                    response?.error
                      ?.description ||
                    response?.error
                      ?.reason ||
                    "Your payment could not be completed. Please try again.",

                  paymentMethod:
                    "razorpay",
                },
              }
            );
          }
        );

        razorpay.open();
      } catch (error) {
        console.error(
          "Razorpay Initialization Error:",
          error
        );

        setProcessing(false);

        setError(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Unable to start the payment. Please try again."
        );
      }
    };

  // =========================================================
  // COMPLETE WALLET ORDER
  // =========================================================

  const completeWalletOrder =
    async ({
      orderData,
    }) => {
      const response =
        await createOrder({
          ...orderData,

          paymentMethod:
            "wallet",

          paymentStatus:
            "paid",
        });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to create wallet order."
        );
      }

      const createdOrder =
        response?.order ||
        response?.data ||
        response;

      sessionStorage.setItem(
        "getsukaOrder",
        JSON.stringify(
          createdOrder
        )
      );

      clearCompletedCheckout();

      localStorage.removeItem(
        "getsukaCart"
      );

      window.dispatchEvent(
        new Event(
          "cartUpdated"
        )
      );

      return createdOrder;
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
      // WALLET BALANCE
      // -------------------------------------------------------

      if (
        paymentMethod === "wallet"
      ) {
        if (walletLoading) {
          setError(
            "Please wait while your wallet balance is loading."
          );

          return;
        }

        if (!walletLoaded) {
          setError(
            "Unable to verify your wallet balance. Please try again."
          );

          return;
        }

        if (
          walletBalance < total
        ) {
          setError(
            `Insufficient wallet balance. You need ${formatPrice(
              total
            )}, but your wallet has only ${formatPrice(
              walletBalance
            )}.`
          );

          return;
        }
      }

      // -------------------------------------------------------
      // BUILD ORDER ITEMS
      // -------------------------------------------------------

      let orderItems;

      try {
        orderItems =
          buildOrderItems();
      } catch (error) {
        console.error(
          "Order Items Error:",
          error
        );

        setError(
          error?.message ||
            "Unable to prepare your order."
        );

        return;
      }

      // -------------------------------------------------------
      // ORDER DATA
      // -------------------------------------------------------

      const orderData = {
        items: orderItems,

        addressId:
          selectedAddress?._id ||
          selectedAddress?.id,

        deliveryMethod,

        paymentMethod,

        couponCode:
          checkoutData?.couponCode ||
          "",

        discount,

        tax,
      };

      // -------------------------------------------------------
      // SAVE PAYMENT SESSION
      // -------------------------------------------------------

      try {
        sessionStorage.setItem(
          "getsukaCheckoutPayment",
          JSON.stringify({
            paymentMethod,
            selectedAddress,
            deliveryMethod,
            shippingCharge:
              shippingCost,
            subtotal,
            discount,
            tax,
            total,
          })
        );
      } catch (error) {
        console.error(
          "Save Payment Session Error:",
          error
        );

        setError(
          "Unable to save payment details."
        );

        return;
      }

      // =======================================================
      // WALLET
      // =======================================================

      if (
        paymentMethod === "wallet"
      ) {
        try {
          setProcessing(true);

          const createdOrder =
            await completeWalletOrder({
              orderData,
            });

          setProcessing(false);

          navigate(
            "/checkout/order-placed",
            {
              replace: true,

              state: {
                order:
                  createdOrder,
              },
            }
          );
        } catch (error) {
          console.error(
            "Wallet Order Error:",
            error
          );

          setError(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Something went wrong while placing your wallet order."
          );

          setProcessing(false);
        }

        return;
      }

      // =======================================================
      // CASH ON DELIVERY
      // =======================================================

      if (
        paymentMethod ===
        "cod"
      ) {
        try {
          setProcessing(true);

          const response =
            await createOrder(
              orderData
            );

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
            JSON.stringify(
              createdOrder
            )
          );

          clearCompletedCheckout();

          localStorage.removeItem(
            "getsukaCart"
          );

          window.dispatchEvent(
            new Event(
              "cartUpdated"
            )
          );

          setProcessing(false);

          navigate(
            "/checkout/order-placed",
            {
              replace: true,

              state: {
                order:
                  createdOrder,
              },
            }
          );
        } catch (error) {
          console.error(
            "COD Order Error:",
            error
          );

          setError(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Something went wrong while placing your order."
          );

          setProcessing(false);
        }

        return;
      }

      // =======================================================
      // RAZORPAY
      // =======================================================

      await openRazorpay({
        orderData,
      });
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
        <div className="flex min-h-screen flex-col items-center justify-center px-6">

          <p className="text-center text-[9px] uppercase tracking-[0.3em] text-white/40">
            CHECKOUT INFORMATION
            MISSING
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/checkout",
                {
                  replace: true,
                }
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

        <div className="mx-auto max-w-[1500px] px-5 py-5 sm:px-8 sm:py-6">

          <div className="flex flex-wrap items-center gap-3 text-[8px] tracking-[0.22em] sm:gap-4 sm:text-[9px]">

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

      <main className="bg-black px-5 py-10 sm:px-8 sm:py-[55px]">

        <div className="mx-auto max-w-[1500px]">

          {/* PAGE TITLE */}

          <div className="mb-10 sm:mb-[48px]">

            <p className="mb-[14px] text-[8px] tracking-[0.35em] text-white/35 sm:text-[9px]">
              GETSUKA CHECKOUT
            </p>

            <h1 className="text-[25px] font-light tracking-[0.12em] sm:text-[30px]">
              PAYMENT
            </h1>

            <p className="mt-[12px] max-w-[450px] text-[10px] leading-6 text-white/35 sm:text-[11px]">
              Choose a secure payment
              method to complete your
              order.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-[30px] border border-red-500/40 bg-black px-4 py-4 sm:px-[20px]">

              <p className="text-[9px] leading-5 tracking-[0.05em] text-red-500">
                {error}
              </p>

            </div>
          )}

          {/* CONTENT */}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_390px] lg:gap-[60px]">

            {/* =================================================
                LEFT
            ================================================= */}

            <section>

              {/* PAYMENT METHOD */}

              <div>

                <div className="mb-[22px]">

                  <p className="mb-[8px] text-[9px] tracking-[0.25em] text-white/30">
                    STEP 04
                  </p>

                  <h2 className="text-[16px] font-light tracking-[0.12em] sm:text-[17px]">
                    PAYMENT METHOD
                  </h2>

                </div>

                {/* =================================================
                    RAZORPAY
                ================================================= */}

                <div
                  className={`border ${
                    paymentMethod ===
                    "razorpay"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "razorpay"
                      )
                    }
                    className="flex w-full items-center justify-between px-4 py-5 text-left sm:px-[24px] sm:py-[22px]"
                  >

                    <div className="flex min-w-0 items-center gap-[15px]">

                      <span
                        className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "razorpay"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "razorpay" && (
                          <span className="h-[6px] w-[6px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <div className="min-w-0">

                        <span className="block text-[10px] tracking-[0.12em]">
                          RAZORPAY
                        </span>

                        <span className="mt-[5px] block text-[8px] text-white/30">
                          UPI · CARDS · NET BANKING · MORE
                        </span>

                      </div>

                    </div>

                    <span className="ml-3 shrink-0 text-[7px] tracking-[0.15em] text-white/30 sm:text-[8px]">
                      SECURE
                    </span>

                  </button>

                  {paymentMethod ===
                    "razorpay" && (
                    <div className="border-t border-white/10 px-4 py-4 sm:px-[24px] sm:py-[18px]">

                      <p className="text-[8px] leading-[1.8] text-white/35">
                        You will be redirected
                        to Razorpay Checkout
                        to securely complete
                        your payment.
                      </p>

                    </div>
                  )}

                </div>

                {/* =================================================
                    WALLET
                ================================================= */}

                <div
                  className={`mt-[8px] border ${
                    paymentMethod ===
                    "wallet"
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodChange(
                        "wallet"
                      )
                    }
                    className="flex w-full items-center justify-between px-4 py-5 text-left sm:px-[24px] sm:py-[22px]"
                  >

                    <div className="flex min-w-0 items-center gap-[15px]">

                      <span
                        className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "wallet"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "wallet" && (
                          <span className="h-[6px] w-[6px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <div className="min-w-0">

                        <span className="block text-[10px] tracking-[0.12em]">
                          GETSUKA WALLET
                        </span>

                        <span className="mt-[5px] block text-[8px] text-white/30">
                          PAY USING YOUR WALLET BALANCE
                        </span>

                      </div>

                    </div>

                    <span className="ml-3 shrink-0 text-[7px] tracking-[0.15em] text-white/30 sm:text-[8px]">
                      WALLET
                    </span>

                  </button>

                  {paymentMethod ===
                    "wallet" && (
                    <div className="border-t border-white/10 px-4 py-5 sm:px-[24px] sm:py-[20px]">

                      {walletLoading ? (
                        <div>

                          <p className="text-[8px] tracking-[0.16em] text-white/35">
                            CHECKING WALLET BALANCE...
                          </p>

                        </div>
                      ) : (
                        <div>

                          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                            <div>

                              <p className="mb-[7px] text-[8px] tracking-[0.2em] text-white/30">
                                AVAILABLE BALANCE
                              </p>

                              <p
                                className={`text-[24px] font-light tracking-[0.03em] ${
                                  walletInsufficient
                                    ? "text-red-500"
                                    : "text-white"
                                }`}
                              >
                                {formatPrice(
                                  walletBalance
                                )}
                              </p>

                            </div>

                            <div>

                              <p className="mb-[7px] text-[8px] tracking-[0.2em] text-white/30">
                                ORDER TOTAL
                              </p>

                              <p className="text-[16px] font-light">
                                {formatPrice(
                                  total
                                )}
                              </p>

                            </div>

                          </div>

                          {walletInsufficient && (
                            <div className="mt-5 border border-red-500/30 bg-red-500/5 px-4 py-3">

                              <p className="text-[8px] leading-[1.8] tracking-[0.05em] text-red-500">
                                INSUFFICIENT WALLET BALANCE.
                                YOU NEED{" "}
                                {formatPrice(
                                  total -
                                    walletBalance
                                )}{" "}
                                MORE TO COMPLETE THIS ORDER.
                              </p>

                            </div>
                          )}

                          {walletSufficient && (
                            <div className="mt-5 border border-white/10 px-4 py-3">

                              <p className="text-[8px] leading-[1.8] tracking-[0.05em] text-white/35">
                                YOUR WALLET BALANCE IS
                                SUFFICIENT TO COMPLETE
                                THIS ORDER.
                              </p>

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* =================================================
                    CASH ON DELIVERY
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
                    className="flex w-full items-center justify-between px-4 py-5 text-left sm:px-[24px] sm:py-[22px]"
                  >

                    <div className="flex min-w-0 items-center gap-[15px]">

                      <span
                        className={`flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${
                          paymentMethod ===
                          "cod"
                            ? "border-red-500"
                            : "border-white/30"
                        }`}
                      >

                        {paymentMethod ===
                          "cod" && (
                          <span className="h-[6px] w-[6px] rounded-full bg-red-500" />
                        )}

                      </span>

                      <div className="min-w-0">

                        <span className="block text-[10px] tracking-[0.12em]">
                          CASH ON DELIVERY
                        </span>

                        <span className="mt-[5px] block text-[8px] text-white/30">
                          PAY WHEN YOUR ORDER ARRIVES
                        </span>

                      </div>

                    </div>

                    <span className="ml-3 shrink-0 text-white/30">
                      ▣
                    </span>

                  </button>

                  {paymentMethod ===
                    "cod" && (
                    <div className="border-t border-white/10 px-4 py-4 sm:px-[24px] sm:py-[16px]">

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

              <div className="border-b border-white/10 px-5 py-5 sm:px-[26px] sm:py-[24px]">

                <div className="flex items-center justify-between">

                  <h2 className="text-[14px] font-light tracking-[0.15em] sm:text-[15px]">
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

              <div className="max-h-[330px] overflow-y-auto px-5 sm:px-[26px]">

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
                                src={image}
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

              <div className="px-5 py-5 sm:px-[26px] sm:py-[24px]">

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

                {/* WALLET BALANCE MINI SUMMARY */}

                {paymentMethod ===
                  "wallet" &&
                  walletLoaded && (
                    <div className="mt-5 border-t border-white/10 pt-5">

                      <div className="flex items-center justify-between">

                        <span className="text-[8px] tracking-[0.12em] text-white/35">
                          WALLET BALANCE
                        </span>

                        <span
                          className={`text-[9px] ${
                            walletInsufficient
                              ? "text-red-500"
                              : "text-white"
                          }`}
                        >
                          {formatPrice(
                            walletBalance
                          )}
                        </span>

                      </div>

                    </div>
                  )}

                {/* PLACE ORDER */}

                <button
                  type="button"
                  onClick={
                    handlePlaceOrder
                  }
                  disabled={
                    processing ||
                    walletLoading ||
                    walletInsufficient ||
                    (paymentMethod ===
                      "wallet" &&
                      !walletLoaded)
                  }
                  className="mt-[28px] flex h-[50px] w-full items-center justify-center gap-[10px] bg-white text-[9px] font-medium tracking-[0.2em] text-black transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >

                  {processing
                    ? "PROCESSING..."
                    : paymentMethod ===
                      "razorpay"
                    ? "PAY WITH RAZORPAY"
                    : paymentMethod ===
                      "wallet"
                    ? walletInsufficient
                      ? "INSUFFICIENT BALANCE"
                      : walletLoading
                      ? "CHECKING WALLET..."
                      : "PAY WITH WALLET"
                    : "PLACE ORDER"}

                  {!processing &&
                    !walletInsufficient &&
                    !walletLoading &&
                    !(
                      paymentMethod ===
                      "wallet" &&
                      !walletLoaded
                    ) && (
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
                  disabled={
                    processing
                  }
                  className="mt-[16px] block w-full text-center text-[8px] tracking-[0.18em] text-white/35 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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