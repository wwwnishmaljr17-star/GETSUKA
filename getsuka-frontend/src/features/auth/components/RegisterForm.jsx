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
      className={`text-[10px] ${
        fulfilled
          ? "text-green-600"
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
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      sessionStorage.setItem(
        "verificationEmail",
        formData.email
      );

      navigate("/verify-otp");

      setFormData({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
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
        <label className="block text-xs mb-1">
          FULL NAME
        </label>

        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Enter your full name"
          className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
        />

        {errors.fullName && (
          <p className="text-red-500 text-xs mt-1">
            {errors.fullName}
          </p>
        )}
      </div>

      {/* EMAIL */}
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
          className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
        />

        {errors.email && (
          <p className="text-red-500 text-xs mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* PASSWORD */}
      <div>
        <label className="block text-xs mb-1">
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
            placeholder="Create a password"
            className="w-full border border-gray-300 px-3 py-2 pr-14 text-sm outline-none focus:border-black"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (previous) => !previous
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500"
          >
            {showPassword ? "HIDE" : "SHOW"}
          </button>
        </div>

        {/* PASSWORD REQUIREMENTS */}
        <div className="mt-2 border border-gray-200 px-3 py-2">
          <p className="text-[10px] font-medium text-black mb-2">
            PASSWORD REQUIREMENTS
          </p>

          <div className="grid grid-cols-2 gap-y-1">
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
          <p className="text-red-500 text-xs mt-1">
            {errors.password}
          </p>
        )}
      </div>

      {/* CONFIRM PASSWORD */}
      <div>
        <label className="block text-xs mb-1">
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
            placeholder="Re-enter your password"
            className="w-full border border-gray-300 px-3 py-2 pr-14 text-sm outline-none focus:border-black"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (previous) => !previous
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500"
          >
            {showConfirmPassword
              ? "HIDE"
              : "SHOW"}
          </button>
        </div>

        {errors.confirmPassword && (
          <p className="text-red-500 text-xs mt-1">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* API MESSAGE */}
      {message && (
        <p className="text-sm text-center">
          {message}
        </p>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading
          ? "CREATING ACCOUNT..."
          : "CREATE ACCOUNT"}
      </button>
    </form>
  );
};

export default RegisterForm;