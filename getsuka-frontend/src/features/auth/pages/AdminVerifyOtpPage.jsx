import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import adminLoginArt from "../../../assets/admin/admin-login.png";

import { adminVerifyOtp } from "../api/adminAuthApi";

const AdminVerifyOtpPage = () => {
  const navigate = useNavigate();

  const email = sessionStorage.getItem(
    "adminResetEmail"
  );

  // =========================
  // OTP — 6 DIGITS
  // =========================

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  // =========================
  // TIMER — 5 MINUTES
  // =========================

  const [timeLeft, setTimeLeft] =
    useState(300);

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);


  // =========================
  // OTP TIMER
  // =========================

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(
        (previous) => previous - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);


  // =========================
  // FORMAT TIMER
  // =========================

  const formatTime = () => {
    const minutes = Math.floor(
      timeLeft / 60
    );

    const seconds = timeLeft % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };


  // =========================
  // OTP CHANGE
  // =========================

  const handleOtpChange = (
    event,
    index
  ) => {
    const value = event.target.value
      .replace(/\D/g, "")
      .slice(-1);

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);
    setError("");

    // Move to next box
    if (value && index < 5) {
      document
        .getElementById(
          `admin-otp-${index + 1}`
        )
        ?.focus();
    }
  };


  // =========================
  // BACKSPACE
  // =========================

  const handleKeyDown = (
    event,
    index
  ) => {
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      document
        .getElementById(
          `admin-otp-${index - 1}`
        )
        ?.focus();
    }
  };


  // =========================
  // PASTE OTP
  // =========================

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedValue =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!pastedValue) {
      return;
    }

    const newOtp = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    pastedValue
      .split("")
      .forEach((digit, index) => {
        newOtp[index] = digit;
      });

    setOtp(newOtp);

    const focusIndex = Math.min(
      pastedValue.length,
      5
    );

    document
      .getElementById(
        `admin-otp-${focusIndex}`
      )
      ?.focus();

    setError("");
  };


  // =========================
  // VERIFY OTP
  // =========================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    const enteredOtp =
      otp.join("");

    // Email check
    if (!email) {
      setError(
        "Admin email not found. Please start again."
      );
      return;
    }

    // OTP length check
    if (enteredOtp.length !== 6) {
      setError(
        "Please enter the complete 6-digit code."
      );
      return;
    }

    // Timer check
    if (timeLeft <= 0) {
      setError(
        "The verification code has expired."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        await adminVerifyOtp(
          email,
          enteredOtp
        );

      // Save reset token
      sessionStorage.setItem(
        "adminResetToken",
        response.resetToken
      );

      // Mark OTP as verified
      sessionStorage.setItem(
        "adminOtpVerified",
        "true"
      );

      // Go to reset password
      navigate(
        "/admin/reset-password"
      );

    } catch (error) {
      setError(
        error.message ||
          "Invalid verification code."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-screen h-screen overflow-hidden bg-[#111111]">

      <div className="w-full h-full flex">

        {/* ================================= */}
        {/* LEFT — ARTWORK */}
        {/* ================================= */}

        <div className="hidden md:block w-[50%] h-full relative overflow-hidden">

          <img
            src={adminLoginArt}
            alt="GETSUKA security"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/35" />


          {/* Security Branding */}
          <div className="absolute bottom-6 left-6 z-10">

            {/* Security Protocol */}
            <div className="inline-block bg-white px-2 py-1">

              <p className="text-[5px] tracking-[0.12em] text-black">
                SECURITY PROTOCOL
              </p>

            </div>


            {/* GETSUKA */}
            <p className="text-[7px] tracking-[0.18em] text-white mt-3">
              GETSUKA
            </p>


            {/* Portal */}
            <p className="text-[6px] tracking-[0.16em] text-gray-400 mt-1">
              SECURE ADMIN PORTAL
            </p>

          </div>

        </div>


        {/* ================================= */}
        {/* RIGHT — OTP */}
        {/* ================================= */}

        <div className="w-full md:w-[50%] h-full bg-[#111111] flex items-center justify-center text-white">

          <div className="w-full max-w-[350px] px-8">

            {/* ================================= */}
            {/* AUTHENTICATION */}
            {/* ================================= */}

            <div className="flex items-center gap-2 mb-5">

              <span className="text-[8px] text-red-300">
                ⊙
              </span>

              <span className="text-[8px] tracking-[0.16em] text-gray-300">
                AUTHENTICATION
              </span>

            </div>


            {/* ================================= */}
            {/* HEADING */}
            {/* ================================= */}

            <h1 className="font-serif text-[12px] uppercase leading-[1.2] text-white max-w-[100px]">
              VERIFY YOUR IDENTITY
            </h1>


            {/* Description */}
            <p className="text-[7px] leading-[1.7] text-gray-400 mt-4 max-w-[270px]">
              Enter the 6-digit verification
              code sent to your registered
              admin email.
            </p>


            {/* ================================= */}
            {/* EMAIL */}
            {/* ================================= */}

            <div className="inline-flex items-center gap-1 bg-[#191919] px-2 py-1 mt-3">

              <span className="text-[6px] text-gray-400">
                ✉
              </span>

              <span className="text-[7px] text-gray-300">
                {email ||
                  "n*******@example.com"}
              </span>

            </div>


            {/* ================================= */}
            {/* FORM */}
            {/* ================================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-7"
            >

              {/* ================================= */}
              {/* SIX OTP BOXES */}
              {/* ================================= */}

              <div className="flex items-center gap-3">

                {otp.map(
                  (digit, index) => (
                    <input
                      key={index}
                      id={`admin-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleOtpChange(
                          event,
                          index
                        )
                      }
                      onKeyDown={(event) =>
                        handleKeyDown(
                          event,
                          index
                        )
                      }
                      onPaste={
                        index === 0
                          ? handlePaste
                          : undefined
                      }
                      className="w-[30px] h-[32px] bg-[#171717] border-b border-gray-700 text-center text-[10px] text-white outline-none focus:border-gray-300 transition"
                    />
                  )
                )}

              </div>


              {/* ================================= */}
              {/* TIMER + RESEND */}
              {/* ================================= */}

              <div className="flex items-center justify-between mt-4">

                <p
                  className={`text-[7px] tracking-wide ${
                    timeLeft === 0
                      ? "text-red-400"
                      : "text-red-300"
                  }`}
                >
                  ◉ CODE EXPIRES IN{" "}
                  {formatTime()}
                </p>


                <button
                  type="button"
                  disabled={
                    timeLeft > 0
                  }
                  className="text-[7px] tracking-wide text-gray-600 disabled:cursor-not-allowed"
                >
                  RESEND CODE
                </button>

              </div>


              {/* ================================= */}
              {/* ERROR */}
              {/* ================================= */}

              {error && (
                <p className="text-[7px] text-red-400 mt-3">
                  {error}
                </p>
              )}


              {/* ================================= */}
              {/* VERIFY BUTTON */}
              {/* ================================= */}

              <button
                type="submit"
                disabled={
                  loading ||
                  timeLeft <= 0
                }
                className="w-full h-8 mt-4 bg-[#ffb1aa] text-black text-[7px] tracking-[0.16em] font-semibold hover:bg-[#ffc0ba] transition disabled:opacity-50"
              >
                {loading
                  ? "VERIFYING..."
                  : "VERIFY CODE →"}
              </button>

            </form>


            {/* ================================= */}
            {/* DIVIDER */}
            {/* ================================= */}

            <div className="w-full border-t border-gray-800 mt-7" />


            {/* ================================= */}
            {/* BOTTOM NAVIGATION */}
            {/* ================================= */}

            <div className="flex items-center justify-between mt-5">

              {/* Back */}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/admin/login"
                  )
                }
                className="text-[7px] tracking-wide text-gray-400 hover:text-white transition"
              >
                ← BACK TO LOGIN
              </button>


              {/* Help */}
              <button
                type="button"
                className="text-[7px] tracking-wide text-gray-400 hover:text-white transition"
              >
                ⓘ NEED HELP?
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminVerifyOtpPage;