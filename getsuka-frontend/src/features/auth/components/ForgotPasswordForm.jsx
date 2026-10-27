import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { forgotPassword } from "../api/authApi";

const ForgotPasswordForm = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      await forgotPassword(email);

      sessionStorage.setItem(
        "passwordResetEmail",
        email
      );

      navigate("/reset-password");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
      <div>
        <label htmlFor="forgot-email-input" className="block text-xs mb-2">
          EMAIL ADDRESS
        </label>

        <input
          id="forgot-email-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="Enter your email address"
          className="w-full border border-[#E5E4E2] bg-white text-[#252321] px-4 py-3 text-sm outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
        />

        {error && (
          <p role="alert" className="text-xs text-[#6F4E37] font-medium mt-2">
            {error}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#6F4E37] text-white py-3.5 text-xs font-semibold tracking-widest hover:bg-[#5a3e2b] shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
      >
        {loading
          ? "SENDING OTP..."
          : "SEND RESET OTP"}
      </button>

    </form>
  );
};

export default ForgotPasswordForm;