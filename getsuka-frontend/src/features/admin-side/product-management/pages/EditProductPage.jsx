import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import adminAxios from "../../../../lib/adminAxios";

const EditProductPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState([]);

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
  const [variants, setVariants] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
  // LOAD PRODUCT
  // =========================================================

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await adminAxios.get(
          `/api/admin/products/${productId}`
        );

        console.log(
          "PRODUCT RESPONSE:",
          response.data
        );

        const data =
          response.data?.product ||
          response.data?.data?.product ||
          response.data?.data ||
          response.data;

        if (!data) {
          throw new Error("Product not found.");
        }

        setForm({
          name: data.name || "",

          productCode:
            data.productCode || "",

          description:
            data.description || "",

          category:
            data.category?._id ||
            data.category ||
            "",

          anime:
            data.anime || "",

          price:
            data.price ?? "",

          salePrice:
            data.salePrice ?? "",

          details: {
            material:
              data.details?.material || "",

            fit:
              data.details?.fit || "",

            careInstructions:
              data.details?.careInstructions || "",

            shippingInfo:
              data.details?.shippingInfo || "",

            returnInfo:
              data.details?.returnInfo || "",

            productDetails:
              data.details?.productDetails || "",

            highlights:
              Array.isArray(
                data.details?.highlights
              )
                ? data.details.highlights.join("\n")
                : "",
          },
        });

        const productImages =
          Array.isArray(data.images)
            ? data.images
            : [];

        setImages(
          productImages.map(
            (image, index) => ({
              id: `existing-${index}-${Date.now()}`,
              name: `Product image ${index + 1}`,
              preview: image,
              value: image,
              existing: true,
            })
          )
        );

        const productVariants =
          Array.isArray(data.variants)
            ? data.variants
            : [];

        setVariants(
          productVariants.map(
            (variant) => ({
              _id: variant._id,

              color:
                variant.color || "",

              size:
                variant.size || "",

              sku:
                variant.sku || "",

              stock:
                variant.stock ?? 0,
            })
          )
        );
      } catch (err) {
        console.error(
          "LOAD PRODUCT ERROR:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load product."
        );
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response =
          await adminAxios.get(
            "/api/admin/categories",
            {
              params: {
                page: 1,
                limit: 100,
              },
            }
          );

        console.log(
          "CATEGORY RESPONSE:",
          response.data
        );

        const responseData =
          response.data;

        let categoryList = [];

        if (
          Array.isArray(
            responseData?.categories
          )
        ) {
          categoryList =
            responseData.categories;
        } else if (
          Array.isArray(
            responseData?.data?.categories
          )
        ) {
          categoryList =
            responseData.data.categories;
        } else if (
          Array.isArray(
            responseData?.data
          )
        ) {
          categoryList =
            responseData.data;
        } else if (
          Array.isArray(responseData)
        ) {
          categoryList =
            responseData;
        }

        setCategories(
          categoryList.filter(
            (category) =>
              category &&
              !category.isDeleted
          )
        );
      } catch (err) {
        console.error(
          "LOAD CATEGORIES ERROR:",
          err
        );
      }
    };

    loadCategories();
  }, []);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  // =========================================================
  // PRODUCT DETAILS CHANGE
  // =========================================================

  const handleDetailsChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,

        details: {
          ...previous.details,

          [name]: value,
        },
      })
    );

    setError("");
    setSuccess("");
  };

  // =========================================================
  // IMAGE TO BASE64
  // =========================================================

  const convertFileToBase64 = (
    file
  ) => {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          resolve(
            reader.result
          );
        };

        reader.onerror = () => {
          reject(
            new Error(
              "Unable to read image."
            )
          );
        };

        reader.readAsDataURL(file);
      }
    );
  };

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const handleImageUpload = async (
    event
  ) => {
    const files =
      Array.from(
        event.target.files || []
      );

    if (!files.length) {
      return;
    }

    setError("");

    const remainingSlots =
      6 - images.length;

    if (
      files.length >
      remainingSlots
    ) {
      setError(
        "You can have a maximum of 6 product images."
      );

      event.target.value = "";

      return;
    }

    const validFiles =
      files.filter(
        (file) =>
          file.type.startsWith(
            "image/"
          ) &&
          file.size <=
            5 *
              1024 *
              1024
      );

    if (
      validFiles.length !==
      files.length
    ) {
      setError(
        "Only image files up to 5MB are allowed."
      );
    }

    if (!validFiles.length) {
      event.target.value = "";
      return;
    }

    try {
      const converted =
        await Promise.all(
          validFiles.map(
            async (file) => {
              const base64 =
                await convertFileToBase64(
                  file
                );

              return {
                id: `${Date.now()}-${Math.random()}`,

                name:
                  file.name,

                preview:
                  base64,

                value:
                  base64,

                existing:
                  false,
              };
            }
          )
        );

      setImages(
        (previous) => [
          ...previous,
          ...converted,
        ]
      );
    } catch (err) {
      console.error(err);

      setError(
        "Failed to process image."
      );
    }

    event.target.value = "";
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const removeImage = (
    imageId
  ) => {
    setImages(
      (previous) =>
        previous.filter(
          (image) =>
            image.id !== imageId
        )
    );
  };

  // =========================================================
  // MOVE IMAGE LEFT
  // =========================================================

  const moveImageLeft = (
    index
  ) => {
    if (index === 0) {
      return;
    }

    setImages(
      (previous) => {
        const updated = [
          ...previous,
        ];

        [
          updated[index - 1],
          updated[index],
        ] = [
          updated[index],
          updated[index - 1],
        ];

        return updated;
      }
    );
  };

  // =========================================================
  // MOVE IMAGE RIGHT
  // =========================================================

  const moveImageRight = (
    index
  ) => {
    if (
      index ===
      images.length - 1
    ) {
      return;
    }

    setImages(
      (previous) => {
        const updated = [
          ...previous,
        ];

        [
          updated[index],
          updated[index + 1],
        ] = [
          updated[index + 1],
          updated[index],
        ];

        return updated;
      }
    );
  };

  // =========================================================
  // ADD VARIANT
  // =========================================================

  const addVariant = () => {
    setVariants(
      (previous) => [
        ...previous,

        {
          color: "",
          size: "",
          sku: "",
          stock: 0,
        },
      ]
    );
  };

  // =========================================================
  // REMOVE VARIANT
  // =========================================================

  const removeVariant = (
    index
  ) => {
    if (
      variants.length === 1
    ) {
      setError(
        "At least one product variant is required."
      );

      return;
    }

    setVariants(
      (previous) =>
        previous.filter(
          (
            _,
            variantIndex
          ) =>
            variantIndex !==
            index
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
    setVariants(
      (previous) =>
        previous.map(
          (
            variant,
            variantIndex
          ) =>
            variantIndex ===
            index
              ? {
                  ...variant,
                  [field]:
                    value,
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
        (
          total,
          variant
        ) =>
          total +
          Number(
            variant.stock || 0
          ),
        0
      ),
    [variants]
  );

  // =========================================================
  // VALIDATION
  // =========================================================

  const validateForm = () => {
    if (
      !form.name.trim()
    ) {
      return "Product name is required.";
    }

    if (
      !form.description.trim()
    ) {
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
      form.salePrice !== null &&
      Number(
        form.salePrice
      ) < 0
    ) {
      return "Sale price cannot be negative.";
    }

    if (
      form.salePrice !== "" &&
      form.salePrice !== null &&
      Number(
        form.salePrice
      ) >
        Number(form.price)
    ) {
      return "Sale price cannot be greater than the original price.";
    }

    if (
      images.length < 3
    ) {
      return "At least 3 product images are required.";
    }

    if (
      variants.length === 0
    ) {
      return "At least one product variant is required.";
    }

    for (
      let index = 0;
      index <
      variants.length;
      index++
    ) {
      const variant =
        variants[index];

      if (
        !variant.color.trim()
      ) {
        return `Color is required for variant ${
          index + 1
        }.`;
      }

      if (!variant.size) {
        return `Size is required for variant ${
          index + 1
        }.`;
      }

      if (
        !variant.sku.trim()
      ) {
        return `SKU is required for variant ${
          index + 1
        }.`;
      }

      if (
        variant.stock ===
          "" ||
        Number(
          variant.stock
        ) < 0
      ) {
        return `Valid stock is required for variant ${
          index + 1
        }.`;
      }
    }

    const skuList =
      variants.map(
        (variant) =>
          variant.sku
            .trim()
            .toLowerCase()
      );

    const duplicateSku =
      skuList.some(
        (
          sku,
          index
        ) =>
          skuList.indexOf(
            sku
          ) !== index
      );

    if (duplicateSku) {
      return "Each variant must have a unique SKU.";
    }

    return "";
  };

  // =========================================================
  // UPDATE PRODUCT
  // =========================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(
          validationError
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      try {
        setSaving(true);

        const payload = {
          name:
            form.name.trim(),

          productCode:
            form.productCode.trim(),

          description:
            form.description.trim(),

          category:
            form.category,

          anime:
            form.anime,

          price:
            Number(
              form.price
            ),

          salePrice:
            form.salePrice ===
              "" ||
            form.salePrice ===
              null
              ? null
              : Number(
                  form.salePrice
                ),

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
                .map(
                  (item) =>
                    item.trim()
                )
                .filter(Boolean),
          },

          images:
            images.map(
              (image) =>
                image.value
            ),

          variants:
            variants.map(
              (variant) => ({
                _id:
                  variant._id,

                color:
                  variant.color.trim(),

                size:
                  variant.size,

                sku:
                  variant.sku.trim(),

                stock:
                  Number(
                    variant.stock
                  ),
              })
            ),
        };

        console.log(
          "UPDATE PRODUCT PAYLOAD:",
          payload
        );

        await adminAxios.put(
          `/api/admin/products/${productId}`,
          payload
        );

        setSuccess(
          "Product updated successfully."
        );

        setTimeout(() => {
          navigate(
            "/admin/products"
          );
        }, 800);
      } catch (err) {
        console.error(
          "UPDATE PRODUCT ERROR:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Failed to update product."
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#edf3ff] text-[#172033]">

        <div className="text-center">

          <div className="w-[38px] h-[38px] border-2 border-[#dce5f0] border-t-[#1557f5] rounded-full animate-spin mx-auto" />

          <p className="mt-[14px] text-[10px] text-[#8290a3]">
            Loading product...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-full text-[#172033]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="px-[28px] pt-[20px] pb-[20px] border-b border-[#edf1f6]">

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
            Edit Product
          </span>

        </div>

        <div className="mt-[20px]">

          <h1 className="text-[25px] font-semibold tracking-[-0.04em] text-[#162033]">
            Edit Product
          </h1>

          <p className="mt-[6px] text-[10px] text-[#8290a3]">
            Update your GETSUKA anime product.
          </p>

        </div>

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mx-[28px] mt-[18px] rounded-[8px] border border-[#ffd0d8] bg-[#fff5f6] px-[16px] py-[13px] text-[10px] text-[#d93650]">
          {error}
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <div className="mx-[28px] mt-[18px] rounded-[8px] border border-[#bcebd5] bg-[#effcf6] px-[16px] py-[13px] text-[10px] text-[#11845b]">
          {success}
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="px-[28px] pb-[35px] pt-[18px]"
      >

        {/* =====================================================
            BASIC INFORMATION
        ===================================================== */}

        <section className="rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="px-[20px] py-[17px] border-b border-[#edf1f6]">

            <p className="text-[12px] font-semibold text-[#263247]">
              BASIC INFORMATION
            </p>

            <p className="mt-[5px] text-[9px] text-[#8996a8]">
              Product details and catalogue information.
            </p>

          </div>

          <div className="p-[20px] grid grid-cols-1 xl:grid-cols-2 gap-[17px]">

            {/* PRODUCT NAME */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                PRODUCT NAME *
              </label>

              <input
                type="text"
                name="name"
                value={
                  form.name
                }
                onChange={
                  handleChange
                }
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* PRODUCT CODE */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                PRODUCT CODE
              </label>

              <input
                type="text"
                name="productCode"
                value={
                  form.productCode
                }
                onChange={
                  handleChange
                }
                placeholder="GET-OP-001"
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

              <p className="mt-[7px] text-[8px] text-[#8c98a9]">
                Optional catalogue code shown on the product details page.
              </p>

            </div>

            {/* ANIME */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                ANIME *
              </label>

              <select
                name="anime"
                value={
                  form.anime
                }
                onChange={
                  handleChange
                }
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              >

                <option value="">
                  Select Anime
                </option>

                {animeOptions.map(
                  (
                    anime
                  ) => (
                    <option
                      key={
                        anime
                      }
                      value={
                        anime
                      }
                    >
                      {anime}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CATEGORY */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                CATEGORY *
              </label>

              <select
                name="category"
                value={
                  form.category
                }
                onChange={
                  handleChange
                }
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              >

                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category._id
                      }
                      value={
                        category._id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}

              </select>

              <p className="mt-[7px] text-[8px] text-[#8c98a9]">
                Product type for GETSUKA. Currently T-Shirts.
              </p>

            </div>

            {/* PRICE */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                PRICE *
              </label>

              <div className="relative">

                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[10px] text-[#8c98a9]">
                  ₹
                </span>

                <input
                  type="number"
                  name="price"
                  value={
                    form.price
                  }
                  onChange={
                    handleChange
                  }
                  min="0"
                  className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] pl-[29px] pr-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
                />

              </div>

            </div>

            {/* SALE PRICE */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                SALE PRICE
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
                  onChange={
                    handleChange
                  }
                  min="0"
                  className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] pl-[29px] pr-[13px] text-[10px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
                />

              </div>

              <p className="mt-[7px] text-[8px] text-[#8c98a9]">
                Leave empty if there is no discount.
              </p>

            </div>

            {/* DESCRIPTION */}

            <div className="xl:col-span-2">

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                DESCRIPTION *
              </label>

              <textarea
                name="description"
                value={
                  form.description
                }
                onChange={
                  handleChange
                }
                rows="5"
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] outline-none resize-none transition-all duration-200 placeholder:text-[#aab4c2] hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            PRODUCT DETAILS
        ===================================================== */}

        <section className="mt-[17px] rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="px-[20px] py-[17px] border-b border-[#edf1f6]">

            <p className="text-[12px] font-semibold text-[#263247]">
              PRODUCT DETAILS
            </p>

            <p className="mt-[5px] text-[9px] text-[#8996a8]">
              Information displayed inside the product details page.
            </p>

          </div>

          <div className="p-[20px] grid grid-cols-1 xl:grid-cols-2 gap-[17px]">

            {/* MATERIAL */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                MATERIAL
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
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] placeholder:text-[#aab4c2] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* FIT */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                FIT
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
                className="w-full h-[44px] rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] text-[10px] text-[#263247] placeholder:text-[#aab4c2] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* CARE INSTRUCTIONS */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                CARE INSTRUCTIONS
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
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] placeholder:text-[#aab4c2] outline-none resize-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* SHIPPING INFORMATION */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                SHIPPING INFORMATION
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
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] placeholder:text-[#aab4c2] outline-none resize-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* RETURN INFORMATION */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                RETURN INFORMATION
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
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] placeholder:text-[#aab4c2] outline-none resize-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* PRODUCT DETAILS TEXT */}

            <div>

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                PRODUCT DETAILS TEXT
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
                placeholder="Detailed information about this T-shirt."
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] placeholder:text-[#aab4c2] outline-none resize-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

            </div>

            {/* PRODUCT HIGHLIGHTS */}

            <div className="xl:col-span-2">

              <label className="block text-[8px] font-semibold uppercase tracking-[0.05em] text-[#718096] mb-[8px]">
                PRODUCT HIGHLIGHTS
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
                className="w-full rounded-[7px] border border-[#dce5f0] bg-[#f9fbfe] px-[13px] py-[12px] text-[10px] leading-[1.6] text-[#263247] placeholder:text-[#aab4c2] outline-none resize-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:bg-white focus:ring-[3px] focus:ring-[#1557f5]/5"
              />

              <p className="mt-[7px] text-[8px] text-[#8c98a9]">
                Enter one highlight per line.
              </p>

            </div>

          </div>

        </section>

        {/* =====================================================
            IMAGES
        ===================================================== */}

        <section className="mt-[17px] rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="px-[20px] py-[17px] border-b border-[#edf1f6] flex items-center justify-between">

            <div>

              <p className="text-[12px] font-semibold text-[#263247]">
                PRODUCT IMAGES
              </p>

              <p className="mt-[5px] text-[9px] text-[#8996a8]">
                Minimum 3 images required. Maximum 6 images.
              </p>

            </div>

            <span className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-[10px] py-[6px] text-[8px] font-medium text-[#718096]">
              {images.length} / 6
            </span>

          </div>

          <div className="p-[20px]">

            <label className="group h-[125px] rounded-[8px] border border-dashed border-[#cbd7e5] bg-[#f9fbfe] flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#7ca2e9] hover:bg-[#f3f7ff]">

              <div className="w-[36px] h-[36px] rounded-full border border-[#d7e2ef] bg-white flex items-center justify-center text-[19px] text-[#1557f5] transition-all duration-200 group-hover:bg-[#1557f5] group-hover:text-white">
                +
              </div>

              <p className="mt-[9px] text-[10px] text-[#526176]">
                Add more images
              </p>

              <p className="mt-[5px] text-[8px] text-[#8c98a9]">
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

            <div className="mt-[16px] grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-[11px]">

              {images.map(
                (
                  image,
                  index
                ) => (
                  <div
                    key={
                      image.id
                    }
                    className="group relative overflow-hidden rounded-[8px] border border-[#e1e8f1] bg-[#f9fbfe] transition-all duration-200 hover:border-[#9eb9eb] hover:shadow-[0_6px_18px_rgba(30,64,175,0.10)]"
                  >

                    <div className="aspect-square">

                      <img
                        src={
                          image.preview
                        }
                        alt={
                          image.name
                        }
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />

                    </div>

                    {index ===
                      0 && (
                      <span className="absolute top-[7px] left-[7px] rounded-[4px] bg-[#1557f5] px-[7px] py-[4px] text-[7px] font-semibold text-white">
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
                      className="absolute top-[7px] right-[7px] w-[25px] h-[25px] rounded-full bg-[#172033]/80 text-[15px] text-white opacity-0 group-hover:opacity-100 hover:bg-[#d93650] transition-all duration-200"
                    >
                      ×
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 h-[32px] bg-[#172033]/85 flex items-center justify-between px-[8px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                      <button
                        type="button"
                        disabled={
                          index ===
                          0
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

          </div>

        </section>

        {/* =====================================================
            VARIANTS
        ===================================================== */}

        <section className="mt-[17px] rounded-[12px] border border-[#e1e8f1] bg-white shadow-[0_4px_18px_rgba(30,64,175,0.04)]">

          <div className="px-[20px] py-[17px] border-b border-[#edf1f6] flex items-center justify-between">

            <div>

              <p className="text-[12px] font-semibold text-[#263247]">
                PRODUCT VARIANTS
              </p>

              <p className="mt-[5px] text-[9px] text-[#8996a8]">
                Manage color, size, SKU and stock.
              </p>

            </div>

            <div className="rounded-full border border-[#dce5f0] bg-[#f5f8fc] px-[11px] py-[6px] text-[8px] text-[#718096]">

              TOTAL STOCK

              <span className="ml-[6px] text-[12px] font-semibold text-[#1557f5]">
                {totalStock}
              </span>

            </div>

          </div>

          <div className="p-[20px]">

            <div className="hidden xl:grid grid-cols-[1fr_1fr_1.2fr_0.7fr_45px] gap-[10px] mb-[8px]">

              <span className="text-[8px] font-semibold uppercase text-[#718096]">
                COLOR
              </span>

              <span className="text-[8px] font-semibold uppercase text-[#718096]">
                SIZE
              </span>

              <span className="text-[8px] font-semibold uppercase text-[#718096]">
                SKU
              </span>

              <span className="text-[8px] font-semibold uppercase text-[#718096]">
                STOCK
              </span>

              <span />

            </div>

            <div className="space-y-[10px]">

              {variants.map(
                (
                  variant,
                  index
                ) => (
                  <div
                    key={
                      variant._id ||
                      index
                    }
                    className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.2fr_0.7fr_45px] gap-[10px] rounded-[8px] border border-[#e1e8f1] bg-[#f9fbfe] p-[11px] transition-all duration-200 hover:border-[#c5d6ef] hover:bg-[#f5f8fd] hover:shadow-[0_4px_12px_rgba(30,64,175,0.05)]"
                  >

                    <div>

                      <label className="xl:hidden block text-[8px] font-semibold uppercase text-[#718096] mb-[6px]">
                        COLOR
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
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Black"
                        className="w-full h-[40px] rounded-[6px] border border-[#dce5f0] bg-white px-[11px] text-[9px] text-[#263247] placeholder:text-[#aab4c2] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:ring-[3px] focus:ring-[#1557f5]/5"
                      />

                    </div>

                    <div>

                      <label className="xl:hidden block text-[8px] font-semibold uppercase text-[#718096] mb-[6px]">
                        SIZE
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
                            event
                              .target
                              .value
                          )
                        }
                        className="w-full h-[40px] rounded-[6px] border border-[#dce5f0] bg-white px-[11px] text-[9px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:ring-[3px] focus:ring-[#1557f5]/5"
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

                    <div>

                      <label className="xl:hidden block text-[8px] font-semibold uppercase text-[#718096] mb-[6px]">
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
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="OP-TS-001-BLK-M"
                        className="w-full h-[40px] rounded-[6px] border border-[#dce5f0] bg-white px-[11px] text-[9px] text-[#263247] placeholder:text-[#aab4c2] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:ring-[3px] focus:ring-[#1557f5]/5"
                      />

                    </div>

                    <div>

                      <label className="xl:hidden block text-[8px] font-semibold uppercase text-[#718096] mb-[6px]">
                        STOCK
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
                            event
                              .target
                              .value
                          )
                        }
                        className="w-full h-[40px] rounded-[6px] border border-[#dce5f0] bg-white px-[11px] text-[9px] text-[#263247] outline-none transition-all duration-200 hover:border-[#c4d2e5] focus:border-[#6f9cf7] focus:ring-[3px] focus:ring-[#1557f5]/5"
                      />

                    </div>

                    <div className="flex items-center justify-center">

                      <button
                        type="button"
                        onClick={() =>
                          removeVariant(
                            index
                          )
                        }
                        className="w-[35px] h-[35px] rounded-[6px] border border-[#ffd0d8] bg-white text-[16px] text-[#d93650] hover:bg-[#fff1f3] hover:border-[#d93650] transition-all duration-200"
                      >
                        ×
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

            <button
              type="button"
              onClick={
                addVariant
              }
              className="mt-[14px] h-[40px] px-[17px] rounded-[7px] border border-[#c8d9f3] bg-[#f1f6ff] text-[8px] font-semibold text-[#1557f5] hover:bg-[#1557f5] hover:text-white hover:border-[#1557f5] transition-all duration-200"
            >
              + ADD VARIANT
            </button>

          </div>

        </section>

        {/* =====================================================
            ACTIONS
        ===================================================== */}

        <div className="mt-[20px] flex items-center justify-between">

          <p className="text-[8px] text-[#8c98a9]">
            Changes will be saved to your GETSUKA catalogue.
          </p>

          <div className="flex items-center gap-[10px]">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/products"
                )
              }
              disabled={
                saving
              }
              className="h-[43px] px-[22px] rounded-[7px] border border-[#dce5f0] bg-white text-[8px] font-semibold text-[#718096] hover:bg-[#f6f9fd] hover:border-[#b8c9df] hover:text-[#263247] transition-all duration-200"
            >
              CANCEL
            </button>

            <button
              type="submit"
              disabled={
                saving
              }
              className="h-[43px] px-[24px] rounded-[7px] bg-[#1557f5] text-[8px] font-semibold text-white shadow-[0_5px_15px_rgba(21,87,245,0.16)] hover:bg-[#0d49d8] hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(21,87,245,0.22)] active:translate-y-0 disabled:opacity-50 transition-all duration-200"
            >
              {saving
                ? "SAVING..."
                : "SAVE CHANGES →"}
            </button>

          </div>

        </div>

      </form>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-[#e7edf5] px-[28px] py-[20px] flex items-center justify-between">

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

export default EditProductPage;