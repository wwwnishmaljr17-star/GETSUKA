import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// ============================================
// GMAIL TRANSPORTER
// ============================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ============================================
// SEND OTP EMAIL
// ============================================

export const sendOtpEmail = async (
  email,
  otp
) => {
  await transporter.sendMail({
    from: `"GETSUKA" <${process.env.EMAIL_USER}>`,

    to: email,

    subject:
      "GETSUKA Email Verification OTP",

    text: `
Your GETSUKA verification OTP is ${otp}.

This OTP will expire in 5 minutes.
`,

    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: #080808;
          color: #ffffff;
        "
      >

        <h2
          style="
            letter-spacing: 6px;
            margin-bottom: 30px;
          "
        >
          GETSUKA
        </h2>

        <h3>
          Email Verification
        </h3>

        <p
          style="
            color: #bbbbbb;
            line-height: 1.6;
          "
        >
          Your verification OTP is:
        </p>

        <div
          style="
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 10px;
            margin: 25px 0;
          "
        >
          ${otp}
        </div>

        <p
          style="
            color: #999999;
            font-size: 14px;
          "
        >
          This OTP will expire in 5 minutes.
        </p>

        <p
          style="
            color: #777777;
            font-size: 12px;
            margin-top: 30px;
          "
        >
          If you did not request this email
          change, you can safely ignore this
          message.
        </p>

      </div>
    `,
  });
};