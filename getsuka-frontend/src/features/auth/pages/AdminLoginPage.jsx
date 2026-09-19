import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { adminLogin } from "../api/adminAuthApi";

import adminLoginArt from "../../../assets/admin/admin-login.png";

const AdminLoginPage = () => {
  const navigate = useNavigate();

  // Already logged-in admin → dashboard
  useEffect(() => {
    const adminToken =
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken");

    if (adminToken) {
      navigate("/admin/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    try {
      setLoading(true);

      const response = await adminLogin({
        email: formData.email.trim(),
        password: formData.password,
      });

      const storage = formData.rememberMe
        ? localStorage
        : sessionStorage;

      storage.setItem(
        "adminToken",
        response.token
      );

      storage.setItem(
        "admin",
        JSON.stringify(response.admin)
      );

      navigate("/admin/dashboard", {
        replace: true,
      });

    } catch (error) {
      setError(
        error.message ||
          "Invalid admin credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#171717]">

      <div className="w-full h-full flex">

        {/* ================================= */}
        {/* LEFT — ADMIN ARTWORK */}
        {/* ================================= */}

        <div className="hidden md:block w-1/2 h-full relative overflow-hidden">

          {/* Background Image */}

          <img
            src={adminLoginArt}
            alt="GETSUKA Admin"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark Overlay */}

          <div className="absolute inset-0 bg-black/35" />

          {/* Left Content */}

          <div className="relative z-10 h-full p-10 text-white">

            {/* Red Line */}

            <div className="w-10 h-[2px] bg-red-700 mb-6" />

            {/* Brand */}

            <p className="text-[11px] tracking-[0.18em] font-medium">
              GETSUKA
            </p>

            <p className="text-[10px] tracking-[0.16em] text-gray-400 mt-2">
              ADMIN PANEL
            </p>

            {/* Description */}

            <div className="mt-6 max-w-[290px] border-l border-white/10 pl-4">

              <p className="text-[10px] leading-[1.7] text-gray-300">
                Manage your store from one place.
                Access secure administrative
                functions, monitor inventory, and
                orchestrate collections.
              </p>

            </div>

          </div>

        </div>


        {/* ================================= */}
        {/* RIGHT — ADMIN LOGIN */}
        {/* ================================= */}

        <div className="w-full md:w-1/2 h-full bg-[#191919] flex items-center justify-center text-white">

          <div className="w-full max-w-[360px] px-8">

            {/* Heading */}

            <div className="mb-8">

              <h1 className="text-[12px] font-medium tracking-wide text-white">
                ADMIN LOGIN
              </h1>

              <p className="text-[10px] text-gray-400 mt-4">
                Sign in to access the GETSUKA administration panel.
              </p>

            </div>


            {/* ================================= */}
            {/* LOGIN FORM */}
            {/* ================================= */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label className="block text-[9px] tracking-[0.12em] text-gray-300 mb-3">
                  EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter admin email"
                  autoComplete="email"
                  className="w-full bg-transparent border-b border-gray-700 pb-3 text-[10px] text-white placeholder:text-gray-600 outline-none focus:border-gray-400 transition"
                />

              </div>


              {/* PASSWORD */}

              <div>

                <label className="block text-[9px] tracking-[0.12em] text-gray-300 mb-3">
                  PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full bg-transparent border-b border-gray-700 pb-3 pr-8 text-[10px] text-white placeholder:text-gray-600 outline-none focus:border-gray-400 transition"
                  />

                  {/* Password Eye */}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    className="absolute right-0 bottom-3 text-gray-400 hover:text-white transition"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M3 3l18 18" />

                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />

                        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 6 9.5 6a17 17 0 0 1-3.1 3.7" />

                        <path d="M6.5 6.5C4.2 8.1 2.5 10 2.5 10s4 6 9.5 6c1.3 0 2.5-.3 3.6-.8" />
                      </svg>
                    ) : (
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M2.5 12s4-6 9.5-6 9.5 6 9.5 6-4 6-9.5 6-9.5-6-9.5-6Z" />

                        <circle
                          cx="12"
                          cy="12"
                          r="2.5"
                        />
                      </svg>
                    )}

                  </button>

                </div>

              </div>


              {/* REMEMBER + FORGOT */}

              <div className="flex items-center justify-between pt-1">

                <label className="flex items-center gap-2 cursor-pointer">

                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={
                      formData.rememberMe
                    }
                    onChange={handleChange}
                    className="w-[11px] h-[11px] appearance-none border border-gray-600 bg-transparent checked:bg-white checked:border-white cursor-pointer"
                  />

                  <span className="text-[9px] tracking-wide text-gray-400">
                    REMEMBER ME
                  </span>

                </label>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/admin/forgot-password"
                    )
                  }
                  className="text-[9px] tracking-wide text-gray-400 hover:text-white transition"
                >
                  FORGOT PASSWORD?
                </button>

              </div>


              {/* ERROR */}

              {error && (
                <p className="text-[9px] text-red-400">
                  {error}
                </p>
              )}


              {/* SIGN IN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 bg-gray-200 text-black text-[9px] tracking-[0.12em] font-medium hover:bg-white transition disabled:opacity-50"
              >
                {loading
                  ? "SIGNING IN..."
                  : "SIGN IN TO ADMIN →"}
              </button>

            </form>


            {/* Divider */}

            <div className="w-full border-t border-gray-800 mt-7" />


            {/* Secure Access */}

            <div className="flex items-center justify-center gap-2 mt-6">

              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-gray-500"
              >

                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="1"
                />

                <path d="M8 10V7a4 4 0 0 1 8 0v3" />

              </svg>

              <span className="text-[9px] tracking-[0.16em] text-gray-500">
                SECURE ADMIN ACCESS
              </span>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AdminLoginPage;