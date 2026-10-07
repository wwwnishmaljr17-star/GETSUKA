import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api/paymentApi";

import { loadRazorpay } from "../utils/loadRazorpay";

import { createOrder } from "../../orders/api/orderApi";

const RETRY_DELAY = 120;

const PENDING_PAYMENT_KEY =
  "getsukaPendingPayment";

const FAILED_PAYMENTS_KEY =
  "getsukaFailedPayments";

const LEGACY_FAILED_PAYMENT_KEY =
  "getsukaFailedPayment";

const RETRY_SUCCESS_LOCK_PREFIX =
  "getsukaRetrySuccess:";

const PaymentFailedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const retryProcessingRef =
    useRef(false);

  const [timeLeft, setTimeLeft] =
    useState(0);

  const [retrying, setRetrying] =
    useState(false);

  const [retryError, setRetryError] =
    useState("");

  const [failedPayment, setFailedPayment] =
    useState(null);

  const [animationVisible, setAnimationVisible] =
    useState(true);

  const locationErrorMessage =
    location.state?.message ||
    "Your payment could not be completed. Please try again.";

  // =======================================================
  // GET PENDING PAYMENT
  // =======================================================

  const getPendingPayment = () => {
    try {
      const value =
        sessionStorage.getItem(
          PENDING_PAYMENT_KEY
        );

      return value
        ? JSON.parse(value)
        : null;
    } catch (error) {
      console.error(
        "Pending Payment Parse Error:",
        error
      );

      return null;
    }
  };

  // =======================================================
  // GET ALL FAILED PAYMENTS
  // =======================================================

  const getFailedPayments = () => {
    try {
      const stored =
        sessionStorage.getItem(
          FAILED_PAYMENTS_KEY
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        return Array.isArray(parsed)
          ? parsed
          : [];
      }

      // ---------------------------------------------------
      // MIGRATE OLD SINGLE PAYMENT
      // ---------------------------------------------------

      const legacy =
        sessionStorage.getItem(
          LEGACY_FAILED_PAYMENT_KEY
        );

      if (legacy) {
        const parsedLegacy =
          JSON.parse(legacy);

        if (
          parsedLegacy &&
          typeof parsedLegacy ===
            "object"
        ) {
          const migrated = [
            parsedLegacy,
          ];

          sessionStorage.setItem(
            FAILED_PAYMENTS_KEY,
            JSON.stringify(migrated)
          );

          sessionStorage.removeItem(
            LEGACY_FAILED_PAYMENT_KEY
          );

          return migrated;
        }
      }

      return [];
    } catch (error) {
      console.error(
        "Failed Payments Parse Error:",
        error
      );

      return [];
    }
  };

  // =======================================================
  // SAVE ALL FAILED PAYMENTS
  // =======================================================

  const saveFailedPayments = (
    payments
  ) => {
    try {
      sessionStorage.setItem(
        FAILED_PAYMENTS_KEY,
        JSON.stringify(
          Array.isArray(payments)
            ? payments
            : []
        )
      );
    } catch (error) {
      console.error(
        "Save Failed Payments Error:",
        error
      );
    }
  };

  // =======================================================
  // GET ACTIVE FAILED PAYMENT ID
  // =======================================================

  const getActiveFailedPaymentId =
    () => {
      const stateId =
        location.state
          ?.failedPaymentId;

      if (stateId) {
        return String(stateId);
      }

      const pending =
        getPendingPayment();

      if (
        pending
          ?.temporaryOrderNumber
      ) {
        return String(
          pending.temporaryOrderNumber
        );
      }

      return null;
    };

  // =======================================================
  // FIND FAILED PAYMENT
  // =======================================================

  const findFailedPayment = (
    paymentId
  ) => {
    if (!paymentId) {
      return null;
    }

    return (
      getFailedPayments().find(
        (payment) =>
          String(
            payment
              ?.temporaryOrderNumber ||
              ""
          ) ===
          String(paymentId)
      ) || null
    );
  };

  // =======================================================
  // SAVE CURRENT FAILED PAYMENT
  // =======================================================

  const saveFailedPayment = () => {
    try {
      const pendingPayment =
        getPendingPayment();

      let failedPayments =
        getFailedPayments();

      // ---------------------------------------------------
      // NO PENDING PAYMENT
      // ---------------------------------------------------

      if (!pendingPayment) {
        const activeId =
          getActiveFailedPaymentId();

        const existing =
          failedPayments.find(
            (payment) =>
              String(
                payment
                  ?.temporaryOrderNumber ||
                  ""
              ) ===
              String(
                activeId || ""
              )
          );

        if (existing) {
          setFailedPayment(
            existing
          );

          return existing;
        }

        return null;
      }

      // ---------------------------------------------------
      // CREATE STABLE PAYMENT ID
      // ---------------------------------------------------

      const temporaryOrderNumber =
        String(
          pendingPayment
            ?.temporaryOrderNumber ||
            `FAILED-${Date.now()}`
        );

      // ---------------------------------------------------
      // CHECK EXISTING PAYMENT
      // ---------------------------------------------------

      const existingIndex =
        failedPayments.findIndex(
          (payment) =>
            String(
              payment
                ?.temporaryOrderNumber ||
                ""
            ) ===
            temporaryOrderNumber
        );

      const existingPayment =
        existingIndex >= 0
          ? failedPayments[
              existingIndex
            ]
          : null;

      // ---------------------------------------------------
      // FAILED TIME
      // ---------------------------------------------------

      let failedAt =
        existingPayment?.failedAt
          ? new Date(
              existingPayment.failedAt
            ).getTime()
          : pendingPayment?.failedAt
          ? new Date(
              pendingPayment.failedAt
            ).getTime()
          : 0;

      if (!failedAt) {
        failedAt =
          Date.now();
      }

      // ---------------------------------------------------
      // RETRY EXPIRY
      // ---------------------------------------------------

      let retryExpiresAt =
        existingPayment?.retryExpiresAt
          ? new Date(
              existingPayment.retryExpiresAt
            ).getTime()
          : pendingPayment?.retryExpiresAt
          ? new Date(
              pendingPayment.retryExpiresAt
            ).getTime()
          : 0;

      if (
        !retryExpiresAt ||
        retryExpiresAt <=
          Date.now()
      ) {
        retryExpiresAt =
          failedAt +
          RETRY_DELAY * 1000;
      }

      // ---------------------------------------------------
      // FAILED CART SNAPSHOT
      //
      // KEPT FOR RECORD PURPOSES ONLY.
      //
      // IT IS NOT RESTORED AFTER EXPIRY.
      // ---------------------------------------------------

      const failedCartItems =
        Array.isArray(
          pendingPayment
            ?.failedCartItems
        )
          ? pendingPayment.failedCartItems
          : Array.isArray(
              pendingPayment?.cartItems
            )
          ? pendingPayment.cartItems
          : Array.isArray(
              existingPayment
                ?.failedCartItems
            )
          ? existingPayment.failedCartItems
          : [];

      // ---------------------------------------------------
      // FAILED PAYMENT OBJECT
      // ---------------------------------------------------

      const failedPaymentData = {
        ...(existingPayment || {}),
        ...pendingPayment,

        paymentStatus:
          "failed",

        paymentMethod:
          "razorpay",

        failedAt:
          new Date(
            failedAt
          ).toISOString(),

        retryExpiresAt:
          new Date(
            retryExpiresAt
          ).toISOString(),

        failureMessage:
          location.state
            ?.message ||
          pendingPayment
            ?.failureMessage ||
          existingPayment
            ?.failureMessage ||
          "Your payment could not be completed. Please try again.",

        temporaryOrderNumber,

        temporaryOrderStatus:
          "payment_failed",

        orderData:
          pendingPayment
            ?.orderData ||
          existingPayment
            ?.orderData ||
          {},

        failedCartItems,
      };

      // ---------------------------------------------------
      // UPDATE OR APPEND ONLY THIS PAYMENT
      // ---------------------------------------------------

      if (
        existingIndex >=
        0
      ) {
        failedPayments[
          existingIndex
        ] =
          failedPaymentData;
      } else {
        failedPayments = [
          ...failedPayments,
          failedPaymentData,
        ];
      }

      saveFailedPayments(
        failedPayments
      );

      sessionStorage.setItem(
        PENDING_PAYMENT_KEY,
        JSON.stringify(
          failedPaymentData
        )
      );

      setFailedPayment(
        failedPaymentData
      );

      return failedPaymentData;
    } catch (error) {
      console.error(
        "Save Failed Payment Error:",
        error
      );

      return null;
    }
  };

  // =======================================================
  // UPDATE ONE FAILED PAYMENT
  // =======================================================

  const updateFailedPaymentStatus =
    (
      payment,
      paymentStatus,
      failureMessage = ""
    ) => {
      try {
        const updatedPayment = {
          ...payment,

          paymentStatus,

          retryExpiresAt:
            payment
              ?.retryExpiresAt,

          ...(failureMessage
            ? {
                failureMessage,
              }
            : {}),
        };

        const updatedPayments =
          getFailedPayments().map(
            (item) =>
              String(
                item
                  ?.temporaryOrderNumber ||
                  ""
              ) ===
              String(
                payment
                  ?.temporaryOrderNumber ||
                  ""
              )
                ? updatedPayment
                : item
          );

        saveFailedPayments(
          updatedPayments
        );

        sessionStorage.setItem(
          PENDING_PAYMENT_KEY,
          JSON.stringify(
            updatedPayment
          )
        );

        setFailedPayment(
          updatedPayment
        );
      } catch (error) {
        console.error(
          "Update Failed Payment Error:",
          error
        );
      }
    };

  // =======================================================
  // LOAD FAILED PAYMENT
  // =======================================================

  useEffect(() => {
    const loadFailedPayment =
      () => {
        try {
          const payments =
            getFailedPayments();

          const activeId =
            getActiveFailedPaymentId();

          const selected =
            payments.find(
              (payment) =>
                String(
                  payment
                    ?.temporaryOrderNumber ||
                    ""
                ) ===
                String(
                  activeId || ""
                )
            ) || null;

          if (selected) {
            const expiry =
              new Date(
                selected.retryExpiresAt
              ).getTime();

            if (
              expiry >
              Date.now()
            ) {
              setFailedPayment(
                selected
              );

              return;
            }
          }

          saveFailedPayment();
        } catch (error) {
          console.error(
            "Load Failed Payment Error:",
            error
          );

          saveFailedPayment();
        }
      };

    loadFailedPayment();
  }, []);

  // =======================================================
  // FAILURE ANIMATION
  // =======================================================

  useEffect(() => {
    if (!failedPayment) {
      return;
    }

    const animationKey =
      `getsukaFailedPaymentAnimationShown:${failedPayment.temporaryOrderNumber}`;

    const alreadyShown =
      sessionStorage.getItem(
        animationKey
      );

    if (alreadyShown) {
      setAnimationVisible(
        false
      );

      return;
    }

    sessionStorage.setItem(
      animationKey,
      "true"
    );

    const timer =
      setTimeout(() => {
        setAnimationVisible(
          false
        );
      }, 2200);

    return () => {
      clearTimeout(
        timer
      );
    };
  }, [
    failedPayment
      ?.temporaryOrderNumber,
  ]);

  // =======================================================
  // RETRY TIMER
  // =======================================================

  useEffect(() => {
    const updateTimer =
      () => {
        if (!failedPayment) {
          setTimeLeft(0);
          return;
        }

        const expiry =
          new Date(
            failedPayment
              .retryExpiresAt
          ).getTime();

        if (
          !expiry ||
          Number.isNaN(
            expiry
          )
        ) {
          setTimeLeft(0);
          return;
        }

        const remaining =
          expiry -
          Date.now();

        if (
          remaining <=
          0
        ) {
          setTimeLeft(0);
          return;
        }

        setTimeLeft(
          Math.ceil(
            remaining /
              1000
          )
        );
      };

    updateTimer();

    const timer =
      setInterval(
        updateTimer,
        1000
      );

    return () => {
      clearInterval(
        timer
      );
    };
  }, [
    failedPayment,
  ]);

  // =======================================================
  // REMOVE ONLY ONE FAILED PAYMENT
  // =======================================================

  const removeFailedPayment =
    (
      paymentId
    ) => {
      const remaining =
        getFailedPayments().filter(
          (payment) =>
            String(
              payment
                ?.temporaryOrderNumber ||
                ""
            ) !==
            String(
              paymentId || ""
            )
        );

      saveFailedPayments(
        remaining
      );

      return remaining;
    };

  // =======================================================
  // HANDLE TIMER EXPIRY
  //
  // IMPORTANT:
  // NOTHING IS RESTORED TO CART.
  //
  // WHEN TIMER EXPIRES:
  // 1. REMOVE FAILED PAYMENT
  // 2. CLEAR ITS PENDING PAYMENT
  // 3. LEAVE CART EXACTLY AS IT IS
  // =======================================================

  useEffect(() => {
    if (
      !failedPayment ||
      timeLeft > 0
    ) {
      return;
    }

    const expiry =
      new Date(
        failedPayment
          .retryExpiresAt
      ).getTime();

    if (
      !expiry ||
      expiry >
        Date.now()
    ) {
      return;
    }

    try {
      const paymentId =
        failedPayment
          .temporaryOrderNumber;

      // ---------------------------------------------------
      // REMOVE ONLY THIS FAILED PAYMENT
      // ---------------------------------------------------

      removeFailedPayment(
        paymentId
      );

      // ---------------------------------------------------
      // CLEAR ONLY ITS PENDING PAYMENT
      // ---------------------------------------------------

      const pendingPayment =
        getPendingPayment();

      if (
        String(
          pendingPayment
            ?.temporaryOrderNumber ||
            ""
        ) ===
        String(
          paymentId || ""
        )
      ) {
        sessionStorage.removeItem(
          PENDING_PAYMENT_KEY
        );
      }

      // ---------------------------------------------------
      // DO NOT TOUCH getsukaCart
      // ---------------------------------------------------

      setFailedPayment(
        null
      );
    } catch (error) {
      console.error(
        "Expired Payment Cleanup Error:",
        error
      );
    }
  }, [
    timeLeft,
    failedPayment,
  ]);

  // =======================================================
  // FORMAT TIMER
  // =======================================================

  const formatTime =
    () => {
      const minutes =
        Math.floor(
          timeLeft /
            60
        );

      const seconds =
        timeLeft % 60;

      return `${minutes}:${seconds
        .toString()
        .padStart(
          2,
          "0"
        )}`;
    };

  // =======================================================
  // CLEAR COMPLETED CHECKOUT
  // =======================================================

  const clearCompletedCheckout =
    (
      paymentId
    ) => {
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
        PENDING_PAYMENT_KEY
      );

      if (paymentId) {
        removeFailedPayment(
          paymentId
        );
      }
    };

  // =======================================================
  // CREATE SUCCESSFUL ORDER
  // =======================================================

  const completeSuccessfulOrder =
    async ({
      orderData,
      paymentResponse,
      paymentId,
    }) => {
      const response =
        await createOrder({
          ...orderData,

          razorpayOrderId:
            paymentResponse
              ?.razorpay_order_id,

          razorpayPaymentId:
            paymentResponse
              ?.razorpay_payment_id,

          paymentStatus:
            "paid",
        });

      if (
        !response?.success
      ) {
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

      clearCompletedCheckout(
        paymentId
      );

      window.dispatchEvent(
        new Event(
          "cartUpdated"
        )
      );

      return createdOrder;
    };

  // =======================================================
  // RETRY RAZORPAY
  // =======================================================

  const handleRetryPayment =
    async () => {
      // ---------------------------------------------------
      // HARD FRONTEND LOCK
      //
      // PREVENTS DOUBLE CLICK / DOUBLE CALLBACK.
      // ---------------------------------------------------

      if (
        retryProcessingRef.current
      ) {
        return;
      }

      let currentFailedPayment =
        null;

      try {
        const activeId =
          getActiveFailedPaymentId();

        currentFailedPayment =
          findFailedPayment(
            activeId
          );
      } catch (error) {
        console.error(
          "Retry Session Parse Error:",
          error
        );
      }

      const retryExpiresAt =
        new Date(
          currentFailedPayment
            ?.retryExpiresAt
        ).getTime();

      if (
        !retryExpiresAt ||
        retryExpiresAt <=
          Date.now()
      ) {
        setTimeLeft(0);
        return;
      }

      if (retrying) {
        return;
      }

      setRetryError(
        ""
      );

      setRetrying(
        true
      );

      retryProcessingRef.current =
        true;

      try {
        // -------------------------------------------------
        // ORDER DATA
        // -------------------------------------------------

        const orderData =
          currentFailedPayment
            ?.orderData;

        if (!orderData) {
          throw new Error(
            "Order information is missing. Please start checkout again."
          );
        }

        // -------------------------------------------------
        // TOTAL
        // -------------------------------------------------

        const total =
          Number(
            currentFailedPayment
              ?.total
          ) || 0;

        if (
          total <=
          0
        ) {
          throw new Error(
            "Invalid payment amount. Please return to checkout."
          );
        }

        // -------------------------------------------------
        // GET LATEST FAILED PAYMENTS
        // -------------------------------------------------

        const latestPayments =
          getFailedPayments();

        const latestFailedPayment =
          latestPayments.find(
            (payment) =>
              String(
                payment
                  ?.temporaryOrderNumber ||
                  ""
              ) ===
              String(
                currentFailedPayment
                  ?.temporaryOrderNumber ||
                  ""
              )
          );

        if (
          !latestFailedPayment
        ) {
          throw new Error(
            "Your retry session has expired. Please start checkout again."
          );
        }

        const latestExpiry =
          new Date(
            latestFailedPayment
              .retryExpiresAt
          ).getTime();

        if (
          latestExpiry <=
          Date.now()
        ) {
          setTimeLeft(0);

          throw new Error(
            "Your retry window has expired. Please start checkout again."
          );
        }

        // -------------------------------------------------
        // LOAD RAZORPAY
        // -------------------------------------------------

        const razorpayLoaded =
          await loadRazorpay();

        if (
          !razorpayLoaded
        ) {
          throw new Error(
            "Unable to load Razorpay. Please check your internet connection and try again."
          );
        }

        // -------------------------------------------------
        // CREATE BRAND NEW RAZORPAY ORDER
        // -------------------------------------------------

        const razorpayResponse =
          await createRazorpayOrder(
            total
          );

        if (
          !razorpayResponse
            ?.success ||
          !razorpayResponse
            ?.order
            ?.id
        ) {
          throw new Error(
            razorpayResponse
              ?.message ||
              "Unable to create a new Razorpay payment order."
          );
        }

        const razorpayOrder =
          razorpayResponse.order;

        // -------------------------------------------------
        // RAZORPAY KEY
        // -------------------------------------------------

        const razorpayKey =
          import.meta.env
            .VITE_RAZORPAY_KEY_ID;

        if (!razorpayKey) {
          throw new Error(
            "Razorpay key is missing. Please check the frontend .env file."
          );
        }

        // -------------------------------------------------
        // UPDATE ONLY THIS FAILED PAYMENT
        //
        // TIMER DOES NOT RESET.
        // -------------------------------------------------

        const updatedFailedPayment =
          {
            ...latestFailedPayment,

            razorpayOrderId:
              razorpayOrder.id,

            paymentMethod:
              "razorpay",

            paymentStatus:
              "retrying",

            retryExpiresAt:
              latestFailedPayment
                .retryExpiresAt,
          };

        const updatedPayments =
          latestPayments.map(
            (payment) =>
              String(
                payment
                  ?.temporaryOrderNumber ||
                  ""
              ) ===
              String(
                latestFailedPayment
                  ?.temporaryOrderNumber ||
                  ""
              )
                ? updatedFailedPayment
                : payment
          );

        saveFailedPayments(
          updatedPayments
        );

        sessionStorage.setItem(
          PENDING_PAYMENT_KEY,
          JSON.stringify(
            updatedFailedPayment
          )
        );

        setFailedPayment(
          updatedFailedPayment
        );

        // -------------------------------------------------
        // SUCCESS LOCK
        //
        // ONE REAL ORDER PER FAILED PAYMENT RETRY.
        // -------------------------------------------------

        const successLockKey =
          `${RETRY_SUCCESS_LOCK_PREFIX}${updatedFailedPayment.temporaryOrderNumber}`;

        // -------------------------------------------------
        // RAZORPAY OPTIONS
        // -------------------------------------------------

        const options = {
          key:
            razorpayKey,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency ||
            "INR",

          name:
            "GETSUKA",

          description:
            "GETSUKA Anime Clothing Order",

          order_id:
            razorpayOrder.id,

          prefill: {
            name:
              orderData
                ?.selectedAddress
                ?.fullName ||
              "",

            contact:
              orderData
                ?.selectedAddress
                ?.phone ||
              "",
          },

          notes: {
            paymentMethod:
              "razorpay",

            retryPayment:
              "true",

            failedPaymentId:
              updatedFailedPayment
                .temporaryOrderNumber,
          },

          theme: {
            color:
              "#000000",
          },

          // ---------------------------------------------
          // PAYMENT SUCCESS
          // ---------------------------------------------

          handler:
            async (
              paymentResponse
            ) => {
              try {
                // -----------------------------------------
                // DUPLICATE SUCCESS CALLBACK PROTECTION
                // -----------------------------------------

                const existingSuccessLock =
                  sessionStorage.getItem(
                    successLockKey
                  );

                if (
                  existingSuccessLock ===
                    "processing" ||
                  existingSuccessLock ===
                    "completed"
                ) {
                  return;
                }

                sessionStorage.setItem(
                  successLockKey,
                  "processing"
                );

                // -----------------------------------------
                // VERIFY ORDER ID
                // -----------------------------------------

                const returnedOrderId =
                  String(
                    paymentResponse
                      ?.razorpay_order_id ||
                      ""
                  );

                const expectedOrderId =
                  String(
                    razorpayOrder
                      ?.id ||
                      ""
                  );

                if (
                  !returnedOrderId ||
                  !expectedOrderId ||
                  returnedOrderId !==
                    expectedOrderId
                ) {
                  throw new Error(
                    "The Razorpay payment response does not match the current retry payment. Please try the payment again."
                  );
                }

                // -----------------------------------------
                // REQUIRED RAZORPAY DATA
                // -----------------------------------------

                if (
                  !paymentResponse
                    ?.razorpay_payment_id ||
                  !paymentResponse
                    ?.razorpay_signature
                ) {
                  throw new Error(
                    "Razorpay did not return the required payment verification details. Please try again."
                  );
                }

                // -----------------------------------------
                // VERIFY PAYMENT
                // -----------------------------------------

                const verificationResponse =
                  await verifyRazorpayPayment(
                    {
                      razorpay_order_id:
                        expectedOrderId,

                      razorpay_payment_id:
                        paymentResponse
                          .razorpay_payment_id,

                      razorpay_signature:
                        paymentResponse
                          .razorpay_signature,
                    }
                  );

                if (
                  !verificationResponse
                    ?.success
                ) {
                  throw new Error(
                    verificationResponse
                      ?.message ||
                      "Razorpay payment verification failed. The payment was not accepted by GETSUKA."
                  );
                }

                // -----------------------------------------
                // VERIFIED PAYMENT
                // -----------------------------------------

                const verifiedPaymentResponse =
                  {
                    ...paymentResponse,

                    razorpay_order_id:
                      expectedOrderId,
                  };

                // -----------------------------------------
                // CREATE REAL ORDER
                // -----------------------------------------

                const createdOrder =
                  await completeSuccessfulOrder(
                    {
                      orderData,

                      paymentResponse:
                        verifiedPaymentResponse,

                      paymentId:
                        updatedFailedPayment
                          .temporaryOrderNumber,
                    }
                  );

                // -----------------------------------------
                // MARK SUCCESS COMPLETE
                // -----------------------------------------

                sessionStorage.setItem(
                  successLockKey,
                  "completed"
                );

                setRetrying(
                  false
                );

                retryProcessingRef.current =
                  false;

                navigate(
                  "/checkout/order-placed",
                  {
                    replace:
                      true,

                    state: {
                      order:
                        createdOrder,
                    },
                  }
                );
              } catch (error) {
                console.error(
                  "Retry Payment Verification / Order Error:",
                  error
                );

                // -----------------------------------------
                // ALLOW ANOTHER ATTEMPT IF THIS ATTEMPT
                // DID NOT COMPLETE.
                // -----------------------------------------

                sessionStorage.removeItem(
                  successLockKey
                );

                setRetrying(
                  false
                );

                retryProcessingRef.current =
                  false;

                const serverMessage =
                  error
                    ?.response
                    ?.data
                    ?.message;

                setRetryError(
                  serverMessage ||
                    error?.message ||
                    "Payment verification or order creation failed. Please try again before the retry window expires."
                );
              }
            },

          // ---------------------------------------------
          // USER CLOSES RAZORPAY
          // ---------------------------------------------

          modal: {
            ondismiss:
              () => {
                setRetrying(
                  false
                );

                retryProcessingRef.current =
                  false;

                setRetryError(
                  "You closed the payment window before the payment was completed."
                );

                updateFailedPaymentStatus(
                  updatedFailedPayment,
                  "failed"
                );
              },
          },
        };

        // -------------------------------------------------
        // CREATE RAZORPAY INSTANCE
        // -------------------------------------------------

        const razorpay =
          new window.Razorpay(
            options
          );

        // -------------------------------------------------
        // RAZORPAY PAYMENT FAILED
        // -------------------------------------------------

        razorpay.on(
          "payment.failed",
          (
            response
          ) => {
            console.error(
              "Retry Razorpay Payment Failed:",
              response
            );

            try {
              razorpay.close();
            } catch (
              closeError
            ) {
              console.error(
                "Retry Razorpay Close Error:",
                closeError
              );
            }

            setRetrying(
              false
            );

            retryProcessingRef.current =
              false;

            const failureMessage =
              response
                ?.error
                ?.description ||
              response
                ?.error
                ?.reason ||
              "Your payment could not be completed. Please try again.";

            setRetryError(
              failureMessage
            );

            updateFailedPaymentStatus(
              updatedFailedPayment,
              "failed",
              failureMessage
            );
          }
        );

        // -------------------------------------------------
        // OPEN RAZORPAY
        // -------------------------------------------------

        razorpay.open();
      } catch (error) {
        console.error(
          "Retry Razorpay Error:",
          error
        );

        setRetrying(
          false
        );

        retryProcessingRef.current =
          false;

        setRetryError(
          error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            "Unable to start the payment. Please try again."
        );
      }
    };

  // =======================================================
  // VIEW MY ORDERS
  // =======================================================

  const handleViewMyOrders =
    () => {
      navigate(
        "/account/orders",
        {
          replace:
            true,
        }
      );
    };

  // =======================================================
  // CONTINUE SHOPPING
  // =======================================================

  const handleContinueShopping =
    () => {
      navigate(
        "/shop",
        {
          replace:
            true,
        }
      );
    };

  // =======================================================
  // BACK TO SHIPPING
  // =======================================================

  const handleBackToShipping =
    () => {
      navigate(
        "/checkout",
        {
          replace:
            true,
        }
      );
    };

  // =======================================================
  // FAILED ORDER INFO
  // =======================================================

  const temporaryOrderNumber =
    failedPayment
      ?.temporaryOrderNumber ||
    "FAILED-PAYMENT";

  const temporaryTotal =
    Number(
      failedPayment
        ?.total
    ) || 0;

  const temporaryOrderData =
    failedPayment
      ?.orderData ||
    {};

  const temporaryItemCount =
    Array.isArray(
      temporaryOrderData
        ?.items
    )
      ? temporaryOrderData.items.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item
                ?.quantity ||
                0
            ),
          0
        )
      : 0;

  // =======================================================
  // PAYMENT METHOD
  // =======================================================

  const activePaymentMethod =
    failedPayment
      ?.paymentMethod ||
    location.state
      ?.paymentMethod ||
    "razorpay";

  // =======================================================
  // ERROR MESSAGE
  // =======================================================

  const activeErrorMessage =
    retryError ||
    failedPayment
      ?.failureMessage ||
    location.state
      ?.message ||
    locationErrorMessage;

  // =======================================================
  // PAYMENT METHOD LABEL
  // =======================================================

  const paymentMethodLabel =
    useMemo(() => {
      if (
        activePaymentMethod ===
        "razorpay"
      ) {
        return "RAZORPAY";
      }

      if (
        activePaymentMethod ===
        "wallet"
      ) {
        return "GETSUKA WALLET";
      }

      if (
        activePaymentMethod ===
        "cod"
      ) {
        return "CASH ON DELIVERY";
      }

      return String(
        activePaymentMethod ||
          "RAZORPAY"
      ).toUpperCase();
    }, [
      activePaymentMethod,
    ]);

  // =======================================================
  // FORMAT PRICE
  // =======================================================

  const formatPrice =
    (value) => {
      return `₹${Number(
        value || 0
      ).toLocaleString(
        "en-IN"
      )}`;
    };

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ===================================================
          FAILURE ANIMATION
      =================================================== */}

      {animationVisible && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black">

          <div className="relative flex h-[180px] w-[180px] items-center justify-center">

            <div className="absolute h-[150px] w-[150px] animate-ping rounded-full border border-red-500/20" />

            <div className="absolute h-[110px] w-[110px] rounded-full border border-red-500/40" />

            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-red-500 bg-red-500/5">

              <span className="text-[42px] font-light text-red-500">
                ×
              </span>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="border-b border-white/10">

        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/",
                {
                  replace:
                    true,
                }
              )
            }
            className="text-[14px] font-medium tracking-[0.25em] transition hover:text-red-500"
          >
            GETSUKA
          </button>

          <span className="text-[8px] tracking-[0.25em] text-white/30">
            PAYMENT
          </span>

        </div>

      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-12 sm:px-8 sm:py-[60px]">

        <div className="w-full max-w-[560px]">

          {/* =================================================
              FAILURE ICON
          ================================================= */}

          <div className="flex justify-center">

            <div className="relative flex h-[90px] w-[90px] items-center justify-center rounded-full border border-red-500/40 bg-red-500/[0.03]">

              <div className="absolute inset-[8px] rounded-full border border-red-500/20" />

              <span className="text-[42px] font-light text-red-500">
                ×
              </span>

            </div>

          </div>

          {/* =================================================
              TITLE
          ================================================= */}

          <div className="mt-[30px] text-center">

            <p className="mb-[12px] text-[8px] tracking-[0.35em] text-red-500">
              PAYMENT UNSUCCESSFUL
            </p>

            <h1 className="text-[26px] font-light tracking-[0.1em] sm:text-[30px]">
              PAYMENT FAILED
            </h1>

            <p className="mx-auto mt-[15px] max-w-[430px] text-[10px] leading-[1.8] text-white/40 sm:text-[11px]">
              We could not complete your
              payment. Your order has not
              been placed.
            </p>

          </div>

          {/* =================================================
              FAILED ORDER CARD
          ================================================= */}

          {failedPayment && (
            <div className="mt-[35px] border border-white/10 bg-white/[0.02]">

              {/* HEADER */}

              <div className="border-b border-white/10 px-5 py-5 sm:px-[24px]">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-[7px] tracking-[0.2em] text-white/25">
                      PAYMENT ATTEMPT
                    </p>

                    <p className="mt-[7px] text-[10px] tracking-[0.08em]">
                      {temporaryOrderNumber}
                    </p>

                  </div>

                  <span className="border border-red-500/30 px-3 py-2 text-[7px] tracking-[0.15em] text-red-500">
                    PAYMENT FAILED
                  </span>

                </div>

              </div>

              {/* DETAILS */}

              <div className="px-5 py-5 sm:px-[24px]">

                <div className="grid grid-cols-2 gap-5">

                  <div>

                    <p className="text-[7px] tracking-[0.18em] text-white/25">
                      PAYMENT METHOD
                    </p>

                    <p className="mt-[7px] text-[9px]">
                      {paymentMethodLabel}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-[7px] tracking-[0.18em] text-white/25">
                      AMOUNT
                    </p>

                    <p className="mt-[7px] text-[14px]">
                      {formatPrice(
                        temporaryTotal
                      )}
                    </p>

                  </div>

                  <div>

                    <p className="text-[7px] tracking-[0.18em] text-white/25">
                      ITEMS
                    </p>

                    <p className="mt-[7px] text-[9px]">
                      {temporaryItemCount}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-[7px] tracking-[0.18em] text-white/25">
                      STATUS
                    </p>

                    <p className="mt-[7px] text-[9px] text-red-500">
                      UNPAID
                    </p>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          <div className="mt-[12px] border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-[24px]">

            <p className="mb-[8px] text-[7px] tracking-[0.2em] text-white/25">
              PAYMENT STATUS
            </p>

            <p className="text-[9px] leading-[1.7] text-white/60">
              {activeErrorMessage}
            </p>

          </div>

          {/* =================================================
              RETRY SECTION
          ================================================= */}

          {activePaymentMethod ===
            "razorpay" && (
            <div className="mt-[30px]">

              {/* =============================================
                  RETRY BUTTON
              ============================================= */}

              <button
                type="button"
                onClick={
                  handleRetryPayment
                }
                disabled={
                  retrying ||
                  timeLeft <=
                    0 ||
                  !failedPayment
                }
                className={`flex h-[52px] w-full items-center justify-center gap-[10px] text-[9px] font-medium tracking-[0.2em] transition ${
                  timeLeft <= 0 ||
                  !failedPayment
                    ? "cursor-not-allowed bg-white/10 text-white/30"
                    : "bg-white text-black hover:bg-red-500 hover:text-white"
                } ${
                  retrying
                    ? "cursor-wait opacity-60"
                    : ""
                }`}
              >

                {retrying
                  ? "OPENING RAZORPAY..."
                  : timeLeft <=
                      0
                  ? "RETRY WINDOW EXPIRED"
                  : "RETRY PAYMENT"}

                {!retrying &&
                  timeLeft >
                    0 &&
                  failedPayment && (
                    <span>
                      →
                    </span>
                  )}

              </button>

              {/* =============================================
                  TIMER
              ============================================= */}

              {timeLeft >
              0 ? (
                <div className="mt-[16px] text-center">

                  <p className="text-[7px] tracking-[0.18em] text-white/25">
                    RETRY WINDOW EXPIRES IN
                  </p>

                  <p className="mt-[6px] text-[18px] font-light tracking-[0.12em]">
                    {formatTime()}
                  </p>

                  <p className="mt-[7px] text-[7px] leading-[1.6] tracking-[0.08em] text-white/20">
                    THIS TIMER WILL NOT RESET
                    IF YOU LEAVE THIS PAGE.
                  </p>

                </div>
              ) : (
                <div className="mt-[16px] text-center">

                  <p className="text-[8px] tracking-[0.18em] text-red-500">
                    RETRY WINDOW EXPIRED
                  </p>

                  <p className="mt-[7px] text-[7px] tracking-[0.1em] text-white/20">
                    THE FAILED PAYMENT HAS BEEN
                    REMOVED FROM YOUR ORDER VIEW.
                  </p>

                </div>
              )}

              {/* =============================================
                  INFORMATION
              ============================================= */}

              <p className="mt-[15px] text-center text-[7px] leading-[1.7] tracking-[0.1em] text-white/20">
                A NEW SECURE RAZORPAY ORDER
                WILL BE CREATED FOR EVERY
                RETRY ATTEMPT.
              </p>

            </div>
          )}

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-[30px] grid grid-cols-1 gap-[10px] sm:grid-cols-2">

            <button
              type="button"
              onClick={
                handleViewMyOrders
              }
              disabled={
                retrying
              }
              className="h-[48px] border border-white/20 text-[8px] tracking-[0.18em] text-white/60 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              VIEW MY ORDERS
            </button>

            <button
              type="button"
              onClick={
                handleContinueShopping
              }
              disabled={
                retrying
              }
              className="h-[48px] border border-white/20 text-[8px] tracking-[0.18em] text-white/60 transition hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              CONTINUE SHOPPING
            </button>

          </div>

          {/* =================================================
              BACK TO SHIPPING
          ================================================= */}

          <button
            type="button"
            onClick={
              handleBackToShipping
            }
            disabled={
              retrying
            }
            className="mt-[22px] block w-full text-center text-[8px] tracking-[0.18em] text-white/25 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
          >
            ← BACK TO SHIPPING
          </button>

          {/* =================================================
              SECURITY
          ================================================= */}

          <div className="mt-[35px] border-t border-white/10 pt-[20px] text-center">

            <p className="text-[7px] tracking-[0.2em] text-white/20">
              SECURE PAYMENT · GETSUKA
            </p>

          </div>

        </div>

      </main>

    </div>
  );
};

export default PaymentFailedPage;