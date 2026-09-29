import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import adminAxios from "../../../../lib/adminAxios";
import ImageCropper from "../components/ImageCropper";

const AddProductPage = () => {
  const navigate = useNavigate();

  // =========================================================
  // STATE
  // =========================================================

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    productCode: "",
    description: "",
    category: "",
    anime: "",
    price: "",
    salePrice: "",

    details: {
      material: "",
      fit: "",
      careInstructions: "",
      shippingInfo: "",
      returnInfo: "",
      productDetails: "",
      highlights: "",
    },
  });

  const [images, setImages] = useState([]);

  const [cropQueue, setCropQueue] = useState([]);
  const [cropFile, setCropFile] = useState(null);

  const [variants, setVariants] = useState([
    {
      color: "",
      size: "",
      sku: "",
      stock: "",
    },
  ]);

  const animeOptions = [
    "One Piece",
    "Naruto",
    "Bleach",
    "Jujutsu Kaisen",
    "Demon Slayer",
    "Attack on Titan",
    "Dragon Ball",
    "My Hero Academia",
    "Chainsaw Man",
    "Hunter x Hunter",
    "Other",
  ];

  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        setError("");

        const response = await adminAxios.get(
          "/api/admin/categories",
          {
            params: {
              page: 1,
              limit: 100,
            },
          }
        );

        const responseData = response.data;

        let categoryList = [];

        if (Array.isArray(responseData?.categories)) {
          categoryList = responseData.categories;
        } else if (
          Array.isArray(responseData?.data?.categories)
        ) {
          categoryList = responseData.data.categories;
        } else if (Array.isArray(responseData?.data)) {
          categoryList = responseData.data;
        } else if (Array.isArray(responseData)) {
          categoryList = responseData;
        }

        const activeCategories = categoryList.filter(
          (category) =>
            category && !category.isDeleted
        );

        setCategories(activeCategories);

        if (activeCategories.length === 0) {
          setError(
            "No active categories found. The T-Shirts category should be created automatically when the backend starts."
          );
        }
      } catch (err) {
        console.error(
          "CATEGORY LOAD ERROR:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load categories. Make sure the backend is running."
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // =========================================================
  // BASIC FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // =========================================================
  // DETAILS CHANGE
  // =========================================================

  const handleDetailsChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      details: {
        ...previous.details,
        [name]: value,
      },
    }));

    setError("");
    setSuccess("");
  };

  // =========================================================
  // FILE TO BASE64
  // =========================================================

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(
          new Error("Unable to read image.")
        );
      };

      reader.readAsDataURL(file);
    });
  };

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const handleImageUpload = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) {
      return;
    }

    setError("");
    setSuccess("");

    const remainingSlots = 6 - images.length;

    if (files.length > remainingSlots) {
      setError(
        `You can upload a maximum of 6 images. You can select ${remainingSlots} more image${
          remainingSlots === 1 ? "" : "s"
        }.`
      );

      event.target.value = "";
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }

      if (file.size > 5 * 1024 * 1024) {
        return false;
      }

      return true;
    });

    if (validFiles.length !== files.length) {
      setError(
        "Only PNG, JPG or WEBP images up to 5MB each are allowed."
      );
    }

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    setCropQueue(validFiles);
    setCropFile(validFiles[0]);

    event.target.value = "";
  };

  // =========================================================
  // APPLY CROPPED IMAGE
  // =========================================================

  const handleCropApply = async (croppedFile) => {
    try {
      setError("");

      const base64 =
        await convertFileToBase64(croppedFile);

      const newImage = {
        id: `${Date.now()}-${Math.random()}`,
        name: croppedFile.name,
        preview: base64,
        value: base64,
      };

      setImages((previous) => [
        ...previous,
        newImage,
      ]);

      const remainingFiles =
        cropQueue.slice(1);

      setCropQueue(remainingFiles);

      setCropFile(
        remainingFiles.length > 0
          ? remainingFiles[0]
          : null
      );
    } catch (err) {
      console.error(
        "CROPPED IMAGE ERROR:",
        err
      );

      setError(
        "Failed to process the cropped image. Please try again."
      );
    }
  };

  // =========================================================
  // CANCEL CROP
  // =========================================================

  const handleCropCancel = () => {
    setCropQueue([]);
    setCropFile(null);
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const removeImage = (imageId) => {
    setImages((previous) =>
      previous.filter(
        (image) => image.id !== imageId
      )
    );
  };

  // =========================================================
  // MOVE IMAGE LEFT
  // =========================================================

  const moveImageLeft = (index) => {
    if (index === 0) {
      return;
    }

    setImages((previous) => {
      const updated = [...previous];

      [
        updated[index - 1],
        updated[index],
      ] = [
        updated[index],
        updated[index - 1],
      ];

      return updated;
    });
  };

  // =========================================================
  // MOVE IMAGE RIGHT
  // =========================================================

  const moveImageRight = (index) => {
    if (index === images.length - 1) {
      return;
    }

    setImages((previous) => {
      const updated = [...previous];

      [
        updated[index],
        updated[index + 1],
      ] = [
        updated[index + 1],
        updated[index],
      ];

      return updated;
    });
  };

  // =========================================================
  // ADD VARIANT
  // =========================================================

  const addVariant = () => {
    setVariants((previous) => [
      ...previous,
      {
        color: "",
        size: "",
        sku: "",
        stock: "",
      },
    ]);
  };

  // =========================================================
  // REMOVE VARIANT
  // =========================================================

  const removeVariant = (index) => {
    if (variants.length === 1) {
      return;
    }

    setVariants((previous) =>
      previous.filter(
        (_, variantIndex) =>
          variantIndex !== index
      )
    );
  };

  // =========================================================
  // UPDATE VARIANT
  // =========================================================

  const updateVariant = (
    index,
    field,
    value
  ) => {
    setVariants((previous) =>
      previous.map(
        (variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                [field]: value,
              }
            : variant
      )
    );

    setError("");
  };

  // =========================================================
  // TOTAL STOCK
  // =========================================================

  const totalStock = useMemo(
    () =>
      variants.reduce(
        (total, variant) =>
          total +
          Number(variant.stock || 0),
        0
      ),
    [variants]
  );

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.description.trim()) {
      return "Product description is required.";
    }

    if (!form.category) {
      return "Please select a category.";
    }

    if (!form.anime) {
      return "Please select an anime.";
    }

    if (
      form.price === "" ||
      Number(form.price) < 0
    ) {
      return "Please enter a valid price.";
    }

    if (
      form.salePrice !== "" &&
      Number(form.salePrice) < 0
    ) {
      return "Sale price cannot be negative.";
    }

    if (
      form.salePrice !== "" &&
      Number(form.salePrice) >
        Number(form.price)
    ) {
      return "Sale price cannot be greater than the original price.";
    }

    if (images.length < 3) {
      return "At least 3 product images are required.";
    }

    for (
      let index = 0;
      index < variants.length;
      index++
    ) {
      const variant = variants[index];

      if (!variant.color.trim()) {
        return `Color is required for variant ${
          index + 1
        }.`;
      }

      if (!variant.size) {
        return `Size is required for variant ${
          index + 1
        }.`;
      }

      if (!variant.sku.trim()) {
        return `SKU is required for variant ${
          index + 1
        }.`;
      }

      if (
        variant.stock === "" ||
        Number(variant.stock) < 0
      ) {
        return `Valid stock is required for variant ${
          index + 1
        }.`;
      }
    }

    const skuList = variants.map(
      (variant) =>
        variant.sku
          .trim()
          .toLowerCase()
    );

    const duplicateSku =
      skuList.some(
        (sku, index) =>
          sku &&
          skuList.indexOf(sku) !== index
      );

    if (duplicateSku) {
      return "Each variant must have a unique SKU.";
    }

    return "";
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        productCode:
          form.productCode.trim(),

        description:
          form.description.trim(),

        category: form.category,

        anime: form.anime,

        price: Number(form.price),

        salePrice:
          form.salePrice === ""
            ? null
            : Number(form.salePrice),

        details: {
          material:
            form.details.material.trim(),

          fit:
            form.details.fit.trim(),

          careInstructions:
            form.details.careInstructions.trim(),

          shippingInfo:
            form.details.shippingInfo.trim(),

          returnInfo:
            form.details.returnInfo.trim(),

          productDetails:
            form.details.productDetails.trim(),

          highlights:
            form.details.highlights
              .split("\n")
              .map((item) =>
                item.trim()
              )
              .filter(Boolean),
        },

        images: images.map(
          (image) => image.value
        ),

        variants: variants.map(
          (variant) => ({
            color:
              variant.color.trim(),

            size: variant.size,

            sku:
              variant.sku.trim(),

            stock: Number(
              variant.stock
            ),
          })
        ),
      };

      await adminAxios.post(
        "/api/admin/products",
        payload
      );

      setSuccess(
        "Product created successfully."
      );

      setTimeout(() => {
        navigate("/admin/products");
      }, 700);
    } catch (err) {
      console.error(
        "CREATE PRODUCT ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to create product."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CANCEL
  // =========================================================

  const handleCancel = () => {
    navigate("/admin/products");
  };

  // =========================================================
  // INPUT STYLE
  // =========================================================

  const inputClass =
    "h-[44px] w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5";

  const selectClass =
    "h-[44px] w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5";

  const textareaClass =
    "w-full resize-none rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5";

  const labelClass =
    "mb-[8px] block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096]";

  return (
    <div className="min-h-full bg-white text-[#172033]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="border-b border-[#edf1f6] px-[28px] pb-[19px] pt-[20px]">

        <div className="flex items-center gap-[8px] text-[9px]">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
            className="text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Dashboard
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/products"
              )
            }
            className="text-[#1557f5] transition-colors duration-200 hover:text-[#0d49d8]"
          >
            Products
          </button>

          <span className="text-[#b5bfcc]">
            /
          </span>

          <span className="text-[#7e8da1]">
            Add Product
          </span>

        </div>

        <div className="mt-[20px]">

          <h1 className="text-[25px] font-semibold tracking-[-0.04em] text-[#162033]">
            Add Product
          </h1>

          <p className="mt-[6px] text-[10px] text-[#8290a3]">
            Add a new anime product to your GETSUKA catalogue.
          </p>

        </div>

      </section>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && (
        <div className="mx-[28px] mt-[18px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] px-[15px] py-[12px] text-[9px] text-[#d93650]">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-[28px] mt-[18px] rounded-[8px] border border-[#bcebd5] bg-[#effcf6] px-[15px] py-[12px] text-[9px] text-[#11845b]">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="px-[28px] pb-[35px] pt-[18px]"
      >

        {/* =====================================================
            BASIC INFORMATION
        ===================================================== */}

        <section className="overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="border-b border-[#edf1f6] px-[20px] py-[17px]">

            <h2 className="text-[12px] font-semibold text-[#263247]">
              Basic Information
            </h2>

            <p className="mt-[5px] text-[9px] text-[#8996a8]">
              Product details and catalogue information.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-[17px] p-[20px] xl:grid-cols-2">

            {/* PRODUCT NAME */}

            <div>

              <label className={labelClass}>
                Product Name *
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Straw Hat Crew Tee"
                className={inputClass}
              />

            </div>

            {/* PRODUCT CODE */}

            <div>

              <label className={labelClass}>
                Product Code
              </label>

              <input
                type="text"
                name="productCode"
                value={
                  form.productCode
                }
                onChange={handleChange}
                placeholder="GET-OP-001"
                className={inputClass}
              />

              <p className="mt-[6px] text-[8px] text-[#9aa6b6]">
                Optional catalogue code.
              </p>

            </div>

            {/* ANIME */}

            <div>

              <label className={labelClass}>
                Anime *
              </label>

              <select
                name="anime"
                value={form.anime}
                onChange={handleChange}
                className={selectClass}
              >

                <option value="">
                  Select Anime
                </option>

                {animeOptions.map(
                  (anime) => (
                    <option
                      key={anime}
                      value={anime}
                    >
                      {anime}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CATEGORY */}

            <div>

              <label className={labelClass}>
                Category *
              </label>

              <select
                name="category"
                value={
                  form.category
                }
                onChange={handleChange}
                disabled={
                  loadingCategories
                }
                className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >

                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select Category"}
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category._id
                      }
                      value={
                        category._id
                      }
                    >
                      {category.name}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* PRICE */}

            <div>

              <label className={labelClass}>
                Price *
              </label>

              <div className="relative">

                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[10px] text-[#8c98a9]">
                  ₹
                </span>

                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  placeholder="799"
                  className={`${inputClass} pl-[29px]`}
                />

              </div>

            </div>

            {/* SALE PRICE */}

            <div>

              <label className={labelClass}>
                Sale Price
              </label>

              <div className="relative">

                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[10px] text-[#8c98a9]">
                  ₹
                </span>

                <input
                  type="number"
                  name="salePrice"
                  value={
                    form.salePrice
                  }
                  onChange={handleChange}
                  min="0"
                  placeholder="Optional"
                  className={`${inputClass} pl-[29px]`}
                />

              </div>

              <p className="mt-[6px] text-[8px] text-[#9aa6b6]">
                Leave empty if there is no discount.
              </p>

            </div>

            {/* DESCRIPTION */}

            <div className="xl:col-span-2">

              <label className={labelClass}>
                Description *
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={handleChange}
                rows="5"
                placeholder="Describe the anime product..."
                className={textareaClass}
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            PRODUCT DETAILS
        ===================================================== */}

        <section className="mt-[17px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="border-b border-[#edf1f6] px-[20px] py-[17px]">

            <h2 className="text-[12px] font-semibold text-[#263247]">
              Product Details
            </h2>

            <p className="mt-[5px] text-[9px] text-[#8996a8]">
              Information displayed on the product details page.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-[17px] p-[20px] xl:grid-cols-2">

            {/* MATERIAL */}

            <div>

              <label className={labelClass}>
                Material
              </label>

              <input
                type="text"
                name="material"
                value={
                  form.details.material
                }
                onChange={
                  handleDetailsChange
                }
                placeholder="100% Premium Cotton"
                className={inputClass}
              />

            </div>

            {/* FIT */}

            <div>

              <label className={labelClass}>
                Fit
              </label>

              <input
                type="text"
                name="fit"
                value={
                  form.details.fit
                }
                onChange={
                  handleDetailsChange
                }
                placeholder="Oversized fit"
                className={inputClass}
              />

            </div>

            {/* CARE */}

            <div>

              <label className={labelClass}>
                Care Instructions
              </label>

              <textarea
                name="careInstructions"
                value={
                  form.details
                    .careInstructions
                }
                onChange={
                  handleDetailsChange
                }
                rows="4"
                placeholder="Machine wash cold. Do not bleach."
                className={textareaClass}
              />

            </div>

            {/* SHIPPING */}

            <div>

              <label className={labelClass}>
                Shipping Information
              </label>

              <textarea
                name="shippingInfo"
                value={
                  form.details
                    .shippingInfo
                }
                onChange={
                  handleDetailsChange
                }
                rows="4"
                placeholder="Ships within 2–4 business days."
                className={textareaClass}
              />

            </div>

            {/* RETURNS */}

            <div>

              <label className={labelClass}>
                Return Information
              </label>

              <textarea
                name="returnInfo"
                value={
                  form.details
                    .returnInfo
                }
                onChange={
                  handleDetailsChange
                }
                rows="4"
                placeholder="Eligible for return within 7 days."
                className={textareaClass}
              />

            </div>

            {/* PRODUCT DETAILS */}

            <div>

              <label className={labelClass}>
                Product Details Text
              </label>

              <textarea
                name="productDetails"
                value={
                  form.details
                    .productDetails
                }
                onChange={
                  handleDetailsChange
                }
                rows="4"
                placeholder="Detailed information about this product."
                className={textareaClass}
              />

            </div>

            {/* HIGHLIGHTS */}

            <div className="xl:col-span-2">

              <label className={labelClass}>
                Product Highlights
              </label>

              <textarea
                name="highlights"
                value={
                  form.details
                    .highlights
                }
                onChange={
                  handleDetailsChange
                }
                rows="5"
                placeholder={
                  "Heavyweight fabric\nOversized silhouette\nPremium print\nAnime-inspired design"
                }
                className={textareaClass}
              />

              <p className="mt-[6px] text-[8px] text-[#9aa6b6]">
                Enter one highlight per line.
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            PRODUCT IMAGES
        ===================================================== */}

        <section className="mt-[17px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex items-center justify-between border-b border-[#edf1f6] px-[20px] py-[17px]">

            <div>

              <h2 className="text-[12px] font-semibold text-[#263247]">
                Product Images
              </h2>

              <p className="mt-[5px] text-[9px] text-[#8996a8]">
                Upload at least 3 images. You can add up to 6.
              </p>

            </div>

            <span className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-[10px] py-[6px] text-[8px] font-medium text-[#718096]">
              {images.length} / 6
            </span>

          </div>

          <div className="p-[20px]">

            {/* UPLOAD */}

            <label className="group flex h-[145px] cursor-pointer flex-col items-center justify-center rounded-[9px] border border-dashed border-[#cbd7e5] bg-[#f9fbfe] transition-all duration-200 hover:border-[#7ca2e9] hover:bg-[#f3f7ff]">

              <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[#d7e2ef] bg-white text-[20px] text-[#1557f5] shadow-[0_3px_10px_rgba(30,64,175,0.05)] transition-all duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                +
              </div>

              <p className="mt-[10px] text-[10px] font-medium text-[#526176]">
                Click to upload product images
              </p>

              <p className="mt-[6px] text-[8px] text-[#8b98aa]">
                PNG, JPG or WEBP · Maximum 5MB each
              </p>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={
                  handleImageUpload
                }
                className="hidden"
              />

            </label>

            {/* CROP QUEUE */}

            {cropQueue.length > 0 && (
              <div className="mt-[12px] rounded-[8px] border border-[#cfe0fb] bg-[#f1f6ff] px-[13px] py-[11px]">

                <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-[#1557f5]">
                  Image Editor Active
                </p>

                <p className="mt-[4px] text-[8px] leading-5 text-[#718096]">
                  Crop each selected image before it is added.
                  {cropQueue.length > 1
                    ? ` ${cropQueue.length} images are waiting.`
                    : " This is the last image."}
                </p>

              </div>
            )}

            {/* IMAGES */}

            {images.length > 0 && (
              <div className="mt-[16px] grid grid-cols-2 gap-[11px] sm:grid-cols-3 xl:grid-cols-6">

                {images.map(
                  (image, index) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-[8px] border border-[#dce5f0] bg-[#f8fafd] transition-all duration-200 hover:border-[#9eb9eb] hover:shadow-[0_6px_18px_rgba(30,64,175,0.10)]"
                    >

                      <div className="aspect-square">

                        <img
                          src={
                            image.preview
                          }
                          alt={
                            image.name
                          }
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        />

                      </div>

                      {index === 0 && (
                        <span className="absolute left-[7px] top-[7px] rounded-[4px] bg-[#1557f5] px-[7px] py-[4px] text-[7px] font-semibold text-white">
                          MAIN
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            image.id
                          )
                        }
                        className="absolute right-[7px] top-[7px] flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#172033]/75 text-[15px] text-white opacity-0 transition-all duration-200 hover:bg-[#d93650] group-hover:opacity-100"
                      >
                        ×
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 flex h-[34px] items-center justify-between bg-[#172033]/85 px-[8px] opacity-0 transition-opacity duration-200 group-hover:opacity-100">

                        <button
                          type="button"
                          disabled={
                            index === 0
                          }
                          onClick={() =>
                            moveImageLeft(
                              index
                            )
                          }
                          className="text-[13px] text-white transition-colors hover:text-[#8fb5ff] disabled:text-[#697486]"
                        >
                          ←
                        </button>

                        <span className="text-[8px] text-white">
                          {index + 1}
                        </span>

                        <button
                          type="button"
                          disabled={
                            index ===
                            images.length -
                              1
                          }
                          onClick={() =>
                            moveImageRight(
                              index
                            )
                          }
                          className="text-[13px] text-white transition-colors hover:text-[#8fb5ff] disabled:text-[#697486]"
                        >
                          →
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* =====================================================
            VARIANTS
        ===================================================== */}

        <section className="mt-[17px] overflow-hidden rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="flex items-center justify-between border-b border-[#edf1f6] px-[20px] py-[17px]">

            <div>

              <h2 className="text-[12px] font-semibold text-[#263247]">
                Product Variants
              </h2>

              <p className="mt-[5px] text-[9px] text-[#8996a8]">
                Manage color, size, SKU and stock for each variant.
              </p>

            </div>

            <div className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-[11px] py-[6px] text-[8px] text-[#718096]">

              TOTAL STOCK

              <span className="ml-[5px] font-semibold text-[#1557f5]">
                {totalStock}
              </span>

            </div>

          </div>

          <div className="p-[20px]">

            {/* DESKTOP HEADERS */}

            <div className="mb-[8px] hidden grid-cols-[1fr_1fr_1.2fr_0.7fr_45px] gap-[10px] xl:grid">

              <span className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#7c899b]">
                Color
              </span>

              <span className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#7c899b]">
                Size
              </span>

              <span className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#7c899b]">
                SKU
              </span>

              <span className="text-[8px] font-semibold uppercase tracking-[0.04em] text-[#7c899b]">
                Stock
              </span>

              <span />

            </div>

            <div className="space-y-[10px]">

              {variants.map(
                (variant, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-[10px] rounded-[8px] border border-[#e1e8f1] bg-[#f9fbfe] p-[11px] transition-all duration-200 hover:border-[#c5d6ef] hover:bg-[#f5f8fd] xl:grid-cols-[1fr_1fr_1.2fr_0.7fr_45px]"
                  >

                    {/* COLOR */}

                    <div>

                      <label className="mb-[6px] block text-[8px] font-medium uppercase text-[#7c899b] xl:hidden">
                        Color
                      </label>

                      <input
                        type="text"
                        value={
                          variant.color
                        }
                        onChange={(
                          event
                        ) =>
                          updateVariant(
                            index,
                            "color",
                            event.target
                              .value
                          )
                        }
                        placeholder="Black"
                        className={inputClass}
                      />

                    </div>

                    {/* SIZE */}

                    <div>

                      <label className="mb-[6px] block text-[8px] font-medium uppercase text-[#7c899b] xl:hidden">
                        Size
                      </label>

                      <select
                        value={
                          variant.size
                        }
                        onChange={(
                          event
                        ) =>
                          updateVariant(
                            index,
                            "size",
                            event.target
                              .value
                          )
                        }
                        className={selectClass}
                      >

                        <option value="">
                          Select Size
                        </option>

                        <option value="XS">
                          XS
                        </option>

                        <option value="S">
                          S
                        </option>

                        <option value="M">
                          M
                        </option>

                        <option value="L">
                          L
                        </option>

                        <option value="XL">
                          XL
                        </option>

                        <option value="XXL">
                          XXL
                        </option>

                        <option value="XXXL">
                          XXXL
                        </option>

                      </select>

                    </div>

                    {/* SKU */}

                    <div>

                      <label className="mb-[6px] block text-[8px] font-medium uppercase text-[#7c899b] xl:hidden">
                        SKU
                      </label>

                      <input
                        type="text"
                        value={
                          variant.sku
                        }
                        onChange={(
                          event
                        ) =>
                          updateVariant(
                            index,
                            "sku",
                            event.target
                              .value
                          )
                        }
                        placeholder="OP-TS-001-BLK-M"
                        className={inputClass}
                      />

                    </div>

                    {/* STOCK */}

                    <div>

                      <label className="mb-[6px] block text-[8px] font-medium uppercase text-[#7c899b] xl:hidden">
                        Stock
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          variant.stock
                        }
                        onChange={(
                          event
                        ) =>
                          updateVariant(
                            index,
                            "stock",
                            event.target
                              .value
                          )
                        }
                        placeholder="0"
                        className={inputClass}
                      />

                    </div>

                    {/* REMOVE */}

                    <div className="flex items-center justify-center">

                      <button
                        type="button"
                        disabled={
                          variants.length ===
                          1
                        }
                        onClick={() =>
                          removeVariant(
                            index
                          )
                        }
                        className="flex h-[35px] w-[35px] items-center justify-center rounded-[6px] border border-[#ffd0d8] bg-white text-[16px] text-[#d93650] transition-all duration-200 hover:border-[#d93650] hover:bg-[#fff1f3] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ×
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

            {/* ADD VARIANT */}

            <button
              type="button"
              onClick={addVariant}
              className="mt-[14px] h-[40px] rounded-[7px] border border-[#c8d9f3] bg-[#f1f6ff] px-[17px] text-[8px] font-semibold uppercase tracking-[0.03em] text-[#1557f5] transition-all duration-200 hover:border-[#1557f5] hover:bg-[#1557f5] hover:text-white"
            >
              + Add Variant
            </button>

          </div>

        </section>

        {/* =====================================================
            BUTTONS
        ===================================================== */}

        <div className="mt-[20px] flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">

          <p className="text-[8px] text-[#8c98a9]">
            Fields marked with * are required.
          </p>

          <div className="flex items-center gap-[10px]">

            <button
              type="button"
              onClick={
                handleCancel
              }
              disabled={saving}
              className="h-[43px] rounded-[7px] border border-[#dce5f0] bg-white px-[22px] text-[8px] font-semibold uppercase tracking-[0.03em] text-[#718096] transition-all duration-200 hover:border-[#b8c9df] hover:bg-[#f6f9fd] hover:text-[#263247] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-[43px] rounded-[7px] bg-[#1557f5] px-[24px] text-[8px] font-semibold uppercase tracking-[0.03em] text-white shadow-[0_5px_15px_rgba(21,87,245,0.16)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#0d49d8] hover:shadow-[0_8px_20px_rgba(21,87,245,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Product →"}
            </button>

          </div>

        </div>

      </form>

      {/* =====================================================
          IMAGE CROPPER
      ===================================================== */}

      {cropFile && (
        <ImageCropper
          file={cropFile}
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="flex items-center justify-between border-t border-[#e7edf5] px-[28px] py-[20px]">

        <div>

          <p className="text-[12px] font-medium text-[#1557f5]">
            GETSUKA
          </p>

          <p className="mt-[4px] text-[8px] text-[#8c98a9]">
            Admin Panel
          </p>

        </div>

        <p className="text-[8px] text-[#8c98a9]">
          Built with{" "}
          <span className="text-[#1557f5]">
            ♥
          </span>{" "}
          for anime fans.
        </p>

      </footer>

    </div>
  );
};

export default AddProductPage;