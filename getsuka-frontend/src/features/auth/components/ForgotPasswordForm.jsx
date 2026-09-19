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
        <label className="block text-xs mb-2">
          EMAIL ADDRESS
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          placeholder="Enter your email address"
          className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        {error && (
          <p className="text-xs text-red-500 mt-2">
            {error}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading
          ? "SENDING OTP..."
          : "SEND RESET OTP"}
      </button>

    </form>
  );
};

export default ForgotPasswordForm;