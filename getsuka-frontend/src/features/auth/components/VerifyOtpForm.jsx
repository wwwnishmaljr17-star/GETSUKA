import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { verifyOtp, resendOtp } from "../api/authApi";

const OTP_DURATION = 5 * 60;

const VerifyOtpForm = ({ email }) => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [remainingSeconds, setRemainingSeconds] =
    useState(OTP_DURATION);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // ==============================
  // OTP COUNTDOWN TIMER
  // ==============================
  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [remainingSeconds]);

  // ==============================
  // FORMAT TIMER
  // ==============================
  const minutes = Math.floor(
    remainingSeconds / 60
  );

  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  // ==============================
  // VERIFY OTP
  // ==============================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("OTP must be 6 digits");
      return;
    }

    if (!email) {
      setError(
        "Email not found. Please register again."
      );
      return;
    }

    if (remainingSeconds <= 0) {
      setError(
        "OTP has expired. Please request a new OTP."
      );
      return;
    }

    try {
      setLoading(true);

      await verifyOtp({
        email,
        otp,
      });

      sessionStorage.removeItem(
        "verificationEmail"
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // RESEND OTP
  // ==============================
  const handleResend = async () => {
    setError("");
    setMessage("");

    if (!email) {
      setError(
        "Email not found. Please register again."
      );
      return;
    }

    try {
      setResending(true);

      const response = await resendOtp({
        email,
      });

      setMessage(response.message);
      setOtp("");

      // Restart 5-minute timer
      setRemainingSeconds(OTP_DURATION);
    } catch (error) {
      setError(error.message);
    } finally {
      setResending(false);
    }
  };

  // ==============================
  // GO BACK
  // ==============================
  const handleBack = () => {
    navigate("/register");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* OTP */}
      <div>
        <label className="block text-xs text-black mb-2">
          VERIFICATION CODE
        </label>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(event) => {
            setOtp(
              event.target.value.replace(
                /\D/g,
                ""
              )
            );

            setError("");
          }}
          placeholder="Enter 6-digit OTP"
          className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        {error && (
          <p className="text-xs text-red-500 mt-2">
            {error}
          </p>
        )}

        {message && (
          <p className="text-xs text-green-600 mt-2">
            {message}
          </p>
        )}
      </div>

      {/* TIMER */}
      <div className="text-center">
        {remainingSeconds > 0 ? (
          <p className="text-[10px] text-gray-500">
            OTP expires in{" "}
            <span className="text-black font-medium">
              {formattedTime}
            </span>
          </p>
        ) : (
          <p className="text-[10px] text-red-500">
            OTP has expired
          </p>
        )}
      </div>

      {/* VERIFY */}
      <button
        type="submit"
        disabled={
          loading ||
          remainingSeconds <= 0
        }
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading
          ? "VERIFYING..."
          : "VERIFY OTP"}
      </button>

      {/* ACTIONS */}
      <div className="flex justify-between text-[10px]">
        <button
          type="button"
          onClick={handleBack}
          className="text-gray-500 hover:text-black"
        >
          ← GO BACK
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-black font-semibold disabled:opacity-50"
        >
          {resending
            ? "RESENDING..."
            : "RESEND OTP"}
        </button>
      </div>
    </form>
  );
};

export default VerifyOtpForm;