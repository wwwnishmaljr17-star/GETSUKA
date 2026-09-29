import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAdminProfile,
  updateAdminProfile,
} from "../api/adminProfileApi";

import { changeAdminPassword } from "../api/adminPasswordApi";

const AdminEditProfilePage = () => {
  const navigate = useNavigate();

  // =========================================================
  // PROFILE STATE
  // =========================================================

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

  // =========================================================
  // PASSWORD MODAL STATE
  // =========================================================

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

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // =========================================================
  // FETCH ADMIN PROFILE
  // =========================================================

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
        setError(
          error.message ||
            "Failed to load administrator profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // =========================================================
  // HANDLE PROFILE INPUT
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // =========================================================
  // SAVE PROFILE
  // =========================================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError("Full name is required");
      setSuccess("");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email address is required");
      setSuccess("");
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
      setError(
        error.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // OPEN PASSWORD MODAL
  // =========================================================

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

  // =========================================================
  // CLOSE PASSWORD MODAL
  // =========================================================

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

  // =========================================================
  // HANDLE PASSWORD INPUT
  // =========================================================

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setPasswordError("");
  };

  // =========================================================
  // TOGGLE PASSWORD VISIBILITY
  // =========================================================

  const togglePassword = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // =========================================================
  // PASSWORD VALIDATION
  // =========================================================

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

  // =========================================================
  // PASSWORD REQUIREMENTS
  // =========================================================

  const passwordRequirements = {
    length:
      passwordData.newPassword.length >= 8,

    uppercase:
      /[A-Z]/.test(
        passwordData.newPassword
      ),

    lowercase:
      /[a-z]/.test(
        passwordData.newPassword
      ),

    number:
      /[0-9]/.test(
        passwordData.newPassword
      ),

    special:
      /[!@#$%^&*(),.?":{}|<>_\-\\[\]/;'`~+=]/.test(
        passwordData.newPassword
      ),
  };

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

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

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-[#16233f]">
        <div className="text-center">
          <div className="mx-auto h-[30px] w-[30px] rounded-full border-2 border-[#dfe7f3] border-t-[#1557f5] animate-spin" />

          <p className="mt-[14px] text-[10px] uppercase tracking-[0.18em] text-[#71809a]">
            Loading GETSUKA Profile...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full text-[#16233f]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="relative overflow-hidden px-[26px] pt-[28px] pb-[25px]">

        {/* BACKGROUND GLOW */}

        <div className="pointer-events-none absolute inset-0">

          <div className="absolute right-[5%] top-[-100px] h-[300px] w-[500px] rounded-full bg-[#1557f5]/[0.05] blur-[110px]" />

          <div className="absolute left-[35%] top-[40px] h-[180px] w-[300px] rounded-full bg-[#dce8ff]/40 blur-[90px]" />

        </div>

        {/* BREADCRUMB */}

        <div className="relative z-10 flex items-center gap-[8px] text-[10px]">

          <button
            type="button"
            onClick={() =>
              navigate("/admin/profile")
            }
            className="text-[#64728a] transition hover:text-[#1557f5]"
          >
            Admin Profile
          </button>

          <span className="text-[#aeb9c9]">
            ›
          </span>

          <span className="text-[#53627a]">
            Edit Profile
          </span>

        </div>

        {/* TITLE */}

        <div className="relative z-10 mt-[24px] flex items-end justify-between">

          <div>

            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.035em] text-[#16233f]">
              Edit Profile
            </h1>

            <p className="mt-[10px] text-[11px] text-[#71809a]">
              Update your GETSUKA administrator
              profile information.
            </p>

          </div>

          <div className="hidden text-right sm:block">

            <p className="text-[8px] uppercase tracking-[0.16em] text-[#8b97aa]">
              Administrator
            </p>

            <p className="mt-[6px] text-[10px] font-medium text-[#53627a]">
              {admin?.fullName || "ADMIN"}
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="px-[26px] pb-[35px]">

        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            navigate("/admin/profile")
          }
          className="mb-[14px] flex items-center gap-[8px] text-[9px] uppercase tracking-[0.13em] text-[#64728a] transition hover:text-[#1557f5]"
        >
          <span className="text-[13px]">
            ←
          </span>

          Back to Profile
        </button>


        {/* =================================================
            ERROR / SUCCESS
        ================================================= */}

        {error && (
          <div className="mb-[14px] rounded-[10px] border border-[#f0bcbc] bg-[#fff2f2] px-[15px] py-[12px]">

            <p className="text-[10px] text-[#d64545]">
              ! &nbsp; {error}
            </p>

          </div>
        )}

        {success && (
          <div className="mb-[14px] rounded-[10px] border border-[#b9e7ce] bg-[#effaf4] px-[15px] py-[12px]">

            <p className="text-[10px] text-[#1f9d62]">
              ✓ &nbsp; {success}
            </p>

          </div>
        )}


        {/* =================================================
            PROFILE EDIT CARD
        ================================================= */}

        <section className="overflow-hidden rounded-[14px] border border-[#dfe7f3] bg-white shadow-[0_8px_30px_rgba(25,65,130,0.06)]">

          {/* CARD HEADER */}

          <div className="flex items-center justify-between border-b border-[#e7edf6] px-[20px] py-[17px]">

            <div>

              <p className="text-[13px] font-semibold text-[#16233f]">
                Personal Information
              </p>

              <p className="mt-[5px] text-[10px] text-[#71809a]">
                Update the information associated
                with your administrator account.
              </p>

            </div>

            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#dce7f8] bg-[#edf3ff] text-[15px] text-[#1557f5]">
              ◎
            </div>

          </div>


          {/* FORM */}

          <form
            onSubmit={handleSave}
            className="p-[20px]"
          >

            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">

              {/* =================================================
                  FULL NAME
              ================================================= */}

              <div>

                <label className="mb-[8px] block text-[9px] font-medium uppercase tracking-[0.14em] text-[#64728a]">
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="h-[45px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] text-[11px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] transition focus:border-[#1557f5]/60 focus:bg-white"
                />

              </div>


              {/* =================================================
                  EMAIL
              ================================================= */}

              <div>

                <label className="mb-[8px] block text-[9px] font-medium uppercase tracking-[0.14em] text-[#64728a]">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="h-[45px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] text-[11px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] transition focus:border-[#1557f5]/60 focus:bg-white"
                />

              </div>


              {/* =================================================
                  PHONE
              ================================================= */}

              <div>

                <label className="mb-[8px] block text-[9px] font-medium uppercase tracking-[0.14em] text-[#64728a]">
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="h-[45px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] text-[11px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] transition focus:border-[#1557f5]/60 focus:bg-white"
                />

              </div>


              {/* =================================================
                  ROLE
              ================================================= */}

              <div>

                <label className="mb-[8px] block text-[9px] font-medium uppercase tracking-[0.14em] text-[#64728a]">
                  Account Role
                </label>

                <div className="flex h-[45px] items-center justify-between rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px]">

                  <span className="text-[11px] font-medium text-[#24324a]">
                    Super Admin
                  </span>

                  <span className="rounded-full border border-[#1557f5]/30 bg-[#eaf1ff] px-[8px] py-[4px] text-[7px] font-medium uppercase tracking-[0.1em] text-[#1557f5]">
                    FULL ACCESS
                  </span>

                </div>

              </div>

            </div>


            {/* =================================================
                ACCOUNT PREVIEW
            ================================================= */}

            <div className="mt-[22px] rounded-[10px] border border-[#e2e9f3] bg-[#f5f8fd] p-[17px]">

              <div className="flex flex-col gap-[16px] sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-[13px]">

                  <div className="flex h-[45px] w-[45px] items-center justify-center rounded-full border border-[#1557f5]/30 bg-[#eef4ff]">

                    <span className="text-[17px] font-semibold text-[#1557f5]">
                      {(formData.fullName ||
                        "G")
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                  </div>

                  <div>

                    <p className="text-[11px] font-semibold text-[#16233f]">
                      {formData.fullName ||
                        "Administrator"}
                    </p>

                    <p className="mt-[4px] text-[9px] text-[#71809a]">
                      {formData.email ||
                        "No email address"}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-[7px]">

                  <span className="h-[7px] w-[7px] rounded-full bg-[#1f9d62]" />

                  <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-[#1f9d62]">
                    Account Active
                  </span>

                </div>

              </div>

            </div>


            {/* =================================================
                FORM ACTIONS
            ================================================= */}

            <div className="mt-[20px] flex flex-col-reverse gap-[9px] sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() =>
                  navigate("/admin/profile")
                }
                disabled={saving}
                className="h-[42px] rounded-[8px] border border-[#d5deeb] bg-white px-[20px] text-[8px] font-medium uppercase tracking-[0.1em] text-[#53627a] transition hover:border-[#1557f5] hover:text-[#1557f5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                CANCEL
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-[42px] rounded-[8px] bg-[#1557f5] px-[23px] text-[8px] font-medium uppercase tracking-[0.1em] text-white shadow-[0_8px_25px_rgba(21,87,245,0.15)] transition hover:bg-[#0d47d9] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "SAVING..."
                  : "SAVE CHANGES →"}
              </button>

            </div>

          </form>

        </section>


        {/* =================================================
            SECURITY CARD
        ================================================= */}

        <section className="mt-[14px] overflow-hidden rounded-[14px] border border-[#dfe7f3] bg-white shadow-[0_8px_30px_rgba(25,65,130,0.06)]">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-[#e7edf6] px-[20px] py-[17px]">

            <div>

              <p className="text-[13px] font-semibold text-[#16233f]">
                Security
              </p>

              <p className="mt-[5px] text-[10px] text-[#71809a]">
                Protect your GETSUKA administrator account.
              </p>

            </div>

            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[#dbe5f2] bg-[#eef4ff] text-[14px] text-[#1557f5]">
              ◉
            </div>

          </div>


          {/* SECURITY CONTENT */}

          <div className="flex flex-col gap-[18px] px-[20px] py-[20px] md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-[#7a879c]">
                Password
              </p>

              <div className="mt-[8px] flex items-center gap-[8px]">

                <span className="text-[12px] tracking-[0.22em] text-[#24324a]">
                  ••••••••••••
                </span>

                <span className="rounded-full border border-[#b9e7ce] bg-[#effaf4] px-[7px] py-[3px] text-[6px] font-medium uppercase tracking-[0.1em] text-[#1f9d62]">
                  Protected
                </span>

              </div>

              <p className="mt-[7px] text-[8px] text-[#8b97aa]">
                Your password is securely protected.
              </p>

            </div>

            <button
              type="button"
              onClick={openPasswordModal}
              className="h-[40px] rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[18px] text-[8px] font-medium uppercase tracking-[0.08em] text-[#53627a] transition hover:border-[#1557f5] hover:bg-[#edf3ff] hover:text-[#1557f5]"
            >
              CHANGE PASSWORD →
            </button>

          </div>

        </section>


        {/* =================================================
            STORE INFORMATION
        ================================================= */}

        <section className="mt-[14px] overflow-hidden rounded-[14px] border border-[#dfe7f3] bg-white shadow-[0_8px_30px_rgba(25,65,130,0.06)]">

          <div className="border-b border-[#e7edf6] px-[20px] py-[17px]">

            <p className="text-[13px] font-semibold text-[#16233f]">
              Store Information
            </p>

            <p className="mt-[5px] text-[10px] text-[#71809a]">
              Current GETSUKA store configuration.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-[1px] bg-[#e2e9f3] sm:grid-cols-3">

            {/* STORE */}

            <div className="bg-white px-[18px] py-[17px]">

              <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-[#7a879c]">
                Store
              </p>

              <p className="mt-[8px] text-[12px] font-semibold text-[#16233f]">
                GETSUKA
              </p>

            </div>


            {/* CATEGORY */}

            <div className="bg-white px-[18px] py-[17px]">

              <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-[#7a879c]">
                Store Category
              </p>

              <p className="mt-[8px] text-[11px] text-[#24324a]">
                Anime T-Shirts
              </p>

            </div>


            {/* FOCUS */}

            <div className="bg-white px-[18px] py-[17px]">

              <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-[#7a879c]">
                Product Focus
              </p>

              <p className="mt-[8px] text-[11px] text-[#24324a]">
                Anime Collections
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-[30px] flex items-center justify-between border-t border-[#e2e9f3] px-[5px] py-[20px]">

          <div>

            <p className="text-[12px] font-semibold text-[#1557f5]">
              GETSUKA
            </p>

            <p className="mt-[3px] text-[8px] text-[#7a879c]">
              Admin Terminal v1.0.0
            </p>

          </div>

          <p className="text-[9px] text-[#7a879c]">
            Built with{" "}
            <span className="text-[#1557f5]">
              ♥
            </span>{" "}
            for anime fans.
          </p>

        </footer>

      </main>


      {/* =====================================================
          CHANGE PASSWORD MODAL
      ===================================================== */}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102047]/35 px-4 backdrop-blur-[4px]">

          <div className="w-full max-w-[470px] overflow-hidden rounded-[14px] border border-[#d5deeb] bg-white shadow-[0_30px_100px_rgba(16,32,71,0.18)]">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-[#e7edf6] px-[20px] py-[18px]">

              <div>

                <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#1557f5]">
                  GETSUKA / SECURITY
                </p>

                <h2 className="mt-[6px] text-[17px] font-semibold text-[#16233f]">
                  Change Password
                </h2>

                <p className="mt-[5px] text-[9px] text-[#71809a]">
                  Update your administrator password.
                </p>

              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordLoading}
                className="text-[22px] text-[#8b97aa] transition hover:text-[#1557f5] disabled:opacity-40"
              >
                ×
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleChangePassword}
              className="p-[20px]"
            >

              {/* CURRENT PASSWORD */}

              <div className="mb-[16px]">

                <label className="mb-[8px] block text-[8px] font-medium uppercase tracking-[0.13em] text-[#64728a]">
                  Current Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.current
                        ? "text"
                        : "password"
                    }
                    name="currentPassword"
                    value={
                      passwordData.currentPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    placeholder="Enter current password"
                    className="h-[43px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] pr-[45px] text-[10px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] focus:border-[#1557f5]/60 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("current")
                    }
                    className="absolute right-[13px] top-1/2 -translate-y-1/2 text-[12px] text-[#71809a] hover:text-[#1557f5]"
                  >
                    {showPassword.current
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>


              {/* NEW PASSWORD */}

              <div className="mb-[16px]">

                <label className="mb-[8px] block text-[8px] font-medium uppercase tracking-[0.13em] text-[#64728a]">
                  New Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.new
                        ? "text"
                        : "password"
                    }
                    name="newPassword"
                    value={
                      passwordData.newPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    placeholder="Enter new password"
                    className="h-[43px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] pr-[45px] text-[10px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] focus:border-[#1557f5]/60 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("new")
                    }
                    className="absolute right-[13px] top-1/2 -translate-y-1/2 text-[12px] text-[#71809a] hover:text-[#1557f5]"
                  >
                    {showPassword.new
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="mb-[16px]">

                <label className="mb-[8px] block text-[8px] font-medium uppercase tracking-[0.13em] text-[#64728a]">
                  Confirm Password
                </label>

                <div className="relative">

                  <input
                    type={
                      showPassword.confirm
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={
                      passwordData.confirmPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    placeholder="Confirm new password"
                    className="h-[43px] w-full rounded-[8px] border border-[#d5deeb] bg-[#f8faff] px-[13px] pr-[45px] text-[10px] text-[#16233f] outline-none placeholder:text-[#9aa6b8] focus:border-[#1557f5]/60 focus:bg-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      togglePassword("confirm")
                    }
                    className="absolute right-[13px] top-1/2 -translate-y-1/2 text-[12px] text-[#71809a] hover:text-[#1557f5]"
                  >
                    {showPassword.confirm
                      ? "◉"
                      : "○"}
                  </button>

                </div>

              </div>


              {/* PASSWORD REQUIREMENTS */}

              <div className="mb-[16px] rounded-[9px] border border-[#d5deeb] bg-[#f5f8fd] p-[15px]">

                <p className="mb-[11px] text-[8px] font-medium uppercase tracking-[0.13em] text-[#71809a]">
                  Password Requirements
                </p>

                <div className="grid grid-cols-2 gap-x-[15px] gap-y-[9px]">

                  {/* LENGTH */}

                  <p className="flex items-center text-[8px] text-[#65738a]">

                    <span
                      className={
                        passwordRequirements.length
                          ? "mr-[7px] text-[#1f9d62]"
                          : "mr-[7px] text-[#d64545]"
                      }
                    >
                      {passwordRequirements.length
                        ? "✓"
                        : "×"}
                    </span>

                    8+ characters

                  </p>


                  {/* UPPERCASE */}

                  <p className="flex items-center text-[8px] text-[#65738a]">

                    <span
                      className={
                        passwordRequirements.uppercase
                          ? "mr-[7px] text-[#1f9d62]"
                          : "mr-[7px] text-[#d64545]"
                      }
                    >
                      {passwordRequirements.uppercase
                        ? "✓"
                        : "×"}
                    </span>

                    Uppercase letter

                  </p>


                  {/* LOWERCASE */}

                  <p className="flex items-center text-[8px] text-[#65738a]">

                    <span
                      className={
                        passwordRequirements.lowercase
                          ? "mr-[7px] text-[#1f9d62]"
                          : "mr-[7px] text-[#d64545]"
                      }
                    >
                      {passwordRequirements.lowercase
                        ? "✓"
                        : "×"}
                    </span>

                    Lowercase letter

                  </p>


                  {/* NUMBER */}

                  <p className="flex items-center text-[8px] text-[#65738a]">

                    <span
                      className={
                        passwordRequirements.number
                          ? "mr-[7px] text-[#1f9d62]"
                          : "mr-[7px] text-[#d64545]"
                      }
                    >
                      {passwordRequirements.number
                        ? "✓"
                        : "×"}
                    </span>

                    Number

                  </p>


                  {/* SPECIAL */}

                  <p className="col-span-2 flex items-center text-[8px] text-[#65738a]">

                    <span
                      className={
                        passwordRequirements.special
                          ? "mr-[7px] text-[#1f9d62]"
                          : "mr-[7px] text-[#d64545]"
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


              {/* PASSWORD ERROR */}

              {passwordError && (
                <div className="mb-[16px] rounded-[8px] border border-[#f0bcbc] bg-[#fff2f2] px-[12px] py-[10px]">

                  <p className="text-[9px] leading-[1.5] text-[#d64545]">
                    ! &nbsp; {passwordError}
                  </p>

                </div>
              )}


              {/* MODAL ACTIONS */}

              <div className="flex gap-[9px]">

                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className="h-[42px] flex-1 rounded-[8px] border border-[#d5deeb] bg-white text-[8px] font-medium uppercase tracking-[0.1em] text-[#53627a] transition hover:border-[#1557f5] hover:text-[#1557f5] disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="h-[42px] flex-1 rounded-[8px] bg-[#1557f5] text-[8px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#0d47d9] disabled:opacity-50"
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


      {/* =====================================================
          PASSWORD CHANGED MODAL
      ===================================================== */}

      {showPasswordChangedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#102047]/35 px-4 backdrop-blur-[4px]">

          <div className="w-full max-w-[370px] overflow-hidden rounded-[14px] border border-[#d5deeb] bg-white shadow-[0_30px_100px_rgba(16,32,71,0.18)]">

            {/* SUCCESS ICON */}

            <div className="flex justify-center pt-[30px]">

              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#b9e7ce] bg-[#effaf4]">

                <span className="text-[25px] text-[#1f9d62]">
                  ✓
                </span>

              </div>

            </div>


            {/* BADGE */}

            <div className="mt-[17px] flex justify-center">

              <span className="rounded-full border border-[#b9e7ce] bg-[#effaf4] px-[10px] py-[5px] text-[6px] font-medium uppercase tracking-[0.14em] text-[#1f9d62]">
                Password Changed
              </span>

            </div>


            {/* TEXT */}

            <div className="px-[28px] pt-[17px] text-center">

              <h2 className="text-[17px] font-semibold text-[#16233f]">
                Password Updated
              </h2>

              <p className="mt-[9px] text-[9px] leading-[1.7] text-[#71809a]">
                Your GETSUKA administrator
                password has been successfully
                updated.
              </p>

            </div>


            {/* BUTTON */}

            <div className="px-[28px] pb-[28px] pt-[20px]">

              <button
                type="button"
                onClick={() =>
                  setShowPasswordChangedModal(
                    false
                  )
                }
                className="h-[42px] w-full rounded-[8px] bg-[#1557f5] text-[8px] font-medium uppercase tracking-[0.1em] text-white transition hover:bg-[#0d47d9]"
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