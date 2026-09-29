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

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser(formData);

      // Save login information
      login(response.token, response.user);

      // Go to welcome page
      // replace prevents going back to login using browser Back
      navigate("/", { replace: true });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      setLoading(true);

      const response = await googleLogin(
        credentialResponse.credential
      );

      login(response.token, response.user);

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(
      "Google login failed. Please try again."
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
      <div>
        <label className="block text-xs mb-1">
          EMAIL ADDRESS
        </label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email address"
          className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex justify-between items-center mb-1">

          <label className="block text-xs">
            PASSWORD
          </label>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-[9px] text-gray-500 hover:text-black"
          >
            FORGOT PASSWORD?
          </button>

        </div>

        {/* Password input with visibility toggle */}
        <div className="relative">

          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className="w-full border border-gray-300 px-3 py-3 pr-11 text-sm outline-none focus:border-black"
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
            className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-gray-500 transition hover:text-black"
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
        <p className="text-xs text-red-500 text-center">
          {error}
        </p>
      )}

      {/* Login */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading ? "SIGNING IN..." : "SIGN IN"}
      </button>

      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        text="continue_with"
        shape="rectangular"
        width="100%"
      />

    </form>
  );
};

export default LoginForm;