import { useEffect, useState } from "react";
import VerifyOtpForm from "../components/VerifyOtpForm";
import { useNavigate } from "react-router-dom";

import loginArt from "../../../assets/auth/login.jpg";
import getsukaLogo from "../../../assets/auth/getsuka_logo.png";

const VerifyOtpPage = () => {
  const navigate = useNavigate();

  const email = sessionStorage.getItem(
    "verificationEmail"
  );

  const [transparentLogo, setTransparentLogo] =
    useState(null);

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
    <div className="w-full min-h-screen bg-white">

      <div className="w-full min-h-screen flex flex-col md:flex-row">

        {/* ============================================
            LEFT — ARTWORK
            Desktop: 50% width
            Mobile: Top section
        ============================================ */}

        <div
          className="
            w-full
            h-[280px]
            sm:h-[340px]
            md:w-1/2
            md:h-screen
            md:min-h-screen
            overflow-hidden
            bg-black
            relative
            flex-shrink-0
          "
        >

          {/* Background Artwork */}

          <img
            src={loginArt}
            alt="GETSUKA artwork"
            className="
              w-full
              h-full
              object-cover
            "
          />

          {/* Subtle Overlay */}

          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* CENTER LOGO */}

          {transparentLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

              <img
                src={transparentLogo}
                alt="GETSUKA"
                className="
                  w-[140px]
                  sm:w-[170px]
                  md:w-[180px]
                  lg:w-[200px]
                  h-auto
                  object-contain
                "
              />

            </div>
          )}

        </div>


        {/* ============================================
            RIGHT — OTP
        ============================================ */}

        <div
          className="
            w-full
            md:w-1/2
            min-h-[calc(100vh-280px)]
            sm:min-h-[calc(100vh-340px)]
            md:min-h-screen
            flex
            items-center
            justify-center
            bg-white
            px-5
            py-10
            sm:px-8
            sm:py-12
            md:px-6
            lg:px-10
          "
        >

          <div className="w-full max-w-[520px]">

            {/* ========================================
                HEADING
            ======================================== */}

            <div className="mb-8 sm:mb-10">

              <h1
                className="
                  text-[25px]
                  sm:text-[28px]
                  font-medium
                  tracking-wide
                  text-black
                "
              >
                VERIFY EMAIL
              </h1>

              <p
                className="
                  text-[10px]
                  sm:text-[11px]
                  text-gray-500
                  mt-2
                "
              >
                Enter the verification code sent to
              </p>

              <p
                className="
                  text-[10px]
                  sm:text-[11px]
                  text-black
                  font-medium
                  mt-1
                  break-all
                "
              >
                {email || "your email address"}
              </p>

            </div>


            {/* ========================================
                OTP FORM
            ======================================== */}

            <VerifyOtpForm email={email} />


            {/* ========================================
                BACK TO LOGIN
            ======================================== */}

            <p
              className="
                text-[10px]
                sm:text-[11px]
                text-gray-500
                text-center
                mt-7
                sm:mt-8
                leading-5
              "
            >

              Already verified?{" "}

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="
                  text-black
                  font-semibold
                  hover:underline
                "
              >
                SIGN IN
              </button>

            </p>


            {/* ========================================
                FOOTER
            ======================================== */}

            <p
              className="
                text-[8px]
                sm:text-[9px]
                text-gray-400
                text-center
                md:text-left
                mt-12
                sm:mt-16
                md:mt-24
              "
            >
              © 2026 GETSUKA. UNLEASH YOUR STYLE.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default VerifyOtpPage;