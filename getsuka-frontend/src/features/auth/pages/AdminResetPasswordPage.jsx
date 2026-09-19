import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import adminLoginArt from "../../../assets/admin/admin-login.png";
import getsukaLogo from "../../../assets/auth/getsuka_logo.png";

import { adminResetPassword } from "../api/adminAuthApi";

const AdminResetPasswordPage = () => {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [transparentLogo, setTransparentLogo] =
    useState(null);

  const resetToken = sessionStorage.getItem(
    "adminResetToken"
  );

  useEffect(() => {
    const image = new Image();

    image.src = getsukaLogo;

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");

      context.drawImage(
        image,
        0,
        0,
        image.width,
        image.height
      );

      const imageData = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        if (
          red > 235 &&
          green > 235 &&
          blue > 235
        ) {
          pixels[i + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);

      setTransparentLogo(
        canvas.toDataURL("image/png")
      );
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!resetToken) {
      setError(
        "Reset session expired. Please start again."
      );
      return;
    }

    if (!newPassword) {
      setError("Password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError(
        "Password must contain at least one special character."
      );
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await adminResetPassword(
        resetToken,
        newPassword
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

      navigate("/admin/login");
    } catch (error) {
      setError(
        error.message ||
          "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#111111]">

      <div className="w-full h-full flex">

        {/* ========================= */}
        {/* LEFT — ADMIN ARTWORK */}
        {/* ========================= */}

        <div className="hidden md:block w-[50%] h-full relative overflow-hidden">

          <img
            src={adminLoginArt}
            alt="GETSUKA security"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/35" />

          {transparentLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

              <img
                src={transparentLogo}
                alt="GETSUKA"
                className="w-[200px] h-auto object-contain"
              />

            </div>
          )}

          <div className="absolute bottom-6 left-6 z-10">

            <div className="inline-block bg-white px-2 py-1">

              <p className="text-[5px] tracking-[0.12em] text-black">
                SECURITY PROTOCOL
              </p>

            </div>

            <p className="text-[7px] tracking-[0.18em] text-white mt-3">
              GETSUKA
            </p>

            <p className="text-[6px] tracking-[0.16em] text-gray-400 mt-1">
              SECURE ADMIN PORTAL
            </p>

          </div>

        </div>


        {/* ========================= */}
        {/* RIGHT — RESET PASSWORD */}
        {/* ========================= */}

        <div className="w-full md:w-[50%] h-full bg-[#111111] flex items-center justify-center text-white">

          <div className="w-full max-w-[350px] px-8">

            {/* Section label */}

            <div className="flex items-center gap-2 mb-5">

              <span className="text-[8px] text-red-300">
                ⊙
              </span>

              <span className="text-[8px] tracking-[0.16em] text-gray-300">
                SECURITY
              </span>

            </div>


            {/* Heading */}

            <h1 className="font-serif text-[12px] uppercase leading-[1.2] text-white max-w-[150px]">
              CREATE NEW PASSWORD
            </h1>

            <p className="text-[7px] leading-[1.7] text-gray-400 mt-4 max-w-[275px]">
              Choose a strong password to
              secure your GETSUKA admin
              account.
            </p>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="mt-7"
            >

              {/* NEW PASSWORD */}

              <div>

                <label className="block text-[7px] tracking-[0.12em] text-gray-400 mb-2">
                  NEW PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(
                        event.target.value
                      );
                      setError("");
                    }}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="w-full h-9 bg-[#171717] border-b border-gray-700 px-3 pr-10 text-[8px] text-white placeholder:text-gray-600 outline-none focus:border-gray-300 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        !showNewPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-500 hover:text-white transition"
                  >
                    {showNewPassword
                      ? "◉"
                      : "◌"}
                  </button>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="mt-5">

                <label className="block text-[7px] tracking-[0.12em] text-gray-400 mb-2">
                  CONFIRM PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(
                        event.target.value
                      );
                      setError("");
                    }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full h-9 bg-[#171717] border-b border-gray-700 px-3 pr-10 text-[8px] text-white placeholder:text-gray-600 outline-none focus:border-gray-300 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-500 hover:text-white transition"
                  >
                    {showConfirmPassword
                      ? "◉"
                      : "◌"}
                  </button>

                </div>

              </div>


              {/* PASSWORD REQUIREMENTS */}

              <div className="mt-5 bg-[#151515] px-3 py-3">

                <p className="text-[7px] tracking-wide text-gray-400 mb-2">
                  PASSWORD REQUIREMENTS
                </p>

                <div className="grid grid-cols-2 gap-y-1">

                  <p className="text-[6px] text-gray-500">
                    • 8+ CHARACTERS
                  </p>

                  <p className="text-[6px] text-gray-500">
                    • UPPERCASE
                  </p>

                  <p className="text-[6px] text-gray-500">
                    • LOWERCASE
                  </p>

                  <p className="text-[6px] text-gray-500">
                    • NUMBER
                  </p>

                  <p className="text-[6px] text-gray-500">
                    • SPECIAL CHARACTER
                  </p>

                </div>

              </div>


              {/* ERROR */}

              {error && (
                <p className="text-[7px] text-red-400 mt-3">
                  {error}
                </p>
              )}


              {/* RESET BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-8 mt-5 bg-[#ffb1aa] text-black text-[7px] tracking-[0.16em] font-semibold hover:bg-[#ffc0ba] transition disabled:opacity-50"
              >
                {loading
                  ? "RESETTING..."
                  : "RESET PASSWORD →"}
              </button>

            </form>


            {/* Divider */}

            <div className="w-full border-t border-gray-800 mt-7" />


            {/* Bottom navigation */}

            <div className="flex items-center justify-between mt-5">

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/login")
                }
                className="text-[7px] tracking-wide text-gray-400 hover:text-white transition"
              >
                ← BACK TO LOGIN
              </button>

              <span className="text-[6px] tracking-wide text-gray-600">
                SECURE CONNECTION
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminResetPasswordPage;