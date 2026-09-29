import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getUserProfile,
  updateUserProfile,
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
  changePassword,
} from "../api/userProfileApi";

const UpdateProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ============================================
  // USER
  // ============================================

  const [user, setUser] = useState(null);

  // ============================================
  // PROFILE IMAGE
  // ============================================

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // ============================================
  // FORM DATA
  // ============================================

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
  });

  // ============================================
  // UI STATES
  // ============================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordModal, setShowPasswordModal] =
    useState(false);

  // ============================================
  // CHANGE PASSWORD STATES
  // ============================================

  const [passwordData, setPasswordData] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [showLogoutModal, setShowLogoutModal] =
    useState(false);

  // ============================================
  // EMAIL OTP STATES
  // ============================================

  const [showEmailOtpModal, setShowEmailOtpModal] =
    useState(false);

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const [otpTimeLeft, setOtpTimeLeft] = useState(300);

  const [pendingEmail, setPendingEmail] =
    useState("");

  // ============================================
  // ACTIVE SIDEBAR
  // ============================================

  const isActive = (path) => {
    return location.pathname === path;
  };

  // ============================================
  // FETCH USER PROFILE
  // ============================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token =
          sessionStorage.getItem("token") ||
          localStorage.getItem("token");

        if (!token) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        const data = await getUserProfile();

        if (data.success) {
          const profile = data.user;

          setUser(profile);

          setFormData({
            fullName: profile.fullName || "",
            email: profile.email || "",
            phone: profile.phone || "",
            dateOfBirth: profile.dateOfBirth
              ? new Date(profile.dateOfBirth)
                  .toISOString()
                  .split("T")[0]
              : "",
          });

          setImagePreview(
            profile.profileImage || ""
          );
        } else {
          setError(
            data.message ||
              "Failed to load profile"
          );
        }
      } catch (err) {
        console.error(
          "Profile Fetch Error:",
          err
        );

        if (err.response?.status === 401) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");

          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // ============================================
  // GOOGLE LOGIN USER
  // ============================================

  const isGoogleUser =
    user?.authProvider === "google" ||
    Boolean(user?.googleId);

  // ============================================
  // OTP TIMER
  // ============================================

  useEffect(() => {
    if (!showEmailOtpModal) {
      return;
    }

    if (otpTimeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showEmailOtpModal, otpTimeLeft]);

  // ============================================
  // OTP TIME FORMAT
  // ============================================

  const formatOtpTime = () => {
    const minutes = Math.floor(
      otpTimeLeft / 60
    );

    const seconds = otpTimeLeft % 60;

    return `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // ============================================
  // HANDLE INPUT CHANGE
  // ============================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Google users cannot change email
    if (
      name === "email" &&
      isGoogleUser
    ) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ============================================
  // HANDLE IMAGE CHANGE
  // ============================================

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image size must be less than 5 MB."
      );
      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);

    setError("");
    setSuccess("");
  };

  // ============================================
  // BUILD PROFILE FORM DATA
  // ============================================

  const buildProfileFormData = () => {
    const profileData = new FormData();

    profileData.append(
      "fullName",
      formData.fullName.trim()
    );

    profileData.append(
      "email",
      formData.email.trim()
    );

    profileData.append(
      "phone",
      formData.phone.trim()
    );

    profileData.append(
      "dateOfBirth",
      formData.dateOfBirth || ""
    );

    if (imageFile) {
      profileData.append(
        "profileImage",
        imageFile
      );
    }

    return profileData;
  };

  // ============================================
  // SAVE PROFILE
  // ============================================

  const saveProfile = async (emailOverride = null) => {
    const profileData =
      buildProfileFormData();

    if (emailOverride) {
      profileData.set(
        "email",
        emailOverride.trim().toLowerCase()
      );
    }

    const data =
      await updateUserProfile(
        profileData
      );

    if (!data.success) {
      throw new Error(
        data.message ||
          "Failed to update profile."
      );
    }

    setUser(data.user);

    setFormData({
      fullName:
        data.user.fullName || "",

      email:
        data.user.email || "",

      phone:
        data.user.phone || "",

      dateOfBirth:
        data.user.dateOfBirth
          ? new Date(
              data.user.dateOfBirth
            )
              .toISOString()
              .split("T")[0]
          : "",
    });

    setImageFile(null);

    setImagePreview(
      data.user.profileImage || ""
    );

    const userStorage = {
      id: data.user._id,
      fullName: data.user.fullName,
      email: data.user.email,
      profileImage:
        data.user.profileImage || "",
      isVerified:
        data.user.isVerified,
      authProvider:
        data.user.authProvider || "local",
      googleId:
        data.user.googleId || "",
    };

    if (
      sessionStorage.getItem("token")
    ) {
      sessionStorage.setItem(
        "user",
        JSON.stringify(userStorage)
      );
    } else {
      localStorage.setItem(
        "user",
        JSON.stringify(userStorage)
      );
    }

    return data;
  };

  // ============================================
  // SAVE PROFILE
  // ============================================

  const handleSave = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required.");
      return;
    }

    const newEmail =
      formData.email.trim().toLowerCase();

    const currentEmail =
      user.email.trim().toLowerCase();

    // ========================================
    // GOOGLE USER EMAIL PROTECTION
    // ========================================

    if (
      isGoogleUser &&
      newEmail !== currentEmail
    ) {
      setFormData((previous) => ({
        ...previous,
        email: user.email || "",
      }));

      setError(
        "Google login accounts cannot change their email address."
      );

      return;
    }

    // ========================================
    // EMAIL NOT CHANGED
    // ========================================

    if (newEmail === currentEmail) {
      try {
        setSaving(true);

        await saveProfile();

        setSuccess(
          "Profile updated successfully."
        );

        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } catch (err) {
        console.error(
          "Update Profile Error:",
          err
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to update profile."
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    // ========================================
    // EMAIL CHANGED
    // ========================================

    // Extra protection for Google accounts
    if (isGoogleUser) {
      setError(
        "Google login accounts cannot change their email address."
      );

      return;
    }

    try {
      setSaving(true);

      const data =
        await sendEmailChangeOtp(
          newEmail
        );

      if (!data.success) {
        setError(
          data.message ||
            "Failed to send OTP."
        );

        return;
      }

      setPendingEmail(newEmail);

      // IMPORTANT:
      // Exactly 6 OTP boxes
      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setOtpError("");

      setOtpTimeLeft(300);

      setShowEmailOtpModal(true);
    } catch (err) {
      console.error(
        "Send Email OTP Error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to send OTP."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HANDLE OTP INPUT
  // ============================================

  const handleOtpChange = (
    index,
    value
  ) => {
    const numericValue =
      value.replace(/\D/g, "");

    if (numericValue.length > 1) {
      return;
    }

    const newOtp = [...otp];

    newOtp[index] = numericValue;

    setOtp(newOtp);
    setOtpError("");

    // Move to next box
    if (
      numericValue &&
      index < 5
    ) {
      const nextInput =
        document.getElementById(
          `email-otp-${index + 1}`
        );

      nextInput?.focus();
    }
  };

  // ============================================
  // HANDLE OTP KEY DOWN
  // ============================================

  const handleOtpKeyDown = (
    index,
    e
  ) => {
    if (
      e.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      const previousInput =
        document.getElementById(
          `email-otp-${index - 1}`
        );

      previousInput?.focus();
    }
  };

  // ============================================
  // HANDLE OTP PASTE
  // ============================================

  const handleOtpPaste = (e) => {
    e.preventDefault();

    const pastedValue =
      e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!pastedValue) {
      return;
    }

    const newOtp = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    pastedValue
      .split("")
      .forEach((digit, index) => {
        newOtp[index] = digit;
      });

    setOtp(newOtp);
    setOtpError("");

    const focusIndex = Math.min(
      pastedValue.length,
      5
    );

    document
      .getElementById(
        `email-otp-${focusIndex}`
      )
      ?.focus();
  };

  // ============================================
  // VERIFY EMAIL OTP
  // ============================================

  const handleVerifyEmailOtp = async () => {
    const enteredOtp =
      otp.join("");

    // IMPORTANT:
    // OTP must contain exactly 6 digits
    if (enteredOtp.length !== 6) {
      setOtpError(
        "Please enter the 6-digit OTP."
      );

      return;
    }

    if (otpTimeLeft <= 0) {
      setOtpError(
        "OTP has expired. Please request a new OTP."
      );

      return;
    }

    try {
      setOtpLoading(true);
      setOtpError("");

      const data =
        await verifyEmailChangeOtp(
          enteredOtp
        );

      if (!data.success) {
        setOtpError(
          data.message ||
            "Invalid OTP."
        );

        return;
      }

      // ======================================
      // EMAIL VERIFIED
      // ======================================

      if (data.user) {
        setUser(data.user);

        setFormData((previous) => ({
          ...previous,
          email:
            data.user.email ||
            pendingEmail,
        }));
      }

      // ======================================
      // CLOSE OTP MODAL
      // ======================================

      setShowEmailOtpModal(false);

      // ======================================
      // SAVE OTHER PROFILE CHANGES
      // ======================================

      try {
        setSaving(true);

        await saveProfile(
          data.user?.email || pendingEmail
        );

        setSuccess(
          "Email verified and profile updated successfully."
        );

        setTimeout(() => {
          setSuccess("");
        }, 4000);
      } catch (saveError) {
        console.error(
          "Profile Save After Email Error:",
          saveError
        );

        setError(
          saveError.response?.data?.message ||
            saveError.message ||
            "Email changed, but profile update failed."
        );
      } finally {
        setSaving(false);
      }

      setPendingEmail("");
    } catch (err) {
      console.error(
        "Verify Email OTP Error:",
        err
      );

      setOtpError(
        err.response?.data?.message ||
          "Failed to verify OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ============================================
  // RESEND EMAIL OTP
  // ============================================

  const handleResendOtp = async () => {
    if (!pendingEmail || isGoogleUser) {
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError("");

      const data =
        await sendEmailChangeOtp(
          pendingEmail
        );

      if (!data.success) {
        setOtpError(
          data.message ||
            "Failed to resend OTP."
        );

        return;
      }

      // IMPORTANT:
      // Reset all 6 boxes
      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      setOtpTimeLeft(300);

      setOtpError("");

      setTimeout(() => {
        document
          .getElementById(
            "email-otp-0"
          )
          ?.focus();
      }, 50);
    } catch (err) {
      console.error(
        "Resend Email OTP Error:",
        err
      );

      setOtpError(
        err.response?.data?.message ||
          "Failed to resend OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ============================================
  // CLOSE OTP MODAL
  // ============================================

  const closeEmailOtpModal = () => {
    if (otpLoading) {
      return;
    }

    setShowEmailOtpModal(false);

    setOtp([
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    setOtpError("");
    setPendingEmail("");
    setOtpTimeLeft(300);

    setFormData((previous) => ({
      ...previous,
      email: user.email || "",
    }));
  };

  // ============================================
  // CHANGE PASSWORD INPUT
  // ============================================

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  // ============================================
  // CLOSE PASSWORD MODAL
  // ============================================

  const closePasswordModal = () => {
    if (passwordLoading) {
      return;
    }

    setShowPasswordModal(false);

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordError("");
    setPasswordSuccess("");
  };

  // ============================================
  // CHANGE PASSWORD
  // ============================================

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    // Google users cannot change password
    if (isGoogleUser) {
      setPasswordError(
        "Google login accounts cannot change their password."
      );

      return;
    }

    if (!passwordData.currentPassword) {
      setPasswordError(
        "Current password is required."
      );
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError(
        "New password is required."
      );
      return;
    }

    if (!passwordData.confirmPassword) {
      setPasswordError(
        "Please confirm your new password."
      );
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError(
        "New password must be at least 6 characters."
      );
      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setPasswordError(
        "New password and confirm password do not match."
      );
      return;
    }

    if (
      passwordData.currentPassword ===
      passwordData.newPassword
    ) {
      setPasswordError(
        "New password must be different from your current password."
      );
      return;
    }

    try {
      setPasswordLoading(true);

      const data = await changePassword({
        currentPassword:
          passwordData.currentPassword,
        newPassword:
          passwordData.newPassword,
        confirmPassword:
          passwordData.confirmPassword,
      });

      if (!data.success) {
        setPasswordError(
          data.message ||
            "Failed to change password."
        );
        return;
      }

      setPasswordSuccess(
        data.message ||
          "Password changed successfully."
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (err) {
      console.error(
        "Change Password Error:",
        err
      );

      setPasswordError(
        err.response?.data?.message ||
          "Failed to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setShowLogoutModal(false);

    navigate("/login", {
      replace: true,
    });
  };

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <p className="text-xs tracking-[0.2em] text-gray-500">
          LOADING...
        </p>
      </div>
    );
  }

  // ============================================
  // ERROR WITHOUT USER
  // ============================================

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center">

          <p className="text-sm text-red-500 mb-5">
            {error ||
              "Unable to load profile."}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="border border-white/20 px-6 py-3 text-[10px] tracking-[0.15em] hover:border-white transition"
          >
            TRY AGAIN
          </button>

        </div>
      </div>
    );
  }

  // ============================================
  // MAIN
  // ============================================

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      <main className="min-h-[calc(100vh-85px)] w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row">

        {/* ======================================
            LEFT SIDEBAR
        ====================================== */}

        <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 border-r border-white/10 px-8 xl:px-12 pt-[54px]">

          <p className="text-[12px] tracking-[0.25em] text-gray-500 mb-10 whitespace-nowrap">
            MY ACCOUNT
          </p>

          <nav className="space-y-8">

            <button
              type="button"
              onClick={() =>
                navigate("/account")
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive("/account")
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/update-profile"
                )
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive(
                  "/account/update-profile"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/orders"
                )
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive(
                  "/account/orders"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              ORDER HISTORY
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/addresses"
                )
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive(
                  "/account/addresses"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              SAVED ADDRESSES
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/referral"
                )
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive(
                  "/account/referral"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              REFER & EARN
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/account/wallet"
                )
              }
              className={`block text-left text-[14px] whitespace-nowrap transition ${
                isActive(
                  "/account/wallet"
                )
                  ? "text-white font-medium"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              MY WALLET
            </button>

          </nav>

          <div className="border-t border-white/10 mt-14 pt-8">

            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(true)
              }
              className="text-[14px] text-red-500 hover:text-red-400 transition"
            >
              SIGN OUT
            </button>

          </div>

        </aside>

        {/* ======================================
            MOBILE ACCOUNT NAVIGATION
        ====================================== */}

        <div className="lg:hidden w-full border-b border-white/10 px-5 sm:px-8 py-5">

          <p className="text-[10px] tracking-[0.25em] text-gray-500 mb-5">
            MY ACCOUNT
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">

            <button
              type="button"
              onClick={() => navigate("/account")}
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive("/account")
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              ACCOUNT DETAILS
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/update-profile")
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive("/account/update-profile")
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              PERSONAL INFORMATION
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/orders")
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive("/account/orders")
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              ORDER HISTORY
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/addresses")
              }
              className={`text-left text-[11px] tracking-wide py-2 transition ${
                isActive("/account/addresses")
                  ? "text-white"
                  : "text-gray-500"
              }`}
            >
              SAVED ADDRESSES
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/referral")
              }
              className="text-left text-[11px] tracking-wide py-2 text-gray-500 hover:text-white transition"
            >
              REFER & EARN
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/account/wallet")
              }
              className="text-left text-[11px] tracking-wide py-2 text-gray-500 hover:text-white transition"
            >
              MY WALLET
            </button>

          </div>

          <div className="mt-4 pt-4 border-t border-white/10">

            <button
              type="button"
              onClick={() =>
                setShowLogoutModal(true)
              }
              className="text-[11px] tracking-wide text-red-500 hover:text-red-400 transition"
            >
              SIGN OUT
            </button>

          </div>

        </div>

        {/* ======================================
            RIGHT CONTENT
        ====================================== */}

        <section className="flex-1 min-w-0 px-5 sm:px-8 lg:px-[51px] xl:pr-[70px] pt-8 sm:pt-10 lg:pt-[54px] pb-12">

          <div className="mb-8 sm:mb-12">

            <p className="text-[12px] tracking-[0.28em] text-gray-500 mb-4">
              ACCOUNT
            </p>

            <h1 className="text-[32px] font-light">
              Personal Information
            </h1>

          </div>

          <form
            onSubmit={handleSave}
            className="border border-white/10 bg-[#0b0b0b]"
          >

            {/* PROFILE HEADER */}

            <div className="px-5 sm:px-9 py-6 sm:py-8 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-5">

              <div className="w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] shrink-0 rounded-full bg-white text-black flex items-center justify-center text-[22px] sm:text-[25px] font-medium overflow-hidden">

                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.fullName
                    ?.charAt(0)
                    ?.toUpperCase() || "N"
                )}

              </div>

              <div>

                <h2 className="text-[21px]">
                  {user.fullName}
                </h2>

                <p className="text-[13px] text-gray-500 mt-2">
                  {user.email}
                </p>

                <div className="mt-4">

                  <label
                    htmlFor="profileImage"
                    className="inline-flex items-center justify-center h-[34px] px-4 border border-white/15 text-[10px] tracking-[0.12em] text-gray-300 cursor-pointer hover:border-white hover:text-white transition"
                  >
                    CHANGE PHOTO
                  </label>

                  <input
                    id="profileImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                </div>

              </div>

            </div>

            {/* FORM FIELDS */}

            <div className="px-5 sm:px-9 py-7 sm:py-9">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 sm:gap-y-8">

                <div>

                  <label className="block text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                    FULL NAME
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full h-[48px] bg-transparent border border-white/15 px-4 text-[13px] text-white outline-none focus:border-white transition"
                  />

                </div>

                <div>

                  <label className="block text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                    EMAIL
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    readOnly={isGoogleUser}
                    disabled={isGoogleUser}
                    title={
                      isGoogleUser
                        ? "Google login accounts cannot change their email address"
                        : undefined
                    }
                    className={`w-full h-[48px] bg-transparent border border-white/15 px-4 text-[13px] outline-none transition ${
                      isGoogleUser
                        ? "text-gray-500 cursor-not-allowed bg-white/[0.02]"
                        : "text-white focus:border-white"
                    }`}
                  />

                  {isGoogleUser && (
                    <p className="text-[10px] text-gray-600 mt-2">
                      Email is managed through Google login.
                    </p>
                  )}

                </div>

                <div>

                  <label className="block text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                    PHONE
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full h-[48px] bg-transparent border border-white/15 px-4 text-[13px] text-white outline-none focus:border-white transition"
                  />

                </div>

                <div>

                  <label className="block text-[11px] tracking-[0.16em] text-gray-500 mb-3">
                    DATE OF BIRTH
                  </label>

                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full h-[48px] bg-transparent border border-white/15 px-4 text-[13px] text-white outline-none focus:border-white transition"
                  />

                </div>

              </div>

            </div>

            {/* MESSAGE */}

            {(error || success) && (
              <div className="px-5 sm:px-9 pb-5">

                {error && (
                  <p className="text-[12px] text-red-500">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="text-[12px] text-green-500">
                    {success}
                  </p>
                )}

              </div>
            )}

            {/* ACTIONS */}

            <div className="px-5 sm:px-9 py-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate("/account")
                }
                className="w-full sm:w-auto px-7 h-[43px] border border-white/15 text-[11px] hover:border-white transition"
              >
                CANCEL
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-7 h-[43px] bg-white text-black text-[11px] hover:bg-gray-200 transition disabled:opacity-50"
              >
                {saving
                  ? "SAVING..."
                  : "SAVE CHANGES"}
              </button>

            </div>

          </form>

          {/* ====================================
              PASSWORD & SECURITY
          ==================================== */}

          {!isGoogleUser && (
            <div className="border border-white/10 bg-[#0b0b0b] mt-5 px-5 sm:px-9 py-6 sm:py-7">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

                <div>

                  <h2 className="text-[18px]">
                    Password & Security
                  </h2>

                  <p className="text-[12px] text-gray-500 mt-2">
                    Manage your account password.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordError("");
                    setPasswordSuccess("");
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                    setShowPasswordModal(true);
                  }}
                  className="text-[11px] text-gray-300 hover:text-white transition"
                >
                  CHANGE PASSWORD →
                </button>

              </div>

            </div>
          )}

        </section>

      </main>

      {/* ========================================
          EMAIL OTP MODAL
      ======================================== */}

      {showEmailOtpModal &&
        !isGoogleUser && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center px-4 sm:px-5 py-5 overflow-y-auto">

            <div className="w-full max-w-[470px] max-h-[calc(100vh-40px)] overflow-y-auto bg-[#111111] border border-white/10">

              {/* HEADER */}

              <div className="px-5 sm:px-7 py-6 border-b border-white/10 flex items-start justify-between gap-4">

                <div>

                  <p className="text-[10px] tracking-[0.18em] text-gray-500 mb-3">
                    EMAIL VERIFICATION
                  </p>

                  <h2 className="text-[21px]">
                    Verify New Email
                  </h2>

                  <p className="text-[11px] text-gray-500 mt-2 leading-5">
                    We sent a 6-digit verification
                    code to
                  </p>

                  <p className="text-[12px] text-white mt-1 break-all">
                    {pendingEmail}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closeEmailOtpModal}
                  disabled={otpLoading}
                  className="text-gray-500 hover:text-white text-xl disabled:opacity-40"
                >
                  ×
                </button>

              </div>

              {/* ==================================
                  6 DIGIT OTP
              ================================== */}

              <div className="px-5 sm:px-7 py-6 sm:py-7">

                <div
                  className="flex justify-center gap-1.5 sm:gap-3"
                  onPaste={handleOtpPaste}
                >

                  {/* BOX 1 */}

                  <input
                    id="email-otp-0"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[0]}
                    onChange={(e) =>
                      handleOtpChange(
                        0,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        0,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                    autoFocus
                  />

                  {/* BOX 2 */}

                  <input
                    id="email-otp-1"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[1]}
                    onChange={(e) =>
                      handleOtpChange(
                        1,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        1,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                  />

                  {/* BOX 3 */}

                  <input
                    id="email-otp-2"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[2]}
                    onChange={(e) =>
                      handleOtpChange(
                        2,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        2,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                  />

                  {/* BOX 4 */}

                  <input
                    id="email-otp-3"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[3]}
                    onChange={(e) =>
                      handleOtpChange(
                        3,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        3,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                  />

                  {/* BOX 5 */}

                  <input
                    id="email-otp-4"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[4]}
                    onChange={(e) =>
                      handleOtpChange(
                        4,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        4,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                  />

                  {/* BOX 6 */}

                  <input
                    id="email-otp-5"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[5]}
                    onChange={(e) =>
                      handleOtpChange(
                        5,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleOtpKeyDown(
                        5,
                        e
                      )
                    }
                    className="w-[40px] h-[50px] sm:w-[50px] sm:h-[56px] bg-[#080808] border border-white/15 text-white text-center text-[20px] outline-none focus:border-white transition"
                  />

                </div>

                {/* TIMER */}

                <div className="mt-5 text-center">

                  {otpTimeLeft > 0 ? (
                    <p className="text-[11px] text-gray-500">
                      OTP expires in{" "}
                      <span className="text-white">
                        {formatOtpTime()}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-500">
                      OTP expired
                    </p>
                  )}

                </div>

                {/* ERROR */}

                {otpError && (
                  <p className="text-[11px] text-red-500 text-center mt-4">
                    {otpError}
                  </p>
                )}

                {/* VERIFY */}

                <button
                  type="button"
                  onClick={
                    handleVerifyEmailOtp
                  }
                  disabled={
                    otpLoading ||
                    otpTimeLeft <= 0
                  }
                  className="w-full h-[44px] mt-6 bg-white text-black text-[10px] tracking-[0.12em] hover:bg-gray-200 transition disabled:opacity-40"
                >
                  {otpLoading
                    ? "VERIFYING..."
                    : "VERIFY EMAIL"}
                </button>

                {/* RESEND */}

                <div className="text-center mt-5">

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={
                      otpLoading ||
                      otpTimeLeft > 0
                    }
                    className="text-[10px] tracking-[0.1em] text-gray-400 hover:text-white transition disabled:opacity-30"
                  >
                    RESEND OTP
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      {/* ========================================
          CHANGE PASSWORD MODAL
      ======================================== */}

      {showPasswordModal &&
        !isGoogleUser && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center px-4 sm:px-5 py-5 overflow-y-auto">

            <div className="w-full max-w-[430px] max-h-[calc(100vh-40px)] overflow-y-auto bg-[#111111] border border-white/10">

              <div className="px-5 sm:px-7 py-6 border-b border-white/10 flex items-center justify-between gap-4">

                <div>

                  <h2 className="text-[20px]">
                    Change Password
                  </h2>

                  <p className="text-[11px] text-gray-500 mt-2">
                    Update your GETSUKA account password.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="text-gray-500 hover:text-white text-xl"
                >
                  ×
                </button>

              </div>

              <div className="px-5 sm:px-7 py-6 sm:py-7 space-y-5">

                {passwordError && (
                  <p className="text-[11px] text-red-500">
                    {passwordError}
                  </p>
                )}

                {passwordSuccess && (
                  <p className="text-[11px] text-green-500">
                    {passwordSuccess}
                  </p>
                )}

                <div>

                  <label className="block text-[10px] tracking-[0.15em] text-gray-500 mb-2">
                    CURRENT PASSWORD
                  </label>

                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    className="w-full h-[45px] bg-[#080808] border border-white/15 px-3 text-[12px] outline-none focus:border-white"
                  />

                </div>

                <div>

                  <label className="block text-[10px] tracking-[0.15em] text-gray-500 mb-2">
                    NEW PASSWORD
                  </label>

                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="w-full h-[45px] bg-[#080808] border border-white/15 px-3 text-[12px] outline-none focus:border-white"
                  />

                </div>

                <div>

                  <label className="block text-[10px] tracking-[0.15em] text-gray-500 mb-2">
                    CONFIRM PASSWORD
                  </label>

                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full h-[45px] bg-[#080808] border border-white/15 px-3 text-[12px] outline-none focus:border-white"
                  />

                </div>

                <div className="flex gap-3 pt-3">

                  <button
                    type="button"
                    onClick={closePasswordModal}
                    disabled={passwordLoading}
                    className="flex-1 h-[42px] border border-white/15 text-[10px] hover:border-white transition disabled:opacity-40"
                  >
                    CANCEL
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleChangePassword
                    }
                    disabled={passwordLoading}
                    className="flex-1 h-[42px] bg-white text-black text-[10px] hover:bg-gray-200 transition disabled:opacity-40"
                  >
                    {passwordLoading
                      ? "UPDATING..."
                      : "UPDATE PASSWORD"}
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      {/* ========================================
          LOGOUT MODAL
      ======================================== */}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center px-4 sm:px-5 py-5 overflow-y-auto">

          <div className="w-full max-w-[380px] bg-[#111111] border border-white/10">

            <div className="px-5 sm:px-7 py-7 border-b border-white/10">

              <h2 className="text-[21px]">
                Sign Out
              </h2>

              <p className="text-[12px] text-gray-500 mt-3 leading-5">
                Are you sure you want to sign out
                of your GETSUKA account?
              </p>

            </div>

            <div className="px-7 py-5 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
                className="flex-1 h-[42px] border border-white/15 text-[10px] hover:border-white transition"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 h-[42px] bg-red-500 text-white text-[10px] hover:bg-red-600 transition"
              >
                SIGN OUT
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default UpdateProfilePage;