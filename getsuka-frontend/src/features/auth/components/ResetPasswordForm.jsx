import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { resetPassword } from "../api/authApi";

const OTP_DURATION = 5 * 60;

const ResetPasswordForm = ({ email }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [remainingSeconds, setRemainingSeconds] =
    useState(OTP_DURATION);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==============================
  // OTP COUNTDOWN
  // ==============================
  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [remainingSeconds]);

  // ==============================
  // FORMAT OTP TIMER
  // ==============================
  const minutes = Math.floor(
    remainingSeconds / 60
  );

  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

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

  const allRequirementsMet =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  // ==============================
  // HANDLE CHANGE
  // ==============================
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ==============================
  // SUBMIT
  // ==============================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email) {
      setError(
        "Email not found. Please request a new reset OTP."
      );
      return;
    }

    if (remainingSeconds <= 0) {
      setError(
        "OTP has expired. Please request a new reset OTP."
      );
      return;
    }

    if (!/^\d{6}$/.test(formData.otp)) {
      setError("OTP must be 6 digits.");
      return;
    }

    if (!allRequirementsMet) {
      setError(
        "Please fulfill all password requirements."
      );
      return;
    }

    if (!formData.confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await resetPassword({
        email: email.trim(),
        otp: formData.otp,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      sessionStorage.removeItem(
        "passwordResetEmail"
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // PASSWORD REQUIREMENT
  // ==============================
  const Requirement = ({
    fulfilled,
    children,
  }) => (
    <p
      className={`text-[10px] ${
        fulfilled
          ? "text-green-600"
          : "text-gray-400"
      }`}
    >
      {fulfilled ? "✓" : "○"} {children}
    </p>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* RESET OTP */}
      <div>
        <label className="block text-xs mb-2">
          RESET OTP
        </label>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          value={formData.otp}
          onChange={(event) => {
            setFormData((previous) => ({
              ...previous,
              otp: event.target.value.replace(
                /\D/g,
                ""
              ),
            }));

            setError("");
          }}
          placeholder="Enter 6-digit OTP"
          className="w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
        />

        {/* OTP COUNTDOWN */}
        <div className="mt-2">
          {remainingSeconds > 0 ? (
            <p className="text-[10px] text-gray-500">
              OTP expires in{" "}
              <span className="text-black font-medium">
                {formattedTime}
              </span>
            </p>
          ) : (
            <p className="text-[10px] text-red-500">
              OTP has expired
            </p>
          )}
        </div>
      </div>

      {/* NEW PASSWORD */}
      <div>
        <label className="block text-xs mb-2">
          NEW PASSWORD
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
            placeholder="Enter new password"
            className="w-full border border-gray-300 px-4 py-3 pr-14 text-sm outline-none focus:border-black"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (previous) => !previous
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>

        {/* PASSWORD REQUIREMENTS */}
        <div className="mt-3 border border-gray-200 px-4 py-3">
          <p className="text-[10px] font-medium text-black mb-2">
            PASSWORD REQUIREMENTS
          </p>

          <div className="space-y-1">
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
      </div>

      {/* CONFIRM PASSWORD */}
      <div>
        <label className="block text-xs mb-2">
          CONFIRM PASSWORD
        </label>

        <div className="relative">
          <input
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter new password"
            className="w-full border border-gray-300 px-4 py-3 pr-14 text-sm outline-none focus:border-black"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (previous) => !previous
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]"
          >
            {showConfirmPassword
              ? "HIDE"
              : "SHOW"}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <p className="text-xs text-red-500 text-center">
          {error}
        </p>
      )}

      {/* RESET BUTTON */}
      <button
        type="submit"
        disabled={
          loading ||
          remainingSeconds <= 0
        }
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading
          ? "RESETTING PASSWORD..."
          : "RESET PASSWORD"}
      </button>
    </form>
  );
};

export default ResetPasswordForm;