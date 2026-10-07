import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createCoupon } from "../api/couponApi";

const CreateCouponPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // FORM STATE
  // =========================================================

  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    oneUsePerUser: true,
    isActive: true,
  });

  // =========================================================
  // UI STATE
  // =========================================================

  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  // =========================================================
  // HANDLE INPUT
  // =========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    const code = formData.code.trim();

    const discountValue = Number(
      formData.discountValue
    );

    const minOrderAmount =
      formData.minOrderAmount === ""
        ? 0
        : Number(formData.minOrderAmount);

    const maxDiscountAmount =
      formData.maxDiscountAmount === ""
        ? null
        : Number(formData.maxDiscountAmount);

    const usageLimit =
      formData.usageLimit === ""
        ? null
        : Number(formData.usageLimit);

    if (!code) {
      return "Coupon code is required.";
    }

    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      return (
        "Coupon code can contain only " +
        "letters, numbers, hyphens and underscores."
      );
    }

    if (
      formData.discountValue === "" ||
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      return "Discount value must be greater than 0.";
    }

    if (
      formData.discountType === "percentage" &&
      discountValue > 100
    ) {
      return "Percentage discount cannot exceed 100%.";
    }

    if (
      !Number.isFinite(minOrderAmount) ||
      minOrderAmount < 0
    ) {
      return "Minimum order amount cannot be negative.";
    }

    if (
      maxDiscountAmount !== null &&
      (
        !Number.isFinite(maxDiscountAmount) ||
        maxDiscountAmount <= 0
      )
    ) {
      return (
        "Maximum discount amount " +
        "must be greater than 0."
      );
    }

    if (!formData.validFrom) {
      return "Valid from date is required.";
    }

    if (!formData.validUntil) {
      return "Valid until date is required.";
    }

    const startDate = new Date(
      formData.validFrom
    );

    const endDate = new Date(
      formData.validUntil
    );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return "Please enter valid dates.";
    }

    if (endDate <= startDate) {
      return (
        "Valid until date must be after " +
        "valid from date."
      );
    }

    if (
      usageLimit !== null &&
      (
        !Number.isInteger(usageLimit) ||
        usageLimit <= 0
      )
    ) {
      return (
        "Usage limit must be a positive " +
        "whole number."
      );
    }

    return "";
  };

  // =========================================================
  // SHOW SUCCESS MODAL
  // =========================================================

  const showSuccessModal = (message) => {
    setModal({
      open: true,
      type: "success",
      title: "Coupon Created Successfully",
      message:
        message ||
        "The coupon has been created successfully.",
    });
  };

  // =========================================================
  // SHOW FAILED MODAL
  // =========================================================

  const showFailedModal = (message) => {
    setModal({
      open: true,
      type: "error",
      title: "Failed to Create Coupon",
      message:
        message ||
        "Something went wrong while creating the coupon.",
    });
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    setModal({
      open: false,
      type: "",
      title: "",
      message: "",
    });
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      validFrom: "",
      validUntil: "",
      usageLimit: "",
      oneUsePerUser: true,
      isActive: true,
    });
  };

  // =========================================================
  // CREATE COUPON
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      showFailedModal(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        code: formData.code
          .trim()
          .toUpperCase(),

        discountType:
          formData.discountType,

        discountValue:
          Number(formData.discountValue),

        minOrderAmount:
          formData.minOrderAmount === ""
            ? 0
            : Number(formData.minOrderAmount),

        maxDiscountAmount:
          formData.discountType ===
            "percentage" &&
          formData.maxDiscountAmount !== ""
            ? Number(
                formData.maxDiscountAmount
              )
            : null,

        validFrom:
          formData.validFrom,

        validUntil:
          formData.validUntil,

        usageLimit:
          formData.usageLimit === ""
            ? null
            : Number(formData.usageLimit),

        oneUsePerUser:
          formData.oneUsePerUser,

        isActive:
          formData.isActive,
      };

      const response =
        await createCoupon(payload);

      showSuccessModal(
        response?.message ||
          "The coupon has been created successfully."
      );
    } catch (error) {
      console.error(
        "Create Coupon Error:",
        error
      );

      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong while creating the coupon.";

      showFailedModal(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PREVIEW
  // =========================================================

  const previewDiscount = useMemo(() => {
    const value = Number(
      formData.discountValue
    );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return "10% OFF";
    }

    if (
      formData.discountType === "fixed"
    ) {
      return `₹${value.toLocaleString(
        "en-IN"
      )} OFF`;
    }

    return `${value}% OFF`;
  }, [
    formData.discountType,
    formData.discountValue,
  ]);

  const previewMinimumOrder =
    useMemo(() => {
      const value = Number(
        formData.minOrderAmount
      );

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return "No minimum order";
      }

      return `Min. order ₹${value.toLocaleString(
        "en-IN"
      )}`;
    }, [formData.minOrderAmount]);

  const previewExpiry = useMemo(() => {
    if (!formData.validUntil) {
      return "No expiry selected";
    }

    const date = new Date(
      formData.validUntil
    );

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Invalid date";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }, [formData.validUntil]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-full bg-[#edf3ff] px-[12px] pb-[24px] pt-[12px] text-[#273247]">

      <div className="min-h-[calc(100vh-36px)] rounded-[24px] bg-white shadow-[0_15px_45px_rgba(30,64,175,0.08)]">

        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="border-b border-[#edf0f5] px-[28px] pb-[22px] pt-[28px]">

          <div className="flex items-start justify-between gap-[20px]">

            <div>

              <div className="flex items-center gap-[7px] text-[9px]">

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/admin/coupons"
                    )
                  }
                  className="font-medium text-[#1557f5] transition hover:text-[#0d49d8]"
                >
                  Coupons
                </button>

                <span className="text-[#b5bfce]">
                  /
                </span>

                <span className="text-[#8491a5]">
                  Create Coupon
                </span>

              </div>

              <h1 className="mt-[18px] text-[28px] font-semibold tracking-[-0.04em] text-[#1d293d]">
                Create New Coupon
              </h1>

              <p className="mt-[7px] text-[11px] text-[#8995a8]">
                Create and configure a
                discount coupon for the
                GETSUKA store.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/coupons"
                )
              }
              className="mt-[18px] h-[40px] rounded-[10px] border border-[#dfe5ee] bg-white px-[16px] text-[10px] font-semibold text-[#536176] transition hover:border-[#b9caff] hover:bg-[#f7f9fc]"
            >
              CANCEL
            </button>

          </div>

        </section>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-[18px] px-[28px] pb-[28px] pt-[18px] xl:grid-cols-[minmax(0,1fr)_310px]"
        >

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="space-y-[16px]">

            {/* COUPON INFORMATION */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Coupon Information
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Enter the unique code
                  customers will use at
                  checkout.
                </p>

              </div>

              <div className="p-[18px]">

                <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                  Coupon Code
                </label>

                <div className="mt-[7px] flex gap-[8px]">

                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="GETSUKA10"
                    maxLength={50}
                    className="h-[42px] flex-1 rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] text-[11px] font-medium uppercase tracking-[0.04em] text-[#273247] outline-none transition placeholder:text-[#b2bcc9] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setFormData(
                        (previous) => ({
                          ...previous,
                          code: `GETSUKA${Math.floor(
                            1000 +
                              Math.random() *
                                9000
                          )}`,
                        })
                      )
                    }
                    className="h-[42px] rounded-[9px] border border-[#dfe5ee] bg-[#f8faff] px-[12px] text-[8px] font-semibold text-[#536176] transition hover:border-[#b9caff] hover:bg-[#f1f5ff] hover:text-[#1557f5]"
                  >
                    GENERATE CODE
                  </button>

                </div>

                <p className="mt-[6px] text-[8px] text-[#9aa5b5]">
                  Letters, numbers, hyphens
                  and underscores are
                  allowed.
                </p>

              </div>

            </section>

            {/* DISCOUNT DETAILS */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Discount Details
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Define how much customers
                  will save.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-[14px] p-[18px] md:grid-cols-2">

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Discount Type
                  </label>

                  <select
                    name="discountType"
                    value={
                      formData.discountType
                    }
                    onChange={handleChange}
                    className="mt-[7px] h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] text-[10px] text-[#536176] outline-none transition focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                  >
                    <option value="percentage">
                      Percentage
                    </option>

                    <option value="fixed">
                      Fixed Amount
                    </option>
                  </select>

                </div>

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Discount Value
                  </label>

                  <div className="relative mt-[7px]">

                    <input
                      type="number"
                      name="discountValue"
                      value={
                        formData.discountValue
                      }
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder={
                        formData.discountType ===
                        "percentage"
                          ? "10"
                          : "500"
                      }
                      className="h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] pr-[48px] text-[11px] text-[#273247] outline-none transition placeholder:text-[#b2bcc9] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                    />

                    <span className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8c98aa]">
                      {formData.discountType ===
                      "percentage"
                        ? "%"
                        : "₹"}
                    </span>

                  </div>

                </div>

              </div>

            </section>

            {/* ORDER LIMITS */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Order Limits
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Control the order value
                  required for this coupon.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-[14px] p-[18px] md:grid-cols-2">

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Minimum Order Amount
                  </label>

                  <div className="relative mt-[7px]">

                    <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8c98aa]">
                      ₹
                    </span>

                    <input
                      type="number"
                      name="minOrderAmount"
                      value={
                        formData.minOrderAmount
                      }
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="1000"
                      className="h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white pl-[27px] pr-[12px] text-[11px] text-[#273247] outline-none transition placeholder:text-[#b2bcc9] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                    />

                  </div>

                </div>

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Maximum Discount Amount
                  </label>

                  <div className="relative mt-[7px]">

                    <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[9px] font-semibold text-[#8c98aa]">
                      ₹
                    </span>

                    <input
                      type="number"
                      name="maxDiscountAmount"
                      value={
                        formData.maxDiscountAmount
                      }
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      disabled={
                        formData.discountType ===
                        "fixed"
                      }
                      placeholder={
                        formData.discountType ===
                        "percentage"
                          ? "500"
                          : "Not applicable"
                      }
                      className="h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white pl-[27px] pr-[12px] text-[11px] text-[#273247] outline-none transition placeholder:text-[#b2bcc9] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:text-[#a8b1be]"
                    />

                  </div>

                  {formData.discountType ===
                    "fixed" && (
                    <p className="mt-[5px] text-[8px] text-[#9aa5b5]">
                      Maximum discount is
                      only applicable to
                      percentage coupons.
                    </p>
                  )}

                </div>

              </div>

            </section>

            {/* USAGE LIMIT */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Usage Limit
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Control how many times the
                  coupon can be redeemed.
                </p>

              </div>

              <div className="p-[18px]">

                <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                  Total Usage Limit
                </label>

                <input
                  type="number"
                  name="usageLimit"
                  value={
                    formData.usageLimit
                  }
                  onChange={handleChange}
                  min="1"
                  step="1"
                  placeholder="Leave empty for unlimited"
                  className="mt-[7px] h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] text-[11px] text-[#273247] outline-none transition placeholder:text-[#b2bcc9] focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                />

                <label className="mt-[14px] flex cursor-pointer items-center gap-[9px]">

                  <input
                    type="checkbox"
                    name="oneUsePerUser"
                    checked={
                      formData.oneUsePerUser
                    }
                    onChange={handleChange}
                    className="h-[15px] w-[15px] accent-[#1557f5]"
                  />

                  <span className="text-[9px] font-medium text-[#536176]">
                    Allow only one use per
                    user
                  </span>

                </label>

              </div>

            </section>

            {/* VALIDITY */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Validity
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Choose when the coupon
                  becomes available and when
                  it expires.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-[14px] p-[18px] md:grid-cols-2">

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Valid From
                  </label>

                  <input
                    type="datetime-local"
                    name="validFrom"
                    value={
                      formData.validFrom
                    }
                    onChange={handleChange}
                    className="mt-[7px] h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] text-[10px] text-[#536176] outline-none transition focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                  />

                </div>

                <div>

                  <label className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#68758a]">
                    Valid Until
                  </label>

                  <input
                    type="datetime-local"
                    name="validUntil"
                    value={
                      formData.validUntil
                    }
                    onChange={handleChange}
                    className="mt-[7px] h-[42px] w-full rounded-[9px] border border-[#dfe5ee] bg-white px-[12px] text-[10px] text-[#536176] outline-none transition focus:border-[#9bb9ff] focus:ring-2 focus:ring-[#1557f5]/10"
                  />

                </div>

              </div>

            </section>

            {/* STATUS */}

            <section className="rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Status & Options
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Decide whether the coupon
                  should be available
                  immediately.
                </p>

              </div>

              <div className="p-[18px]">

                <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[#e4e9f1] bg-[#f8faff] px-[13px] py-[12px]">

                  <div>

                    <p className="text-[10px] font-semibold text-[#273247]">
                      Coupon Status
                    </p>

                    <p className="mt-[3px] text-[8px] text-[#9aa5b5]">
                      Activate this coupon
                      after creation.
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    name="isActive"
                    checked={
                      formData.isActive
                    }
                    onChange={handleChange}
                    className="h-[17px] w-[17px] accent-[#1557f5]"
                  />

                </label>

              </div>

            </section>

          </div>

          {/* =================================================
              RIGHT SIDE — PREVIEW
          ================================================= */}

          <div className="xl:sticky xl:top-[18px] xl:self-start">

            <section className="overflow-hidden rounded-[14px] border border-[#e4e9f1] bg-white">

              <div className="border-b border-[#edf0f5] px-[18px] py-[14px]">

                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#273247]">
                  Live Preview
                </h2>

                <p className="mt-[4px] text-[9px] text-[#9aa5b5]">
                  Preview how the coupon
                  details will appear.
                </p>

              </div>

              <div className="p-[18px]">

                <div className="overflow-hidden rounded-[14px] border border-[#dce6fb] bg-[#f8faff]">

                  <div className="bg-[#1557f5] px-[18px] py-[20px]">

                    <div className="flex items-start justify-between gap-[10px]">

                      <div>

                        <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/70">
                          GETSUKA COUPON
                        </p>

                        <p className="mt-[8px] text-[21px] font-bold tracking-[-0.04em] text-white">
                          {previewDiscount}
                        </p>

                      </div>

                      <span className="rounded-full bg-white/15 px-[8px] py-[4px] text-[7px] font-semibold text-white">
                        {formData.isActive
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>

                    </div>

                  </div>

                  <div className="p-[16px]">

                    <div className="rounded-[9px] border border-dashed border-[#b9caff] bg-white px-[12px] py-[10px] text-center">

                      <p className="text-[8px] uppercase tracking-[0.1em] text-[#8b97a9]">
                        Coupon Code
                      </p>

                      <p className="mt-[4px] text-[13px] font-bold tracking-[0.08em] text-[#1557f5]">
                        {formData.code.trim()
                          ? formData.code
                              .trim()
                              .toUpperCase()
                          : "GETSUKA10"}
                      </p>

                    </div>

                    <div className="mt-[14px] space-y-[9px]">

                      <div className="flex items-center justify-between gap-[10px]">

                        <span className="text-[8px] text-[#8995a8]">
                          Discount
                        </span>

                        <span className="text-[9px] font-semibold text-[#273247]">
                          {previewDiscount}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-[10px]">

                        <span className="text-[8px] text-[#8995a8]">
                          Minimum Order
                        </span>

                        <span className="text-[9px] font-semibold text-[#273247]">
                          {previewMinimumOrder}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-[10px]">

                        <span className="text-[8px] text-[#8995a8]">
                          Valid Until
                        </span>

                        <span className="text-[9px] font-semibold text-[#273247]">
                          {previewExpiry}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-[10px]">

                        <span className="text-[8px] text-[#8995a8]">
                          Usage
                        </span>

                        <span className="text-[9px] font-semibold text-[#273247]">
                          {formData.usageLimit
                            ? `${formData.usageLimit} uses`
                            : "Unlimited"}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

                <div className="mt-[14px] rounded-[10px] border border-[#e4e9f1] bg-[#fbfcff] px-[13px] py-[12px]">

                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#68758a]">
                    Coupon Rules
                  </p>

                  <div className="mt-[9px] space-y-[6px]">

                    <div className="flex items-center gap-[7px]">

                      <span className="h-[5px] w-[5px] rounded-full bg-[#1557f5]" />

                      <span className="text-[8px] text-[#8995a8]">
                        {formData.oneUsePerUser
                          ? "One use per user"
                          : "Multiple uses per user"}
                      </span>

                    </div>

                    <div className="flex items-center gap-[7px]">

                      <span className="h-[5px] w-[5px] rounded-full bg-[#1557f5]" />

                      <span className="text-[8px] text-[#8995a8]">
                        {formData.discountType ===
                        "percentage"
                          ? "Percentage discount"
                          : "Fixed amount discount"}
                      </span>

                    </div>

                    <div className="flex items-center gap-[7px]">

                      <span className="h-[5px] w-[5px] rounded-full bg-[#1557f5]" />

                      <span className="text-[8px] text-[#8995a8]">
                        {formData.isActive
                          ? "Available when validity begins"
                          : "Disabled after creation"}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </section>

          </div>

          {/* =================================================
              ACTION BAR
          ================================================= */}

          <div className="flex flex-col-reverse gap-[9px] border-t border-[#edf0f5] pt-[18px] sm:flex-row sm:justify-end xl:col-span-2">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/coupons"
                )
              }
              disabled={loading}
              className="h-[40px] rounded-[9px] border border-[#dfe5ee] bg-white px-[18px] text-[10px] font-semibold text-[#536176] transition hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={loading}
              className="h-[40px] rounded-[9px] bg-[#1557f5] px-[20px] text-[10px] font-semibold text-white shadow-[0_7px_18px_rgba(21,87,245,0.22)] transition hover:bg-[#0d49d8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "CREATING..."
                : "CREATE COUPON"}
            </button>

          </div>

        </form>

      </div>

      {/* =====================================================
          SUCCESS / FAILED MODAL
      ===================================================== */}

      {modal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#172033]/45 px-[20px] backdrop-blur-[4px]">

          <div className="w-full max-w-[420px] overflow-hidden rounded-[20px] bg-white shadow-[0_25px_80px_rgba(30,64,175,0.25)]">

            {/* MODAL TOP */}

            <div
              className={`flex items-center justify-center py-[26px] ${
                modal.type === "success"
                  ? "bg-[#effcf5]"
                  : "bg-[#fff5f5]"
              }`}
            >

              <div
                className={`flex h-[58px] w-[58px] items-center justify-center rounded-full text-[25px] font-bold ${
                  modal.type === "success"
                    ? "bg-[#d9f8e8] text-[#079457]"
                    : "bg-[#ffe0e0] text-[#df4646]"
                }`}
              >
                {modal.type === "success"
                  ? "✓"
                  : "!"}
              </div>

            </div>

            {/* MODAL CONTENT */}

            <div className="px-[26px] pb-[26px] pt-[22px] text-center">

              <h2 className="text-[18px] font-semibold text-[#273247]">
                {modal.title}
              </h2>

              <p className="mx-auto mt-[9px] max-w-[330px] text-[10px] leading-[1.7] text-[#8b97a9]">
                {modal.message}
              </p>

              {/* SUCCESS */}

              {modal.type === "success" ? (
                <div className="mt-[22px] flex flex-col gap-[9px]">

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/admin/coupons"
                      )
                    }
                    className="h-[40px] rounded-[9px] bg-[#1557f5] text-[10px] font-semibold text-white shadow-[0_7px_18px_rgba(21,87,245,0.20)] transition hover:bg-[#0d49d8]"
                  >
                    GO TO COUPONS
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      resetForm();
                    }}
                    className="h-[40px] rounded-[9px] border border-[#dfe5ee] bg-white text-[10px] font-semibold text-[#536176] transition hover:bg-[#f7f9fc]"
                  >
                    CREATE ANOTHER
                  </button>

                </div>
              ) : (
                /* FAILED */
                <div className="mt-[22px]">

                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-[40px] w-full rounded-[9px] bg-[#e54848] text-[10px] font-semibold text-white transition hover:bg-[#d73535]"
                  >
                    TRY AGAIN
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CreateCouponPage;