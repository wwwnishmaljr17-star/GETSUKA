import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getMyReferral,
  getReferralHistory,
} from "../api/referralApi";

const ReferralPage = () => {
  const navigate = useNavigate();

  const [referralData, setReferralData] =
    useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] =
    useState("");

  const [copied, setCopied] = useState(false);

  // =========================================================
  // GET REFERRAL DETAILS
  // =========================================================

  const fetchReferralDetails = async () => {
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

      const response =
        await getMyReferral();

      if (response?.success) {
        setReferralData(
          response.data || null
        );
      } else {
        setError(
          response?.message ||
            "Failed to load referral details."
        );
      }
    } catch (error) {
      console.error(
        "Fetch Referral Details Error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
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
        error.response?.data?.message ||
          "Failed to load referral details."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GET REFERRAL HISTORY
  // =========================================================

  const fetchReferralHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("token");

      if (!token) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      const response =
        await getReferralHistory();

      if (response?.success) {
        setHistory(
          response?.data?.referrals || []
        );
      } else {
        setHistoryError(
          response?.message ||
            "Failed to load referral history."
        );
      }
    } catch (error) {
      console.error(
        "Fetch Referral History Error:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login", {
          replace: true,
        });

        return;
      }

      setHistoryError(
        error.response?.data?.message ||
          "Failed to load referral history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    fetchReferralDetails();
    fetchReferralHistory();
  }, []);

  // =========================================================
  // COPY REFERRAL LINK
  // =========================================================

  const handleCopyLink = async () => {
    if (!referralData?.referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralData.referralLink
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy Referral Link Error:",
        error
      );
    }
  };

  // =========================================================
  // COPY REFERRAL CODE
  // =========================================================

  const handleCopyCode = async () => {
    if (!referralData?.referralCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralData.referralCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "Copy Referral Code Error:",
        error
      );
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // STATUS LABEL
  // =========================================================

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "COMPLETED";

      case "pending":
        return "PENDING";

      case "expired":
        return "EXPIRED";

      case "cancelled":
        return "CANCELLED";

      default:
        return status
          ? status.toUpperCase()
          : "UNKNOWN";
    }
  };

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (status) => {
    switch (status) {
      case "completed":
        return "border-white/20 text-white";

      case "pending":
        return "border-yellow-500/30 text-yellow-500";

      case "expired":
        return "border-red-500/30 text-red-500";

      case "cancelled":
        return "border-red-500/30 text-red-500";

      default:
        return "border-white/10 text-gray-500";
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <p className="text-sm tracking-wide text-gray-500">
          Loading referral...
        </p>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="text-center">

          <p className="text-red-500 text-sm mb-5">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              fetchReferralDetails();
              fetchReferralHistory();
            }}
            className="px-6 py-3 border border-white/20 text-[11px] tracking-[0.12em] hover:bg-white hover:text-black transition"
          >
            TRY AGAIN
          </button>

        </div>
      </div>
    );
  }

  if (!referralData) {
    return null;
  }

  // =========================================================
  // REFERRAL VALUES
  // =========================================================

  const completedReferrals =
    referralData.completedReferrals || 0;

  const pendingReferrals =
    referralData.pendingReferrals || 0;

  const remainingReferrals =
    referralData.remainingReferrals || 0;

  const maxReferrals =
    referralData.maxReferrals || 5;

  const rewardPerReferral =
    referralData.rewardPerReferral || 350;

  const totalEarned =
    referralData.totalEarned || 0;

  const maximumEarning =
    referralData.maximumEarning ||
    maxReferrals * rewardPerReferral;

  const progressPercentage =
    maxReferrals > 0
      ? Math.min(
          (completedReferrals /
            maxReferrals) *
            100,
          100
        )
      : 0;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      <div className="w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-[51px] xl:px-[70px] pt-8 sm:pt-10 lg:pt-[54px] pb-16">

        {/* =====================================================
            BACK
        ===================================================== */}

        <button
          type="button"
          onClick={() =>
            navigate("/account")
          }
          className="text-[10px] sm:text-[11px] tracking-[0.16em] text-gray-500 hover:text-white transition mb-8"
        >
          ← BACK TO ACCOUNT
        </button>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-10 sm:mb-12">

          <p className="text-[10px] sm:text-[12px] tracking-[0.3em] text-gray-500 mb-3 sm:mb-4">
            GETSUKA REWARDS
          </p>

          <h1 className="text-[28px] sm:text-[34px] lg:text-[40px] font-light">
            Refer & Earn
          </h1>

          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-3 max-w-[620px] leading-6">
            Invite your friends to GETSUKA and earn
            ₹{rewardPerReferral} for every successful
            referral.
          </p>

        </div>

        {/* =====================================================
            STATS
        ===================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-3 border border-white/10 mb-8">

          {/* REWARD */}

          <div className="px-5 sm:px-7 lg:px-8 py-6 sm:py-7 border-b sm:border-b-0 sm:border-r border-white/10">

            <p className="text-[9px] sm:text-[10px] tracking-[0.2em] text-gray-500 mb-3">
              REWARD PER REFERRAL
            </p>

            <p className="text-2xl sm:text-3xl font-light">
              ₹{rewardPerReferral}
            </p>

          </div>

          {/* COMPLETED */}

          <div className="px-5 sm:px-7 lg:px-8 py-6 sm:py-7 border-b sm:border-b-0 sm:border-r border-white/10">

            <p className="text-[9px] sm:text-[10px] tracking-[0.2em] text-gray-500 mb-3">
              SUCCESSFUL REFERRALS
            </p>

            <p className="text-2xl sm:text-3xl font-light">
              {completedReferrals}

              <span className="text-gray-600 text-lg sm:text-xl">
                {" "}
                / {maxReferrals}
              </span>
            </p>

          </div>

          {/* TOTAL EARNED */}

          <div className="px-5 sm:px-7 lg:px-8 py-6 sm:py-7">

            <p className="text-[9px] sm:text-[10px] tracking-[0.2em] text-gray-500 mb-3">
              TOTAL EARNED
            </p>

            <p className="text-2xl sm:text-3xl font-light">
              ₹{totalEarned}
            </p>

          </div>

        </div>

        {/* =====================================================
            MAIN GRID
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8">

          {/* ===================================================
              LEFT
          =================================================== */}

          <div className="min-w-0">

            {/* =================================================
                REFERRAL LINK CARD
            ================================================= */}

            <div className="border border-white/10 p-5 sm:p-7 lg:p-8">

              <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-3">
                YOUR REFERRAL LINK
              </p>

              <h2 className="text-xl sm:text-2xl font-light mb-2">
                Share GETSUKA
              </h2>

              <p className="text-[11px] sm:text-[12px] text-gray-500 leading-5 mb-7">
                Share your unique referral link with
                friends. Once the referral requirement
                is completed, you receive ₹
                {rewardPerReferral}.
              </p>

              {/* LINK */}

              <div className="flex flex-col sm:flex-row border border-white/10">

                <div className="flex-1 min-w-0 px-4 sm:px-5 py-4">

                  <p className="text-[11px] sm:text-[12px] text-gray-400 break-all leading-5">
                    {referralData.referralLink}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 px-5 sm:px-7 py-4 text-[10px] tracking-[0.14em] hover:bg-white hover:text-black transition"
                >
                  {copied
                    ? "COPIED"
                    : "COPY LINK"}
                </button>

              </div>

              {/* REFERRAL CODE */}

              <div className="mt-6">

                <p className="text-[9px] tracking-[0.2em] text-gray-600 mb-3">
                  REFERRAL CODE
                </p>

                <div className="flex items-center justify-between gap-4 border border-white/10 px-4 sm:px-5 py-4">

                  <p className="text-[12px] sm:text-[13px] tracking-[0.08em] break-all">
                    {referralData.referralCode}
                  </p>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="shrink-0 text-[9px] tracking-[0.12em] text-gray-400 hover:text-white transition"
                  >
                    COPY
                  </button>

                </div>

              </div>

            </div>

            {/* =================================================
                PROGRESS CARD
            ================================================= */}

            <div className="border border-white/10 p-5 sm:p-7 lg:p-8 mt-8">

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">

                <div>

                  <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-3">
                    REFERRAL PROGRESS
                  </p>

                  <h2 className="text-xl sm:text-2xl font-light">
                    {completedReferrals} of{" "}
                    {maxReferrals} completed
                  </h2>

                </div>

                <p className="text-[11px] text-gray-500">
                  {remainingReferrals}{" "}
                  {remainingReferrals === 1
                    ? "spot"
                    : "spots"}{" "}
                  remaining
                </p>

              </div>

              {/* PROGRESS BAR */}

              <div className="w-full h-[3px] bg-white/10">

                <div
                  className="h-full bg-white transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />

              </div>

              <div className="flex items-center justify-between mt-4">

                <p className="text-[9px] tracking-[0.12em] text-gray-600">
                  ₹0
                </p>

                <p className="text-[9px] tracking-[0.12em] text-gray-600">
                  MAX ₹{maximumEarning}
                </p>

              </div>

            </div>

            {/* =================================================
                REFERRAL HISTORY
            ================================================= */}

            <div className="border border-white/10 mt-8">

              <div className="px-5 sm:px-7 lg:px-8 py-6 border-b border-white/10">

                <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-2">
                  REFERRAL HISTORY
                </p>

                <h2 className="text-xl sm:text-2xl font-light">
                  Your referrals
                </h2>

              </div>

              {historyLoading ? (
                <div className="px-5 sm:px-7 lg:px-8 py-10">
                  <p className="text-[11px] text-gray-500">
                    Loading referral history...
                  </p>
                </div>
              ) : historyError ? (
                <div className="px-5 sm:px-7 lg:px-8 py-10">

                  <p className="text-[11px] text-red-500">
                    {historyError}
                  </p>

                  <button
                    type="button"
                    onClick={
                      fetchReferralHistory
                    }
                    className="mt-4 text-[9px] tracking-[0.12em] text-white hover:text-gray-400 transition"
                  >
                    TRY AGAIN
                  </button>

                </div>
              ) : history.length === 0 ? (
                <div className="px-5 sm:px-7 lg:px-8 py-12">

                  <p className="text-sm text-gray-400">
                    No referrals yet.
                  </p>

                  <p className="text-[11px] text-gray-600 mt-2 leading-5">
                    Share your referral link to
                    start earning rewards.
                  </p>

                </div>
              ) : (
                <div>

                  {history.map(
                    (referral, index) => {

                      const referredUser =
                        referral.referredUser;

                      return (
                        <div
                          key={
                            referral._id ||
                            index
                          }
                          className={`px-5 sm:px-7 lg:px-8 py-5 sm:py-6 ${
                            index !==
                            history.length - 1
                              ? "border-b border-white/10"
                              : ""
                          }`}
                        >

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                            {/* USER */}

                            <div className="flex items-center gap-4 min-w-0">

                              <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden bg-white text-black flex items-center justify-center text-sm font-semibold">

                                {referredUser?.profileImage ? (
                                  <img
                                    src={
                                      referredUser.profileImage
                                    }
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  referredUser?.fullName
                                    ?.charAt(0)
                                    ?.toUpperCase() ||
                                  "U"
                                )}

                              </div>

                              <div className="min-w-0">

                                <p className="text-[13px] truncate">
                                  {referredUser
                                    ?.fullName ||
                                    "GETSUKA USER"}
                                </p>

                                <p className="text-[10px] text-gray-600 mt-1 truncate">
                                  {referredUser
                                    ?.email ||
                                    "Referral"}
                                </p>

                              </div>

                            </div>

                            {/* STATUS + REWARD */}

                            <div className="flex items-center justify-between sm:justify-end gap-5">

                              <div className="text-right">

                                <span
                                  className={`inline-block border px-2 py-1 text-[8px] tracking-[0.12em] ${getStatusStyle(
                                    referral.status
                                  )}`}
                                >
                                  {getStatusLabel(
                                    referral.status
                                  )}
                                </span>

                                <p className="text-[9px] text-gray-600 mt-2">
                                  {formatDate(
                                    referral.createdAt
                                  )}
                                </p>

                              </div>

                              <div className="text-right min-w-[65px]">

                                <p className="text-[13px]">
                                  {referral.status ===
                                  "completed"
                                    ? `₹${
                                        referral.rewardAmount ||
                                        rewardPerReferral
                                      }`
                                    : "—"}
                                </p>

                                <p className="text-[8px] tracking-[0.08em] text-gray-600 mt-1">
                                  REWARD
                                </p>

                              </div>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>

          {/* ===================================================
              RIGHT
          =================================================== */}

          <div className="min-w-0">

            {/* =================================================
                HOW IT WORKS
            ================================================= */}

            <div className="border border-white/10 p-5 sm:p-7 lg:p-8">

              <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-3">
                HOW IT WORKS
              </p>

              <h2 className="text-xl sm:text-2xl font-light mb-7">
                Refer. Earn. Repeat.
              </h2>

              <div className="space-y-7">

                {/* STEP 01 */}

                <div className="flex gap-4">

                  <span className="text-[10px] text-gray-600 pt-1">
                    01
                  </span>

                  <div>

                    <p className="text-[12px] tracking-wide">
                      SHARE YOUR LINK
                    </p>

                    <p className="text-[10px] text-gray-600 leading-5 mt-2">
                      Send your unique GETSUKA
                      referral link to a friend.
                    </p>

                  </div>

                </div>

                {/* STEP 02 */}

                <div className="flex gap-4">

                  <span className="text-[10px] text-gray-600 pt-1">
                    02
                  </span>

                  <div>

                    <p className="text-[12px] tracking-wide">
                      FRIEND JOINS GETSUKA
                    </p>

                    <p className="text-[10px] text-gray-600 leading-5 mt-2">
                      Your friend signs up using
                      your referral link.
                    </p>

                  </div>

                </div>

                {/* STEP 03 */}

                <div className="flex gap-4">

                  <span className="text-[10px] text-gray-600 pt-1">
                    03
                  </span>

                  <div>

                    <p className="text-[12px] tracking-wide">
                      REFERRAL COMPLETES
                    </p>

                    <p className="text-[10px] text-gray-600 leading-5 mt-2">
                      The referral requirement is
                      completed and verified.
                    </p>

                  </div>

                </div>

                {/* STEP 04 */}

                <div className="flex gap-4">

                  <span className="text-[10px] text-gray-600 pt-1">
                    04
                  </span>

                  <div>

                    <p className="text-[12px] tracking-wide">
                      YOU EARN ₹
                      {rewardPerReferral}
                    </p>

                    <p className="text-[10px] text-gray-600 leading-5 mt-2">
                      The reward is credited to
                      your GETSUKA wallet.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* =================================================
                LIMIT CARD
            ================================================= */}

            <div className="border border-white/10 p-5 sm:p-7 lg:p-8 mt-8">

              <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-5">
                REFERRAL LIMIT
              </p>

              <div className="space-y-5">

                <div className="flex items-center justify-between gap-5">

                  <p className="text-[11px] text-gray-500">
                    Maximum referrals
                  </p>

                  <p className="text-sm">
                    {maxReferrals}
                  </p>

                </div>

                <div className="flex items-center justify-between gap-5">

                  <p className="text-[11px] text-gray-500">
                    Reward per referral
                  </p>

                  <p className="text-sm">
                    ₹{rewardPerReferral}
                  </p>

                </div>

                <div className="flex items-center justify-between gap-5 border-t border-white/10 pt-5">

                  <p className="text-[11px] text-gray-500">
                    Maximum earning
                  </p>

                  <p className="text-sm">
                    ₹{maximumEarning}
                  </p>

                </div>

              </div>

            </div>

            {/* =================================================
                LIMIT REACHED
            ================================================= */}

            {referralData.referralLimitReached && (
              <div className="border border-white/10 p-5 sm:p-7 mt-8">

                <p className="text-[10px] tracking-[0.2em] text-gray-500 mb-3">
                  LIMIT REACHED
                </p>

                <p className="text-sm">
                  You've completed the maximum{" "}
                  {maxReferrals} successful
                  referrals.
                </p>

                <p className="text-[10px] text-gray-600 mt-2 leading-5">
                  Your total referral earnings have
                  reached ₹{maximumEarning}.
                </p>

              </div>
            )}

            {/* =================================================
                PENDING
            ================================================= */}

            {pendingReferrals > 0 && (
              <div className="border border-white/10 p-5 sm:p-7 mt-8">

                <p className="text-[10px] tracking-[0.2em] text-gray-500 mb-3">
                  PENDING
                </p>

                <p className="text-2xl font-light">
                  {pendingReferrals}
                </p>

                <p className="text-[10px] text-gray-600 mt-2 leading-5">
                  {pendingReferrals === 1
                    ? "Referral is"
                    : "Referrals are"}{" "}
                  waiting for the required
                  condition to be completed.
                </p>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default ReferralPage;