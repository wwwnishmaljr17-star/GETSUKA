import { useState } from "react";
import { useNavigate } from "react-router-dom";

import adminLoginArt from "../../../assets/admin/admin-login.png";

import { adminForgotPassword } from "../api/adminAuthApi";

const AdminForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email address is required");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        trimmedEmail
      )
    ) {
      setError("Enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      await adminForgotPassword(trimmedEmail);

      sessionStorage.setItem(
        "adminResetEmail",
        trimmedEmail
      );

      navigate("/admin/verify-otp");

    } catch (error) {
      setError(
        error.message ||
          "Failed to send verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#101010]">

      <div className="w-full h-full flex">

        {/* ================================= */}
        {/* LEFT SIDE */}
        {/* ================================= */}

        <div className="hidden md:block w-[45%] h-full relative overflow-hidden">

          {/* Background */}
          <img
            src={adminLoginArt}
            alt="GETSUKA"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/45" />

          {/* Left content */}
          <div className="relative z-10 h-full px-7 py-7 text-white flex flex-col">

            {/* ========================= */}
            {/* BRAND */}
            {/* ========================= */}

            <div>

              <div className="flex items-center gap-2">

                {/* Logo Mark */}
                <div className="w-[15px] h-[15px] bg-white flex items-center justify-center">

                  <div className="w-[6px] h-[6px] bg-[#222]" />

                </div>

                <span className="text-[10px] tracking-[0.2em]">
                  GETSUKA
                </span>

              </div>

              <div className="flex items-center gap-3 mt-4">

                <div className="w-8 h-[1px] bg-gray-500" />

                <span className="text-[7px] tracking-[0.18em] text-gray-400">
                  SECURE ADMIN PORTAL
                </span>

              </div>

            </div>


            {/* ========================= */}
            {/* RECOVERY CONTENT */}
            {/* ========================= */}

            <div className="mt-auto mb-6">

              <h2 className="font-serif text-[22px] leading-[1] text-white">
                ACCESS
              </h2>

              <h2 className="font-serif italic font-semibold text-[22px] leading-[1.1] text-gray-400">
                RECOVERY
              </h2>


              <p className="text-[7px] leading-[1.6] text-gray-400 mt-5 max-w-[150px]">
                Secure access restoration.
                Enter your credentials to verify
                your identity and regain control
                of your workspace.
              </p>


              {/* System Status */}
              <div className="flex items-center gap-2 mt-7">

                <div className="w-[5px] h-[5px] rounded-full bg-red-300" />

                <span className="text-[7px] tracking-[0.12em] text-gray-400">
                  SYSTEM OPERATIONAL
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* ================================= */}
        {/* RIGHT SIDE */}
        {/* ================================= */}

        <div className="w-full md:w-[55%] h-full bg-[#111111] flex items-center justify-center">

          <div className="w-full max-w-[350px] px-8">

            {/* Red Accent */}
            <div className="w-6 h-[1px] bg-red-700 mb-3" />


            {/* ========================= */}
            {/* HEADING */}
            {/* ========================= */}

            <h1 className="font-serif text-[14px] text-white">
              FORGOT PASSWORD?
            </h1>

            <p className="text-[7px] leading-[1.6] text-gray-500 mt-3 max-w-[270px]">
              Enter your admin email address and
              we'll send you a verification code to
              reset your password.
            </p>


            {/* ========================= */}
            {/* FORM */}
            {/* ========================= */}

            <form
              onSubmit={handleSubmit}
              className="mt-7"
            >

              {/* Label */}
              <label className="block text-[8px] tracking-[0.12em] text-gray-400 mb-3">
                ADMIN EMAIL ADDRESS
              </label>


              {/* Email Input */}
              <div className="relative">

                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your admin email address"
                  autoComplete="email"
                  className="w-full bg-transparent border-b border-gray-700 pb-2 pr-6 text-[8px] text-white placeholder:text-gray-600 outline-none focus:border-gray-400 transition"
                />


                {/* Email Icon */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="absolute right-0 bottom-2 text-gray-500"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="1"
                  />

                  <path d="m3 7 9 6 9-6" />
                </svg>

              </div>


              {/* Error */}
              {error && (
                <p className="text-[8px] text-red-400 mt-3">
                  {error}
                </p>
              )}


              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-8 mt-5 bg-gray-200 text-black text-[7px] tracking-[0.16em] font-semibold hover:bg-white transition disabled:opacity-50"
              >
                {loading
                  ? "SENDING..."
                  : "SEND VERIFICATION CODE →"}
              </button>

            </form>


            {/* ========================= */}
            {/* BACK TO LOGIN */}
            {/* ========================= */}

            <button
              type="button"
              onClick={() =>
                navigate("/admin/login")
              }
              className="block mx-auto mt-5 text-[7px] tracking-[0.08em] text-gray-500 hover:text-white transition"
            >
              ← BACK TO ADMIN LOGIN
            </button>


            {/* ========================= */}
            {/* BOTTOM SECURITY */}
            {/* ========================= */}

            <div className="text-center mt-28">

              <p className="text-[5px] tracking-[0.15em] text-gray-700">
                SECURE CONNECTION · AES-256 ENCRYPTED
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminForgotPasswordPage;