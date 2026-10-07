import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  getWallet,
  getWalletTransactions,
  createWalletTopupOrder,
  verifyWalletTopupPayment,
} from "../api/walletApi";

import { loadRazorpay } from "../../checkout/utils/loadRazorpay";

// =========================================================
// WALLET PAGE
// =========================================================

const WalletPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // =======================================================
  // STATE
  // =======================================================

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [topupModalOpen, setTopupModalOpen] =
    useState(false);

  const [topupAmount, setTopupAmount] =
    useState("");

  const [topupProcessing, setTopupProcessing] =
    useState(false);

  const [topupError, setTopupError] =
    useState("");

  // =======================================================
  // FETCH WALLET
  // =======================================================

  useEffect(() => {
    const fetchWallet = async () => {
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

        const [walletData, transactionData] =
          await Promise.all([
            getWallet(),
            getWalletTransactions(),
          ]);

        if (!walletData.success) {
          setError(
            walletData.message ||
              "Failed to load wallet."
          );

          return;
        }

        if (!transactionData.success) {
          setError(
            transactionData.message ||
              "Failed to load wallet transactions."
          );

          return;
        }

        setBalance(
          Number(walletData.wallet?.balance) || 0
        );

        setTransactions(
          transactionData.transactions || []
        );
      } catch (err) {
        console.error(
          "Get Wallet Page Error:",
          err
        );

        if (
          err.response?.status === 401
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
          err.response?.data?.message ||
            err.message ||
            "Failed to load wallet."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
  }, [navigate]);

  // =======================================================
  // ADD MONEY MODAL
  // =======================================================

  const openTopupModal = () => {
    setTopupAmount("");
    setTopupError("");
    setTopupModalOpen(true);
  };

  const closeTopupModal = () => {
    if (topupProcessing) {
      return;
    }

    setTopupModalOpen(false);
    setTopupAmount("");
    setTopupError("");
  };

  // =======================================================
  // ADD MONEY THROUGH RAZORPAY
  // =======================================================

  const handleWalletTopup = async () => {
    setTopupError("");

    const amount = Number(topupAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setTopupError(
        "Enter a valid amount."
      );

      return;
    }

    if (!Number.isInteger(amount * 100)) {
      setTopupError(
        "Amount can have a maximum of two decimal places."
      );

      return;
    }

    setTopupProcessing(true);

    try {
      // ---------------------------------------------------
      // LOAD RAZORPAY
      // ---------------------------------------------------

      const razorpayLoaded =
        await loadRazorpay();

      if (!razorpayLoaded) {
        throw new Error(
          "Unable to load Razorpay. Please check your internet connection and try again."
        );
      }

      // ---------------------------------------------------
      // CREATE WALLET TOP-UP ORDER
      // ---------------------------------------------------

      const createResponse =
        await createWalletTopupOrder(
          amount
        );

      if (
        !createResponse?.success ||
        !createResponse?.order?.id
      ) {
        throw new Error(
          createResponse?.message ||
            "Unable to create wallet payment order."
        );
      }

      // ---------------------------------------------------
      // RAZORPAY KEY
      // ---------------------------------------------------

      const razorpayKey =
        import.meta.env
          .VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          "Razorpay key is missing. Please check the frontend .env file."
        );
      }

      const razorpayOrder =
        createResponse.order;

      // ---------------------------------------------------
      // RAZORPAY OPTIONS
      // ---------------------------------------------------

      const options = {
        key: razorpayKey,

        amount:
          razorpayOrder.amount,

        currency:
          razorpayOrder.currency ||
          "INR",

        name: "GETSUKA",

        description:
          "Add money to GETSUKA Wallet",

        order_id:
          razorpayOrder.id,

        handler: async (
          response
        ) => {
          try {
            // ---------------------------------------------
            // VERIFY WALLET PAYMENT
            // ---------------------------------------------

            const verifyResponse =
              await verifyWalletTopupPayment({
                razorpay_order_id:
                  response?.razorpay_order_id,

                razorpay_payment_id:
                  response?.razorpay_payment_id,

                razorpay_signature:
                  response?.razorpay_signature,
              });

            if (
              !verifyResponse?.success
            ) {
              throw new Error(
                verifyResponse?.message ||
                  "Wallet payment verification failed."
              );
            }

            // ---------------------------------------------
            // UPDATE BALANCE
            // ---------------------------------------------

            const newBalance =
              Number(
                verifyResponse
                  ?.wallet
                  ?.balance
              ) || 0;

            setBalance(
              newBalance
            );

            // ---------------------------------------------
            // UPDATE TRANSACTION LIST
            // ---------------------------------------------

            if (
              verifyResponse?.transaction
            ) {
              setTransactions(
                (
                  currentTransactions
                ) => [
                  verifyResponse.transaction,

                  ...currentTransactions.filter(
                    (
                      transaction
                    ) =>
                      transaction._id !==
                      verifyResponse
                        .transaction
                        ._id
                  ),
                ]
              );
            }

            // ---------------------------------------------
            // CLOSE MODAL
            // ---------------------------------------------

            setTopupModalOpen(
              false
            );

            setTopupAmount("");

            setTopupError("");

            setTopupProcessing(
              false
            );
          } catch (error) {
            console.error(
              "Wallet Top-Up Verification Error:",
              error
            );

            setTopupError(
              error?.response?.data
                ?.message ||
                error?.message ||
                "Wallet top-up verification failed. Please contact support if money was deducted."
            );

            setTopupProcessing(
              false
            );
          }
        },

        prefill: {},

        theme: {
          color: "#dc2626",
        },

        modal: {
          ondismiss: () => {
            setTopupProcessing(
              false
            );
          },
        },
      };

      // ---------------------------------------------------
      // OPEN RAZORPAY
      // ---------------------------------------------------

      const razorpay =
        new window.Razorpay(
          options
        );

      // ---------------------------------------------------
      // PAYMENT FAILED
      // ---------------------------------------------------

      razorpay.on(
        "payment.failed",
        (response) => {
          console.error(
            "Wallet Razorpay Payment Failed:",
            response
          );

          setTopupError(
            response?.error
              ?.description ||
              response?.error?.reason ||
              "Wallet payment failed. Please try again."
          );

          setTopupProcessing(
            false
          );
        }
      );

      razorpay.open();
    } catch (error) {
      console.error(
        "Wallet Top-Up Error:",
        error
      );

      setTopupError(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Unable to start wallet top-up. Please try again."
      );

      setTopupProcessing(
        false
      );
    }
  };

  // =======================================================
  // SIDEBAR ACTIVE
  // =======================================================

  const isActive = (path) => {
    return (
      location.pathname === path
    );
  };

  // =======================================================
  // LOGOUT
  // =======================================================

  const handleLogout = () => {
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
  };

  // =======================================================
  // FORMAT MONEY
  // =======================================================

  const formatAmount = (
    amount
  ) => {
    return `₹${Number(
      amount || 0
    ).toFixed(2)}`;
  };

  // =======================================================
  // FORMAT DATE
  // =======================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
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

  // =======================================================
  // FORMAT TIME
  // =======================================================

  const formatTime = (
    date
  ) => {
    if (!date) {
      return "";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return parsedDate.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =======================================================
  // TRANSACTION TITLE
  // =======================================================

  const getTransactionTitle = (
    transaction
  ) => {
    if (
      transaction.reason ===
      "order_cancellation_refund"
    ) {
      return "ORDER CANCELLATION REFUND";
    }

    if (
      transaction.reason ===
      "order_return_refund"
    ) {
      return "ORDER RETURN REFUND";
    }

    if (
      transaction.reason ===
      "wallet_payment"
    ) {
      return "WALLET PAYMENT";
    }

    if (
      transaction.reason ===
      "wallet_topup"
    ) {
      return "WALLET TOP-UP";
    }

    if (
      transaction.reason ===
      "manual_credit"
    ) {
      return "WALLET CREDIT";
    }

    if (
      transaction.reason ===
      "manual_debit"
    ) {
      return "WALLET DEBIT";
    }

    return transaction.type ===
      "credit"
      ? "WALLET CREDIT"
      : "WALLET DEBIT";
  };

  // =======================================================
  // TRANSACTION DESCRIPTION
  // =======================================================

  const getTransactionDescription =
    (
      transaction
    ) => {
      if (
        transaction.description
      ) {
        return transaction.description;
      }

      if (
        transaction.orderNumber
      ) {
        return `Order ${transaction.orderNumber}`;
      }

      return transaction.type ===
        "credit"
        ? "Amount added to wallet"
        : "Amount deducted from wallet";
    };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <p className="text-[11px] tracking-[0.2em] text-gray-500">
          LOADING WALLET...
        </p>
      </div>
    );
  }

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      <main className="w-full max-w-[1400px] mx-auto min-h-[calc(100vh-78px)] flex flex-col lg:flex-row">

        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 border-r border-white/10 px-8 xl:px-12 pt-[54px]">

          <p className="text-[12px] tracking-[0.25em] text-gray-500 mb-10 whitespace-nowrap">
            MY ACCOUNT
          </p>

          <nav className="space-y-8">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive(
                  "/account"
                )
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
              className={`block text-left text-[13px] whitespace-nowrap transition ${
                isActive(
                  "/account/wallet"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
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

        {/* =================================================
            MOBILE ACCOUNT NAVIGATION
        ================================================= */}

        <div className="lg:hidden w-full border-b border-white/10 px-5 sm:px-8 py-5">

          <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-5">
            MY ACCOUNT
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            {/* ACCOUNT DETAILS */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive(
                  "/account"
                )
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
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive(
                  "/account/wallet"
                )
                  ? "text-white"
                  : "text-gray-500"
              }`}
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

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="flex-1 min-w-0 px-5 sm:px-8 lg:px-[51px] xl:pr-[70px] pt-8 sm:pt-10 lg:pt-[54px] pb-12">

          {/* HEADER */}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">

            <div>

              <p className="text-[11px] tracking-[0.25em] text-gray-500 mb-4">
                ACCOUNT
              </p>

              <h1 className="text-[30px] sm:text-[38px] font-light tracking-tight">
                My Wallet
              </h1>

            </div>

            {/* ADD MONEY */}

            <button
              type="button"
              onClick={
                openTopupModal
              }
              className="w-full sm:w-auto border border-red-500 px-7 py-3 text-[12px] tracking-wide text-white transition hover:bg-red-500 hover:text-white disabled:opacity-50"
              disabled={
                topupProcessing
              }
            >
              ADD MONEY
            </button>

          </div>

          {/* ERROR */}

          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-5 py-4 mb-8">

              <p className="text-[12px] text-red-400">
                {error}
              </p>

            </div>
          )}

          {/* =================================================
              WALLET BALANCE
          ================================================= */}

          <div className="border border-white/10 p-6 sm:p-8 lg:p-10 mb-8">

            <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-5">
              AVAILABLE BALANCE
            </p>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">

              <div>

                <p className="text-[38px] sm:text-[48px] lg:text-[56px] font-light tracking-tight">
                  {formatAmount(
                    balance
                  )}
                </p>

                <p className="text-[11px] text-gray-600 mt-2">
                  GETSUKA WALLET
                </p>

              </div>

              <div className="border border-white/10 px-5 py-4 sm:min-w-[180px]">

                <p className="text-[9px] tracking-[0.2em] text-gray-600 mb-2">
                  WALLET STATUS
                </p>

                <p className="text-[12px] text-white">
                  ACTIVE
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              WALLET INFORMATION
          ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">

            <div className="border border-white/10 p-6">

              <p className="text-[10px] tracking-[0.2em] text-gray-600 mb-3">
                WALLET BALANCE
              </p>

              <p className="text-xl font-light">
                {formatAmount(
                  balance
                )}
              </p>

            </div>

            <div className="border border-white/10 p-6">

              <p className="text-[10px] tracking-[0.2em] text-gray-600 mb-3">
                TRANSACTIONS
              </p>

              <p className="text-xl font-light">
                {transactions.length}
              </p>

            </div>

          </div>

          {/* =================================================
              TRANSACTIONS
          ================================================= */}

          <div>

            <div className="flex items-center justify-between mb-6">

              <div>

                <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-2">
                  WALLET
                </p>

                <h2 className="text-[24px] font-light">
                  Transaction History
                </h2>

              </div>

            </div>

            {transactions.length ===
            0 ? (
              <div className="border border-white/10 px-6 py-14 text-center">

                <p className="text-[12px] tracking-wide text-gray-500">
                  NO TRANSACTIONS YET
                </p>

                <p className="text-[11px] text-gray-700 mt-3">
                  Your wallet transactions will appear here.
                </p>

              </div>
            ) : (
              <div className="border border-white/10 overflow-hidden">

                {/* DESKTOP TABLE HEADER */}

                <div className="hidden md:grid grid-cols-[1fr_170px_130px] gap-6 px-6 py-4 border-b border-white/10">

                  <p className="text-[9px] tracking-[0.2em] text-gray-600">
                    TRANSACTION
                  </p>

                  <p className="text-[9px] tracking-[0.2em] text-gray-600">
                    DATE
                  </p>

                  <p className="text-[9px] tracking-[0.2em] text-gray-600 text-right">
                    AMOUNT
                  </p>

                </div>

                {/* TRANSACTIONS */}

                <div>

                  {transactions.map(
                    (
                      transaction,
                      index
                    ) => {

                      const isCredit =
                        transaction.type ===
                        "credit";

                      return (
                        <div
                          key={
                            transaction._id ||
                            `${transaction.createdAt}-${index}`
                          }
                          className="border-b border-white/10 last:border-b-0 px-5 sm:px-6 py-5"
                        >

                          {/* DESKTOP */}

                          <div className="hidden md:grid grid-cols-[1fr_170px_130px] gap-6 items-center">

                            <div className="min-w-0">

                              <p className="text-[12px] text-white">
                                {getTransactionTitle(
                                  transaction
                                )}
                              </p>

                              <p className="text-[11px] text-gray-600 mt-2">
                                {getTransactionDescription(
                                  transaction
                                )}
                              </p>

                              {transaction.orderNumber && (
                                <p className="text-[10px] text-gray-700 mt-2">
                                  ORDER #
                                  {" "}
                                  {transaction.orderNumber}
                                </p>
                              )}

                            </div>

                            <div>

                              <p className="text-[11px] text-gray-400">
                                {formatDate(
                                  transaction.createdAt
                                )}
                              </p>

                              <p className="text-[10px] text-gray-700 mt-1">
                                {formatTime(
                                  transaction.createdAt
                                )}
                              </p>

                            </div>

                            <div className="text-right">

                              <p
                                className={`text-[13px] ${
                                  isCredit
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {isCredit
                                  ? "+"
                                  : "-"}
                                {formatAmount(
                                  transaction.amount
                                )}
                              </p>

                              <p className="text-[9px] text-gray-700 mt-2">
                                BALANCE{" "}
                                {formatAmount(
                                  transaction.balanceAfterTransaction
                                )}
                              </p>

                            </div>

                          </div>

                          {/* MOBILE */}

                          <div className="md:hidden">

                            <div className="flex items-start justify-between gap-5">

                              <div className="min-w-0">

                                <p className="text-[12px] text-white">
                                  {getTransactionTitle(
                                    transaction
                                  )}
                                </p>

                                <p className="text-[11px] text-gray-600 mt-2">
                                  {getTransactionDescription(
                                    transaction
                                  )}
                                </p>

                              </div>

                              <p
                                className={`text-[13px] whitespace-nowrap ${
                                  isCredit
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {isCredit
                                  ? "+"
                                  : "-"}
                                {formatAmount(
                                  transaction.amount
                                )}
                              </p>

                            </div>

                            <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-white/10">

                              <div>

                                <p className="text-[10px] text-gray-500">
                                  {formatDate(
                                    transaction.createdAt
                                  )}
                                </p>

                                <p className="text-[9px] text-gray-700 mt-1">
                                  {formatTime(
                                    transaction.createdAt
                                  )}
                                </p>

                              </div>

                              <p className="text-[9px] text-gray-700">
                                BALANCE{" "}
                                {formatAmount(
                                  transaction.balanceAfterTransaction
                                )}
                              </p>

                            </div>

                            {transaction.orderNumber && (
                              <p className="text-[9px] text-gray-700 mt-3">
                                ORDER #
                                {" "}
                                {transaction.orderNumber}
                              </p>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

          </div>

          {/* =================================================
              FUTURE WALLET FEATURES
          ================================================= */}

          <div className="mt-10 border-t border-white/10 pt-8">

            <p className="text-[10px] tracking-[0.2em] text-gray-600 mb-4">
              GETSUKA WALLET
            </p>

            <p className="text-[11px] leading-6 text-gray-600 max-w-[700px]">
              Wallet balance can be used for future GETSUKA
              purchases. Refunds from eligible cancelled or
              returned orders will also be credited here.
            </p>

          </div>

        </section>

      </main>

      {/* =====================================================
          ADD MONEY MODAL
      ===================================================== */}

      {topupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">

          <div className="w-full max-w-[440px] border border-white/10 bg-black p-6 sm:p-8 shadow-2xl">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-3">
                  GETSUKA WALLET
                </p>

                <h2 className="text-[24px] font-light text-white">
                  Add Money
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  closeTopupModal
                }
                disabled={
                  topupProcessing
                }
                className="text-gray-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close add money modal"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

            </div>

            <div className="mt-8">

              <label
                htmlFor="wallet-topup-amount"
                className="mb-3 block text-[10px] tracking-[0.2em] text-gray-500"
              >
                AMOUNT
              </label>

              <div className="flex items-center border border-white/15 focus-within:border-white/40">

                <span className="px-4 text-[15px] text-gray-500">
                  ₹
                </span>

                <input
                  id="wallet-topup-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={
                    topupAmount
                  }
                  onChange={(
                    event
                  ) =>
                    setTopupAmount(
                      event.target.value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !topupProcessing
                    ) {
                      handleWalletTopup();
                    }
                  }}
                  disabled={
                    topupProcessing
                  }
                  placeholder="Enter amount"
                  className="w-full bg-transparent px-2 py-4 text-[15px] text-white outline-none placeholder:text-gray-700 disabled:cursor-not-allowed"
                />

              </div>

              <p className="mt-3 text-[10px] leading-5 text-gray-600">
                You will be redirected to Razorpay to complete the payment securely.
              </p>

              {topupError && (
                <div className="mt-5 border border-red-500/30 bg-red-500/5 px-4 py-3">

                  <p className="text-[11px] leading-5 text-red-400">
                    {topupError}
                  </p>

                </div>
              )}

              <button
                type="button"
                onClick={
                  handleWalletTopup
                }
                disabled={
                  topupProcessing
                }
                className="mt-7 w-full border border-red-500 bg-red-500 px-6 py-4 text-[11px] tracking-[0.15em] text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {topupProcessing
                  ? "PROCESSING..."
                  : "CONTINUE TO RAZORPAY"}
              </button>

              <button
                type="button"
                onClick={
                  closeTopupModal
                }
                disabled={
                  topupProcessing
                }
                className="mt-3 w-full px-6 py-3 text-[10px] tracking-[0.15em] text-gray-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                CANCEL
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default WalletPage;