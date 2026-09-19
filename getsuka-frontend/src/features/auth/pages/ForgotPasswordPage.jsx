import { useEffect, useState } from "react";
import ForgotPasswordForm from "../components/ForgotPasswordForm.jsx";
import { useNavigate } from "react-router-dom";

import loginArt from "../../../assets/auth/login.jpg";
import getsukaLogo from "../../../assets/auth/getsuka_logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [transparentLogo, setTransparentLogo] = useState(null);

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

      // Remove white background
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-white">
      <div className="w-full h-full flex">

        {/* LEFT — ARTWORK */}
        <div className="hidden md:block w-1/2 h-full overflow-hidden bg-black relative">
          <img
            src={loginArt}
            alt="GETSUKA artwork"
            className="w-full h-full object-cover"
          />

          {transparentLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src={transparentLogo}
                alt="GETSUKA"
                className="w-[200px] h-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* RIGHT — FORGOT PASSWORD */}
        <div className="w-full md:w-1/2 h-full flex items-center justify-center bg-white">
          <div className="w-full max-w-[520px] px-10">

            <div className="mb-10">
              <h1 className="text-[28px] font-medium tracking-wide text-black">
                FORGOT PASSWORD
            </h1>

              <p className="text-[10px] text-gray-500 mt-2">
                Enter your email to receive a password reset OTP.
              </p>
              </div>

            <ForgotPasswordForm />

            <p className="text-[10px] text-gray-500 text-center mt-8">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-black font-semibold"
              >
                SIGN IN
              </button>
            </p>

            <p className="text-[8px] text-gray-400 text-left mt-24">
              © 2026 GETSUKA. UNLEASH YOUR STYLE.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ForgotPasswordPage;