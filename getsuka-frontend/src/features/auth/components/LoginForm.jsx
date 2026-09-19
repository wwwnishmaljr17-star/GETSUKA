import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";
import { loginUser, googleLogin } from "../api/authApi";

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await loginUser(formData);

      // Save login information
      login(response.token, response.user);

      // Go to welcome page
      // replace prevents going back to login using browser Back
      navigate("/", { replace: true });

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
const handleGoogleSuccess = async (credentialResponse) => {
  try {
    setError("");
    setLoading(true);

    const response = await googleLogin(
      credentialResponse.credential
    );

    login(response.token, response.user);

    navigate("/", {
      replace: true,
    });
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

const handleGoogleError = () => {
  setError(
    "Google login failed. Please try again."
  );
};
  return (
    
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Email */}
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
          className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex justify-between items-center mb-1">

          <label className="block text-xs">
            PASSWORD
          </label>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-[9px] text-gray-500 hover:text-black"
          >
            FORGOT PASSWORD?
          </button>

        </div>

        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          className="w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 text-center">
          {error}
        </p>
      )}

      {/* Login */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 text-xs tracking-widest disabled:opacity-50"
      >
        {loading ? "SIGNING IN..." : "SIGN IN"}
      </button>
<GoogleLogin
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  text="continue_with"
  shape="rectangular"
  width="100%"
/>

    </form>
  );
};

export default LoginForm;