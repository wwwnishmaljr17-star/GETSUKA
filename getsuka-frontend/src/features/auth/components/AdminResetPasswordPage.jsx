import { useState } from "react";
import { useNavigate } from "react-router-dom";

import adminImage from "../../../assets/admin/admin-login.png";
import { adminResetPassword } from "../api/adminAuthApi";

const AdminResetPasswordPage = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(
        "Password must contain at least one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const resetToken = sessionStorage.getItem(
      "adminResetToken"
    );

    if (!resetToken) {
      setError(
        "Reset session expired. Please start again."
      );
      return;
    }

    try {
      setLoading(true);

      await adminResetPassword(
        resetToken,
        password
      );

      sessionStorage.removeItem(
        "adminResetEmail"
      );

      sessionStorage.removeItem(
        "adminOtpVerified"
      );

      sessionStorage.removeItem(
        "adminResetToken"
      );

      navigate("/admin/login", {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-white">

      <div className="flex min-h-screen">

        {/* ================= LEFT SIDE ================= */}

        <div
          className="relative hidden w-1/2 overflow-hidden bg-black lg:block"
          style={{
            backgroundImage: `url(${adminImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >

          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10">

            {/* Logo */}

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-7 w-7 items-center justify-center bg-white">
                  <span className="text-[9px] font-bold text-black">
                    G
                  </span>
                </div>

                <span className="text-[11px] tracking-[0.28em]">
                  GETSUKA
                </span>

              </div>

              <p className="mt-4 text-[8px] uppercase tracking-[0.3em] text-gray-400">
                Secure Admin Portal
              </p>

            </div>

            {/* Main Text */}

            <div className="mb-8 max-w-md">

              <h2 className="text-4xl font-serif tracking-wide text-white">
                RESET
              </h2>

              <h2 className="text-4xl font-serif tracking-wide text-gray-400">
                CREDENTIALS
              </h2>

              <p className="mt-8 max-w-xs text-[10px] leading-5 tracking-wide text-gray-400">
                Create a new secure administrator
                password to restore access to your
                GETSUKA workspace.
              </p>

              <div className="mt-8 flex items-center gap-2">

                <span className="h-1 w-1 rounded-full bg-red-500" />

                <span className="text-[7px] uppercase tracking-[0.25em] text-gray-500">
                  System Operational
                </span>

              </div>

            </div>

          </div>
        </div>

        {/* ================= RIGHT SIDE ================= */}

        <div className="flex w-full items-center justify-center bg-[#101010] px-8 lg:w-1/2">

          <div className="w-full max-w-md">

            <div className="mb-4 h-[1px] w-8 bg-gray-500" />

            <h1 className="text-xl font-serif tracking-wide text-white">
              RESET PASSWORD
            </h1>

            <p className="mt-3 max-w-sm text-[9px] leading-4 text-gray-500">
              Create a new password for your
              administrator account.
            </p>

            {error && (
              <div className="mt-5 border border-red-900 bg-red-950/30 px-3 py-2 text-[9px] text-red-400">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-7"
            >

              {/* New Password */}

              <label className="mb-3 block text-[8px] uppercase tracking-[0.25em] text-gray-400">
                New Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter new password"
                  className="w-full border-b border-gray-700 bg-transparent px-0 py-3 pr-14 text-[10px] text-white outline-none placeholder:text-gray-700 focus:border-gray-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-0 top-3 text-[8px] uppercase tracking-wider text-gray-500 hover:text-gray-300"
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

              {/* Confirm Password */}

              <label className="mb-3 mt-7 block text-[8px] uppercase tracking-[0.25em] text-gray-400">
                Confirm Password
              </label>

              <div className="relative">

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  className="w-full border-b border-gray-700 bg-transparent px-0 py-3 pr-14 text-[10px] text-white outline-none placeholder:text-gray-700 focus:border-gray-400"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-0 top-3 text-[8px] uppercase tracking-wider text-gray-500 hover:text-gray-300"
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

              {/* Password Requirements */}

              <div className="mt-6 text-[8px] leading-5 text-gray-600">
                <p className="uppercase tracking-[0.2em] text-gray-500">
                  Password Requirements
                </p>

                <p>• Minimum 8 characters</p>
                <p>• One uppercase letter</p>
                <p>• One lowercase letter</p>
                <p>• One number</p>
                <p>• One special character</p>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="mt-7 flex w-full items-center justify-center gap-2 bg-white py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Resetting Password..."
                  : "Reset Password"}

                {!loading && (
                  <span className="text-[10px]">
                    →
                  </span>
                )}
              </button>

            </form>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/login")
              }
              className="mt-5 w-full text-center text-[8px] uppercase tracking-[0.2em] text-gray-600 transition hover:text-gray-300"
            >
              ← Back To Admin Login
            </button>

            <p className="mt-20 text-center text-[7px] uppercase tracking-[0.3em] text-gray-700">
              © GETSUKA ADMIN PORTAL
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminResetPasswordPage;