import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAdminProfile,
  updateAdminProfile,
} from "../api/adminProfileApi";

import { changeAdminPassword } from "../api/adminPasswordApi";

const AdminEditProfilePage = () => {
  const navigate = useNavigate();

  /* =========================================
     PROFILE STATE
  ========================================= */

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================
     PASSWORD MODAL STATE
  ========================================= */

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  const [showPasswordChangedModal, setShowPasswordChangedModal] =
    useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  /* =========================================
     FETCH ADMIN PROFILE
  ========================================= */

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getAdminProfile();

        setAdmin(response.admin);

        setFormData({
          fullName: response.admin.fullName || "",
          email: response.admin.email || "",
          phone: response.admin.phone || "",
        });
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* =========================================
     HANDLE PROFILE INPUT
  ========================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* =========================================
     SAVE PROFILE
  ========================================= */

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await updateAdminProfile({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });

      setAdmin(response.admin);

      setSuccess("Profile updated successfully");

      setTimeout(() => {
        navigate("/admin/profile");
      }, 800);
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  /* =========================================
     OPEN PASSWORD MODAL
  ========================================= */

  const openPasswordModal = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordError("");

    setShowPassword({
      current: false,
      new: false,
      confirm: false,
    });

    setShowPasswordModal(true);
  };

  /* =========================================
     CLOSE PASSWORD MODAL
  ========================================= */

  const closePasswordModal = () => {
    if (passwordLoading) return;

    setShowPasswordModal(false);
    setPasswordError("");

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  /* =========================================
     HANDLE PASSWORD INPUT
  ========================================= */

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPasswordError("");
  };

  /* =========================================
     TOGGLE PASSWORD VISIBILITY
  ========================================= */

  const togglePassword = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  /* =========================================
     PASSWORD VALIDATION
  ========================================= */

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }

    if (
      !/[!@#$%^&*(),.?":{}|<>_\-\\[\]/;'`~+=]/.test(
        password
      )
    ) {
      return "Password must contain at least one special character";
    }

    return "";
  };

  /* =========================================
     PASSWORD REQUIREMENTS
  ========================================= */

  const passwordRequirements = {
    length: passwordData.newPassword.length >= 8,

    uppercase: /[A-Z]/.test(
      passwordData.newPassword
    ),

    lowercase: /[a-z]/.test(
      passwordData.newPassword
    ),

    number: /[0-9]/.test(
      passwordData.newPassword
    ),

    special:
      /[!@#$%^&*(),.?":{}|<>_\-\\[\]/;'`~+=]/.test(
        passwordData.newPassword
      ),
  };

  /* =========================================
     CHANGE PASSWORD
  ========================================= */

  const handleChangePassword = async (e) => {
    e.preventDefault();

    setPasswordError("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordData;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        "All password fields are required"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New passwords do not match"
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from current password"
      );
      return;
    }

    const validationError =
      validatePassword(newPassword);

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    try {
      setPasswordLoading(true);

      await changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setShowPasswordModal(false);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordChangedModal(true);
    } catch (error) {
      setPasswordError(
        error.message ||
          "Failed to update password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <p className="text-[10px] tracking-[0.35em] text-gray-500">
          LOADING GETSUKA PROFILE...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">

      {/* =========================================
          CONTENT
      ========================================= */}

      <div className="p-6 max-w-[1100px]">

        <button
          type="button"
          onClick={() =>
            navigate("/admin/profile")
          }
          className="text-[9px] tracking-[0.15em] text-gray-500 hover:text-white transition mb-5"
        >
          ← BACK TO PROFILE
        </button>

        <div className="grid grid-cols-[220px_1fr] gap-6">

          {/* =========================================
              LEFT COLUMN
          ========================================= */}

          <div className="space-y-5">

            {/* PROFILE CARD */}

            <section className="border border-white/10 bg-[#151515] p-5">

              <div className="flex flex-col items-center text-center">

                <div className="w-[74px] h-[74px] rounded-full border border-red-500/40 bg-[#090909] flex items-center justify-center mb-4">

                  <span className="text-2xl text-red-500 font-light">
                    G
                  </span>

                </div>

                <h3 className="text-[13px] tracking-wide">
                  {admin?.fullName || "ADMIN"}
                </h3>

                <p className="text-[8px] text-gray-500 mt-1">
                  {admin?.email || ""}
                </p>

              </div>

            </section>

            {/* STORE ACCESS */}

            <section className="border border-white/10 bg-[#151515] p-5">

              <h3 className="text-[13px] tracking-wide mb-4">
                STORE ACCESS
              </h3>

              <div className="border-t border-white/10 pt-4 space-y-4">

                <div>
                  <p className="text-[7px] text-gray-500 tracking-[0.15em]">
                    ROLE
                  </p>

                  <p className="text-[10px] mt-1">
                    ADMIN
                  </p>
                </div>

                <div>
                  <p className="text-[7px] text-gray-500 tracking-[0.15em]">
                    STORE
                  </p>

                  <p className="text-[10px] mt-1">
                    ANIME T-SHIRT COLLECTIONS
                  </p>
                </div>

                <div>
                  <p className="text-[7px] text-gray-500 tracking-[0.15em]">
                    STATUS
                  </p>

                  <p className="text-[10px] text-green-400 mt-1 flex items-center gap-2">

                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />

                    ACTIVE

                  </p>
                </div>

              </div>

            </section>

          </div>

          {/* =========================================
              RIGHT COLUMN
          ========================================= */}

          <div className="space-y-5">

            {/* PERSONAL INFORMATION */}

            <section className="border border-white/10 bg-[#151515] p-6">

              <h3 className="text-[14px] tracking-wide mb-5">
                PERSONAL INFORMATION
              </h3>

              <div className="border-t border-white/10 pt-5 space-y-5">

                {/* FULL NAME */}

                <div>

                  <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                    FULL NAME
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full h-[38px] bg-[#090909] border border-white/10 px-3 text-[10px] text-white outline-none focus:border-red-500 transition"
                    placeholder="Enter full name"
                  />

                </div>

                {/* EMAIL */}

                <div>

                  <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                    EMAIL ADDRESS
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full h-[38px] bg-[#090909] border border-white/10 px-3 text-[10px] text-white outline-none focus:border-red-500 transition"
                    placeholder="Enter email address"
                  />

                </div>

                {/* PHONE */}

                <div>

                  <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                    PHONE NUMBER
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full h-[38px] bg-[#090909] border border-white/10 px-3 text-[10px] text-white outline-none focus:border-red-500 transition"
                    placeholder="Enter phone number"
                  />

                </div>

              </div>

            </section>

            {/* SECURITY */}

            <section className="border border-white/10 bg-[#151515] p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="text-[14px] tracking-wide">
                    SECURITY
                  </h3>

                  <p className="text-[8px] text-gray-500 mt-2">
                    Manage your GETSUKA admin account security.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={openPasswordModal}
                  className="text-[8px] tracking-[0.15em] text-red-500 hover:text-red-400 transition"
                >
                  CHANGE PASSWORD →
                </button>

              </div>

            </section>

            {/* MESSAGES */}

            {error && (
              <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-[9px] text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="border border-green-500/30 bg-green-500/5 px-4 py-3 text-[9px] text-green-400">
                {success}
              </div>
            )}

            {/* ACTIONS */}

            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/profile")
                }
                disabled={saving}
                className="border border-white/15 px-7 py-3 text-[8px] tracking-[0.18em] text-gray-400 hover:text-white hover:border-white/30 transition disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-red-500 px-7 py-3 text-[8px] tracking-[0.18em] text-white hover:bg-red-600 transition disabled:opacity-50"
              >
                {saving
                  ? "SAVING..."
                  : "SAVE CHANGES →"}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================= */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ================================================= */}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center px-4">

          <div className="w-full max-w-[460px] border border-white/10 bg-[#111111] shadow-2xl">

            {/* HEADER */}

            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">

              <div>

                <h2 className="text-[16px] tracking-wide">
                  CHANGE PASSWORD
                </h2>

                <p className="text-[8px] text-gray-500 mt-1">
                  Update your GETSUKA administrator password.
                </p>

              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordLoading}
                className="text-gray-500 hover:text-white text-[18px] disabled:opacity-40"
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleChangePassword}
              className="p-6"
            >

              {/* CURRENT PASSWORD */}

              <div className="mb-4">

                <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                  CURRENT PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.current
                        ? "text"
                        : "password"
                    }
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full h-[40px] bg-[#090909] border border-white/10 px-3 pr-10 text-[10px] text-white outline-none focus:border-red-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("current")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword.current
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>

              {/* NEW PASSWORD */}

              <div className="mb-4">

                <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                  NEW PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.new
                        ? "text"
                        : "password"
                    }
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    className="w-full h-[40px] bg-[#090909] border border-white/10 px-3 pr-10 text-[10px] text-white outline-none focus:border-red-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("new")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword.new
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              <div className="mb-4">

                <label className="block text-[7px] text-gray-500 tracking-[0.15em] mb-2">
                  CONFIRM PASSWORD
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.confirm
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className="w-full h-[40px] bg-[#090909] border border-white/10 px-3 pr-10 text-[10px] text-white outline-none focus:border-red-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("confirm")
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword.confirm
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>

              {/* REQUIREMENTS */}

              <div className="border border-white/10 bg-[#151515] p-4 mb-4">

                <p className="text-[7px] tracking-[0.15em] mb-3">
                  PASSWORD REQUIREMENTS
                </p>

                <div className="grid grid-cols-2 gap-y-2">

                  <p className="text-[7px] text-gray-400">

                    <span
                      className={
                        passwordRequirements.length
                          ? "text-green-400 mr-2"
                          : "text-red-500 mr-2"
                      }
                    >
                      {passwordRequirements.length
                        ? "✓"
                        : "×"}
                    </span>

                    8+ characters

                  </p>

                  <p className="text-[7px] text-gray-400">

                    <span
                      className={
                        passwordRequirements.uppercase
                          ? "text-green-400 mr-2"
                          : "text-red-500 mr-2"
                      }
                    >
                      {passwordRequirements.uppercase
                        ? "✓"
                        : "×"}
                    </span>

                    Uppercase letter

                  </p>

                  <p className="text-[7px] text-gray-400">

                    <span
                      className={
                        passwordRequirements.lowercase
                          ? "text-green-400 mr-2"
                          : "text-red-500 mr-2"
                      }
                    >
                      {passwordRequirements.lowercase
                        ? "✓"
                        : "×"}
                    </span>

                    Lowercase letter

                  </p>

                  <p className="text-[7px] text-gray-400">

                    <span
                      className={
                        passwordRequirements.number
                          ? "text-green-400 mr-2"
                          : "text-red-500 mr-2"
                      }
                    >
                      {passwordRequirements.number
                        ? "✓"
                        : "×"}
                    </span>

                    Number

                  </p>

                  <p className="text-[7px] text-gray-400 col-span-2">

                    <span
                      className={
                        passwordRequirements.special
                          ? "text-green-400 mr-2"
                          : "text-red-500 mr-2"
                      }
                    >
                      {passwordRequirements.special
                        ? "✓"
                        : "×"}
                    </span>

                    Special character

                  </p>

                </div>

              </div>

              {/* ERROR */}

              {passwordError && (
                <div className="border border-red-500/30 bg-red-500/5 px-3 py-3 mb-4">

                  <p className="text-[8px] text-red-400">
                    {passwordError}
                  </p>

                </div>
              )}

              {/* ACTIONS */}

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className="flex-1 h-[38px] border border-white/15 text-[8px] tracking-[0.15em] text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 h-[38px] bg-red-500 text-white text-[8px] tracking-[0.15em] hover:bg-red-600 transition disabled:opacity-50"
                >
                  {passwordLoading
                    ? "UPDATING..."
                    : "UPDATE PASSWORD →"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ================================================= */}
      {/* PASSWORD CHANGED MODAL */}
      {/* ================================================= */}

      {showPasswordChangedModal && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-md flex items-center justify-center px-4">

          <div className="w-full max-w-[340px] border border-white/10 bg-[#111111] text-center">

            <div className="flex justify-center pt-8">

              <div className="w-[52px] h-[52px] rounded-full border border-red-500 flex items-center justify-center">

                <span className="text-red-500 text-[25px]">
                  ✓
                </span>

              </div>

            </div>

            <div className="flex justify-center mt-5">

              <span className="border border-red-500/50 px-3 py-1 text-[6px] tracking-[0.15em] text-red-500">
                PASSWORD CHANGED
              </span>

            </div>

            <div className="px-8 mt-5">

              <h2 className="text-[15px] tracking-wide">
                PASSWORD UPDATED
              </h2>

              <p className="text-[8px] text-gray-500 leading-4 mt-3">
                Your GETSUKA administrator password has
                been successfully updated.
              </p>

            </div>

            <div className="px-8 pb-8 mt-6">

              <button
                type="button"
                onClick={() =>
                  setShowPasswordChangedModal(false)
                }
                className="w-full h-[38px] bg-red-500 text-white text-[8px] tracking-[0.15em] hover:bg-red-600 transition"
              >
                CONTINUE →
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AdminEditProfilePage;