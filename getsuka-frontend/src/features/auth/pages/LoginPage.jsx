import { useEffect, useState } from "react";
import LoginForm from "../components/LoginForm";
import { useNavigate } from "react-router-dom";

import loginArt from "../../../assets/auth/login.jpg";
import getsukaLogo from "../../../assets/auth/getsuka_logo.png";

const LoginPage = () => {
  const navigate = useNavigate();

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
    <div className="w-full min-h-screen bg-[#FAF9F7] text-[#252321]">

      <div className="w-full min-h-screen flex flex-col md:flex-row">

        {/* ============================================
            LEFT — ARTWORK
            Desktop: 50% width
            Mobile: Top banner
        ============================================ */}

        <div
          className="
            w-full
            h-[200px]
            sm:h-[260px]
            md:w-1/2
            md:h-screen
            md:min-h-screen
            overflow-hidden
            bg-black
            relative
            flex-shrink-0
          "
        >

          <img
            src={loginArt}
            alt="GETSUKA artwork"
            className="
              w-full
              h-full
              object-cover
            "
          />

          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />

          {/* CENTER LOGO */}
          {transparentLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
              <img
                src={transparentLogo}
                alt="GETSUKA"
                className="
                  w-[140px]
                  sm:w-[180px]
                  md:w-[200px]
                  lg:w-[240px]
                  h-auto
                  object-contain
                  drop-shadow-md
                "
              />
            </div>
          )}

        </div>

        {/* ============================================
            RIGHT — LOGIN FORM
        ============================================ */}

        <div
          className="
            w-full
            md:w-1/2
            min-h-[calc(100vh-200px)]
            sm:min-h-[calc(100vh-260px)]
            md:min-h-screen
            flex
            items-center
            justify-center
            bg-[#FAF9F7]
            px-6
            py-10
            sm:px-10
            sm:py-14
            lg:px-14
          "
        >

          <div className="w-full max-w-[460px] sm:max-w-[480px]">

            {/* ========================================
                HEADING
            ======================================== */}

            <div className="mb-8 sm:mb-10 text-center md:text-left">

              <h1
                className="
                  text-2xl
                  sm:text-3xl
                  lg:text-4xl
                  font-serif
                  font-medium
                  tracking-wide
                  text-[#252321]
                "
              >
                WELCOME BACK
              </h1>

              <p
                className="
                  text-sm
                  sm:text-base
                  text-[#716C67]
                  mt-2
                "
              >
                Sign in to continue to GETSUKA.
              </p>

            </div>

            {/* ========================================
                LOGIN FORM
            ======================================== */}

            <LoginForm />

            {/* ========================================
                REGISTER
            ======================================== */}

            <p
              className="
                text-sm
                text-[#716C67]
                text-center
                mt-8
                leading-relaxed
              "
            >
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="
                  font-semibold
                  text-[#6F4E37]
                  hover:underline
                  focus-visible:outline-none
                  focus-visible:ring-1
                  focus-visible:ring-[#6F4E37]
                "
              >
                CREATE ACCOUNT
              </button>
            </p>

            {/* ========================================
                FOOTER
            ======================================== */}

            <p
              className="
                text-xs
                tracking-wider
                text-[#716C67]
                text-center
                md:text-left
                mt-10
                sm:mt-14
                uppercase
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

export default LoginPage;