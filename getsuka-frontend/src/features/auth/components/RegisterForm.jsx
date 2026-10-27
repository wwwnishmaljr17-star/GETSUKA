import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { registerUser } from "../api/authApi";
import { registerSchema } from "../validations/registerValidation";

const RegisterForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: sessionStorage.getItem("referralCode") || "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ==============================
  // PASSWORD REQUIREMENTS
  // ==============================
  const passwordRequirements = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(
      formData.password
    ),
  };

  const Requirement = ({
    fulfilled,
    children,
  }) => (
    <p
      className={`text-xs ${
        fulfilled
          ? "text-[#6F4E37] font-semibold"
          : "text-gray-400"
      }`}
    >
      {fulfilled ? "✓" : "○"} {children}
    </p>
  );

  // ==============================
  // HANDLE CHANGE
  // ==============================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors({});
    setMessage("");
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrors({});
    setMessage("");

    try {
      await registerSchema.validate(formData, {
        abortEarly: false,
      });

      setLoading(true);

      const response = await registerUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        referralCode: formData.referralCode?.trim() || undefined,
      });

      sessionStorage.removeItem("referralCode");

      sessionStorage.setItem(
        "verificationEmail",
        formData.email.trim()
      );

      navigate("/verify-otp");

      setFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        referralCode: "",
      });

      setMessage(response.message);
    } catch (error) {
      if (error.name === "ValidationError") {
        const fieldErrors = {};

        error.inner.forEach((validationError) => {
          if (!fieldErrors[validationError.path]) {
            fieldErrors[validationError.path] =
              validationError.message;
          }
        });

        setErrors(fieldErrors);
        return;
      }

      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* FULL NAME */}
      <div>
        <label htmlFor="register-fullName" className="block text-xs font-medium tracking-wider text-[#252321] uppercase mb-1.5">
          FULL NAME
        </label>

        <input
          id="register-fullName"
          type="text"
          name="fullName"
          autoComplete="name"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
        />

        {errors.fullName && (
          <p role="alert" className="text-[#6F4E37] font-medium text-xs mt-1">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* EMAIL */}
      <div>
        <label htmlFor="register-email" className="block text-xs font-medium tracking-wider text-[#252321] uppercase mb-1.5">
          EMAIL ADDRESS
        </label>

        <input
          id="register-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email address"
          className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
        />

        {errors.email && (
          <p role="alert" className="text-[#6F4E37] font-medium text-xs mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* PASSWORD */}
      <div>
        <label htmlFor="register-password" className="block text-xs font-medium tracking-wider text-[#252321] uppercase mb-1.5">
          PASSWORD
        </label>

        <div className="relative">
          <input
            id="register-password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            name="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 pr-14 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
          />

          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() =>
              setShowPassword(
                (previous) => !previous
              )
            }
            className="absolute right-0 top-0 flex h-full w-14 items-center justify-center text-xs text-gray-500 hover:text-[#252321] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>

        {/* PASSWORD REQUIREMENTS */}
        <div className="mt-2.5 border border-[#E5E4E2] bg-[#FAF9F7] p-3">
          <p className="text-xs font-medium tracking-wider text-[#252321] uppercase mb-2">
            PASSWORD REQUIREMENTS
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-2">
            <Requirement
              fulfilled={
                passwordRequirements.length
              }
            >
              At least 8 characters
            </Requirement>

            <Requirement
              fulfilled={
                passwordRequirements.uppercase
              }
            >
              One uppercase letter
            </Requirement>

            <Requirement
              fulfilled={
                passwordRequirements.lowercase
              }
            >
              One lowercase letter
            </Requirement>

            <Requirement
              fulfilled={
                passwordRequirements.number
              }
            >
              One number
            </Requirement>

            <Requirement
              fulfilled={
                passwordRequirements.special
              }
            >
              One special character
            </Requirement>
          </div>
        </div>

        {errors.password && (
          <p role="alert" className="text-[#6F4E37] font-medium text-xs mt-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* CONFIRM PASSWORD */}
      <div>
        <label htmlFor="register-confirmPassword" className="block text-xs font-medium tracking-wider text-[#252321] uppercase mb-1.5">
          CONFIRM PASSWORD
        </label>

        <div className="relative">
          <input
            id="register-confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 pr-14 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400"
          />

          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            onClick={() =>
              setShowConfirmPassword(
                (previous) => !previous
              )
            }
            className="absolute right-0 top-0 flex h-full w-14 items-center justify-center text-xs text-gray-500 hover:text-[#252321] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6F4E37]"
          >
            {showConfirmPassword
              ? "HIDE"
              : "SHOW"}
          </button>
        </div>

        {errors.confirmPassword && (
          <p role="alert" className="text-[#6F4E37] font-medium text-xs mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* REFERRAL CODE (OPTIONAL) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="register-referralCode" className="block text-xs font-medium tracking-wider text-[#252321] uppercase">
            REFERRAL CODE (OPTIONAL)
          </label>
          {formData.referralCode && (
            <span className="text-[10px] text-[#6F4E37] font-semibold uppercase tracking-wider bg-[#F5EFEB] px-2 py-0.5 border border-[#E5E4E2]">
              Referral Applied
            </span>
          )}
        </div>

        <input
          id="register-referralCode"
          type="text"
          name="referralCode"
          value={formData.referralCode}
          onChange={handleChange}
          placeholder="e.g. GETSUKA-XXXXXX-XXXX"
          className="w-full h-12 border border-[#E5E4E2] bg-white text-[#252321] px-4 text-sm sm:text-base outline-none focus:border-[#6F4E37] focus-visible:ring-1 focus-visible:ring-[#6F4E37] transition placeholder:text-gray-400 uppercase font-mono"
        />

        {errors.referralCode && (
          <p role="alert" className="text-[#6F4E37] font-medium text-xs mt-1">
            {errors.referralCode}
          </p>
        )}
      </div>

      {/* API MESSAGE */}
      {message && (
        <div role="status" className="p-3 bg-[#F5EFEB] border border-[#E5E4E2] text-sm text-[#6F4E37] font-medium text-center leading-relaxed">
          {message}
        </div>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-[#6F4E37] text-white text-xs sm:text-sm font-semibold tracking-widest uppercase hover:bg-[#5a3e2b] shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37]"
      >
        {loading
          ? "CREATING ACCOUNT..."
          : "CREATE ACCOUNT"}
      </button>
    </form>
  );
};

export default RegisterForm;