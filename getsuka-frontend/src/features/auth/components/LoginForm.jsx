import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { loginUser, googleLogin } from "../api/authApi";

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser({ email, password });

      // Save login information
      login(response.token, response.user);

      // Go to welcome page
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      if (!credentialResponse?.credential) {
        throw new Error("No Google credential received from Google. Please try again.");
      }

      setLoading(true);

      const response = await googleLogin(
        credentialResponse.credential
      );

      login(response.token, response.user);

      navigate("/", {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Google authentication failed. Please try again or use email sign-in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(
      "Google Sign-In was cancelled or unavailable. Please verify your connection or use email and password."
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
      <div>
        <label htmlFor="login-email" className="block text-xs font-medium tracking-wider text-[#252321] uppercase mb-1.5">
          EMAIL ADDRESS
        </label>

        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email address"
          className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex justify-between items-center mb-1.5">

          <label htmlFor="login-password" className="block text-xs font-medium tracking-wider text-[#252321] uppercase">
            PASSWORD
          </label>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-xs text-[#716C67] hover:text-[#6F4E37] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
          >
            FORGOT PASSWORD?
          </button>

        </div>

        {/* Password input with visibility toggle */}
        <div className="relative">

          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 pr-12 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword((previous) => !previous)
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            className="absolute right-0 top-0 flex h-full w-12 items-center justify-center text-gray-500 transition hover:text-[#252321] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
          >
            {showPassword ? (
              /* Eye slash */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.2 0 8.7 4 10 8a11.8 11.8 0 0 1-3.1 4.8" />
                <path d="M6.6 6.6C4.7 7.8 3.4 9.7 2 12c1.3 3.5 4.8 8 10 8 1.2 0 2.4-.2 3.4-.6" />
              </svg>
            ) : (
              /* Eye */
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                />
              </svg>
            )}
          </button>

        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="p-3 bg-[#F5EFEB] border border-[#E5E4E2] text-sm text-[#6F4E37] font-medium text-center leading-relaxed"
        >
          {error}
        </div>
      )}

      {/* Login */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-[#6F4E37] text-white text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-[#5a3e2b] shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
      >
        {loading ? "SIGNING IN..." : "SIGN IN"}
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-6">
        <div className="w-full border-t border-[#E5E4E2]" />
        <span className="bg-[#FAF9F7] px-4 text-xs font-medium tracking-wider text-[#716C67] uppercase">
          Or continue with
        </span>
      </div>

      {/* Google Login */}
      <div className="w-full flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="100%"
        />
      </div>

    </form>
  );
};

export default LoginForm;