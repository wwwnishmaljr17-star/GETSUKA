import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import productApi from "../api/productApi";
import wishlistApi from "../../wishlists/api/wishlistApi";
import ReviewSection from "../components/ReviewSection";

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (
    title,
    message,
    type = "success"
  ) => {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast((previous) => ({
        ...previous,
        show: false,
      }));
    }, 3500);
  };

  const [openSection, setOpenSection] =
    useState("description");

  /*
  ============================================================
  MODERN HOVER ZOOM
  ============================================================
  */

  const [isImageHovered, setIsImageHovered] =
    useState(false);

  const [zoomPosition, setZoomPosition] =
    useState({
      x: 50,
      y: 50,
    });

  /*
  ============================================================
  WISHLIST STATUS
  ============================================================
  */

  const loadWishlistStatus = async (currentProductId) => {
    const token = localStorage.getItem("token");

    if (!token || !currentProductId) {
      setIsWishlisted(false);
      return;
    }

    try {
      const response =
        await wishlistApi.getWishlist();

      const wishlistItems =
        Array.isArray(response?.wishlist)
          ? response.wishlist
          : [];

      const exists = wishlistItems.some(
        (item) => {
          const wishlistProduct =
            item?.product;

          const wishlistProductId =
            typeof wishlistProduct ===
            "object"
              ? wishlistProduct?._id
              : wishlistProduct;

          return (
            wishlistProductId ===
            currentProductId
          );
        }
      );

      setIsWishlisted(exists);
    } catch (err) {
      console.error(
        "WISHLIST STATUS ERROR:",
        err
      );

      setIsWishlisted(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (
      !product?._id ||
      wishlistLoading
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setWishlistLoading(true);

      if (isWishlisted) {
        const response =
          await wishlistApi.removeFromWishlist(
            product._id
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Failed to remove product from wishlist."
          );
        }

        setIsWishlisted(false);
      } else {
        const response =
          await wishlistApi.addToWishlist(
            product._id
          );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Failed to add product to wishlist."
          );
        }

        setIsWishlisted(true);
      }
    } catch (err) {
      console.error(
        "WISHLIST TOGGLE ERROR:",
        err
      );

      showToast(
        "WISHLIST ERROR",
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update wishlist.",
        "error"
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  /*
  ============================================================
  LOAD PRODUCT
  ============================================================
  */

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await productApi.getProductById(
          productId
        );

      if (
        !response?.success ||
        !response?.product
      ) {
        throw new Error(
          response?.message ||
            "Product could not be found."
        );
      }

      const currentProduct =
        response.product;

      setProduct(currentProduct);

      setSelectedImage(0);

      const firstSize =
        currentProduct.sizes?.find(
          (size) =>
            currentProduct.availableVariants?.some(
              (variant) =>
                variant.size === size &&
                Number(variant.stock) > 0
            )
        );

      const firstColor =
        currentProduct.colors?.find(
          (color) =>
            currentProduct.availableVariants?.some(
              (variant) =>
                variant.color === color &&
                Number(variant.stock) > 0
            )
        );

      setSelectedSize(
        firstSize || ""
      );

      setSelectedColor(
        firstColor || ""
      );

      setQuantity(1);

      loadWishlistStatus(
        currentProduct._id
      );

      loadRelatedProducts(
        currentProduct
      );
    } catch (err) {
      console.error(
        "PRODUCT DETAILS LOAD ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load product."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ============================================================
  RELATED PRODUCTS
  ============================================================
  */

  const loadRelatedProducts = async (
    currentProduct
  ) => {
    try {
      setRelatedLoading(true);

      const response =
        await productApi.getProducts({
          anime:
            currentProduct.anime || "",
          limit: 5,
          page: 1,
        });

      const products =
        Array.isArray(
          response?.products
        )
          ? response.products
          : [];

      const filtered =
        products
          .filter(
            (item) =>
              item._id !==
              currentProduct._id
          )
          .slice(0, 4);

      setRelatedProducts(
        filtered
      );
    } catch (err) {
      console.error(
        "RELATED PRODUCTS ERROR:",
        err
      );

      setRelatedProducts([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  /*
  ============================================================
  INITIAL LOAD
  ============================================================
  */

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  /*
  ============================================================
  IMAGES
  ============================================================
  */

  const images = useMemo(() => {
    if (
      !product ||
      !Array.isArray(product.images)
    ) {
      return [];
    }

    return product.images.filter(Boolean);
  }, [product]);

  /*
  ============================================================
  PRODUCT DETAILS
  ============================================================
  */

  const details =
    product?.details || {};

  const highlights =
    Array.isArray(details.highlights)
      ? details.highlights
      : [];

  /*
  ============================================================
  SELECTED VARIANT
  ============================================================
  */

  const selectedVariant = useMemo(() => {
    if (
      !product?.availableVariants
    ) {
      return null;
    }

    return (
      product.availableVariants.find(
        (variant) => {
          const sizeMatches =
            !selectedSize ||
            variant.size ===
              selectedSize;

          const colorMatches =
            !selectedColor ||
            variant.color ===
              selectedColor;

          return (
            sizeMatches &&
            colorMatches &&
            Number(variant.stock) >
              0
          );
        }
      ) || null
    );
  }, [
    product,
    selectedSize,
    selectedColor,
  ]);

  /*
  ============================================================
  PRICE
  ============================================================
  */

  const finalPrice =
    product?.finalPrice ??
    product?.price ??
    0;

  const originalPrice =
    product?.price ?? 0;

  const hasDiscount =
    Number(finalPrice) <
    Number(originalPrice);

  const discountPercentage =
    hasDiscount &&
    Number(originalPrice) > 0
      ? Math.round(
          ((Number(originalPrice) -
            Number(finalPrice)) /
            Number(originalPrice)) *
            100
        )
      : 0;

  /*
  ============================================================
  STOCK
  ============================================================
  */

  const availableStock =
    selectedVariant
      ? Number(
          selectedVariant.stock
        )
      : 0;

  const isOutOfStock =
    product?.stockStatus ===
    "OUT_OF_STOCK";

  /*
  ============================================================
  MODERN IMAGE HOVER ZOOM
  ============================================================
  */

  const handleImageMouseMove = (
    event
  ) => {
    const container =
      event.currentTarget;

    const rect =
      container.getBoundingClientRect();

    const x =
      ((event.clientX -
        rect.left) /
        rect.width) *
      100;

    const y =
      ((event.clientY -
        rect.top) /
        rect.height) *
      100;

    setZoomPosition({
      x: Math.max(
        0,
        Math.min(100, x)
      ),
      y: Math.max(
        0,
        Math.min(100, y)
      ),
    });
  };

  const handleImageMouseEnter =
    (event) => {
      handleImageMouseMove(
        event
      );

      setIsImageHovered(true);
    };

  const handleImageMouseLeave =
    () => {
      setIsImageHovered(false);

      setZoomPosition({
        x: 50,
        y: 50,
      });
    };

  /*
  ============================================================
  SIZE AVAILABILITY
  ============================================================
  */

  const isSizeAvailable = (
    size
  ) => {
    if (
      !product?.availableVariants
    ) {
      return false;
    }

    return product.availableVariants.some(
      (variant) => {
        const colorMatches =
          !selectedColor ||
          variant.color ===
            selectedColor;

        return (
          variant.size ===
            size &&
          colorMatches &&
          Number(variant.stock) >
            0
        );
      }
    );
  };

  /*
  ============================================================
  COLOR AVAILABILITY
  ============================================================
  */

  const isColorAvailable = (
    color
  ) => {
    if (
      !product?.availableVariants
    ) {
      return false;
    }

    return product.availableVariants.some(
      (variant) => {
        const sizeMatches =
          !selectedSize ||
          variant.size ===
            selectedSize;

        return (
          variant.color ===
            color &&
          sizeMatches &&
          Number(variant.stock) >
            0
        );
      }
    );
  };

  /*
  ============================================================
  SIZE CHANGE
  ============================================================
  */

  const handleSizeChange = (
    size
  ) => {
    setSelectedSize(size);
    setQuantity(1);

    const compatibleVariant =
      product?.availableVariants?.find(
        (variant) =>
          variant.size ===
            size &&
          Number(variant.stock) >
            0
      );

    if (
      compatibleVariant &&
      selectedColor &&
      !product.availableVariants.some(
        (variant) =>
          variant.size ===
            size &&
          variant.color ===
            selectedColor &&
          Number(variant.stock) >
            0
      )
    ) {
      setSelectedColor(
        compatibleVariant.color
      );
    }
  };

  /*
  ============================================================
  COLOR CHANGE
  ============================================================
  */

  const handleColorChange = (
    color
  ) => {
    setSelectedColor(color);
    setQuantity(1);

    const compatibleVariant =
      product?.availableVariants?.find(
        (variant) =>
          variant.color ===
            color &&
          Number(variant.stock) >
            0
      );

    if (
      compatibleVariant &&
      selectedSize &&
      !product.availableVariants.some(
        (variant) =>
          variant.color ===
            color &&
          variant.size ===
            selectedSize &&
          Number(variant.stock) >
            0
      )
    ) {
      setSelectedSize(
        compatibleVariant.size
      );
    }
  };

  /*
  ============================================================
  QUANTITY
  ============================================================
  */

  const decreaseQuantity = () => {
    setQuantity(
      (previous) =>
        Math.max(
          1,
          previous - 1
        )
    );
  };

  const increaseQuantity = () => {
    if (!selectedVariant) {
      return;
    }

    setQuantity(
      (previous) =>
        Math.min(
          Number(
            selectedVariant.stock
          ),
          previous + 1
        )
    );
  };

  /*
  ============================================================
  ADD TO CART
  ============================================================
  */

  const addToCart = () => {
    if (
      !product ||
      isOutOfStock
    ) {
      return false;
    }

    // Prevent blocked/unlisted/deleted products
    if (
      product.isListed === false ||
      product.isDeleted === true
    ) {
      showToast(
        "PRODUCT UNAVAILABLE",
        "This product is no longer available.",
        "error"
      );

      return false;
    }

    if (!selectedSize) {
      showToast(
        "SELECT A SIZE",
        "Please select a size before adding this product.",
        "error"
      );

      return false;
    }

    if (!selectedColor) {
      showToast(
        "SELECT A COLOR",
        "Please select a color before adding this product.",
        "error"
      );

      return false;
    }

    if (!selectedVariant) {
      showToast(
        "VARIANT UNAVAILABLE",
        "This size and color combination is unavailable.",
        "error"
      );

      return false;
    }

    try {
      const savedCart =
        localStorage.getItem(
          "getsukaCart"
        );

      const currentCart =
        savedCart
          ? JSON.parse(
              savedCart
            )
          : [];

      const existingIndex =
        currentCart.findIndex(
          (item) =>
            item.productId ===
              product._id &&
            item.variantId ===
              selectedVariant._id
        );

      if (
        existingIndex !== -1
      ) {
        const existingItem =
          currentCart[
            existingIndex
          ];

        const newQuantity =
          Number(
            existingItem.quantity ||
              0
          ) + quantity;

        if (
          newQuantity >
          Number(
            selectedVariant.stock
          )
        ) {
          showToast(
            "LIMITED STOCK",
            `Only ${selectedVariant.stock} item${
              Number(
                selectedVariant.stock
              ) > 1
                ? "s"
                : ""
            } available in stock.`,
            "error"
          );

          return false;
        }

        currentCart[
          existingIndex
        ] = {
          ...existingItem,
          quantity:
            newQuantity,
        };
      } else {
        currentCart.push({
          productId:
            product._id,

          variantId:
            selectedVariant._id,

          name:
            product.name,

          anime:
            product.anime,

          image:
            images[0] || "",

          price:
            finalPrice,

          quantity,

          size:
            selectedVariant.size,

          color:
            selectedVariant.color,

          sku:
            selectedVariant.sku,

          maxStock:
            Number(
              selectedVariant.stock
            ),
        });
      }

      localStorage.setItem(
        "getsukaCart",
        JSON.stringify(
          currentCart
        )
      );

      window.dispatchEvent(
        new Event(
          "cartUpdated"
        )
      );

      showToast(
        "ADDED TO CART",
        `${product.name} has been added to your cart.`,
        "success"
      );

      return true;
    } catch (error) {
      console.error(
        "ADD TO CART ERROR:",
        error
      );

      showToast(
        "CART ERROR",
        "Unable to add product to cart.",
        "error"
      );

      return false;
    }
  };

  /*
  ============================================================
  BUY NOW
  ============================================================
  */

  const buyNow = () => {
    if (
      !product ||
      isOutOfStock
    ) {
      return;
    }

    const added =
      addToCart();

    if (added) {
      navigate("/cart");
    }
  };

  /*
  ============================================================
  ACCORDION
  ============================================================
  */

  const toggleSection = (
    section
  ) => {
    setOpenSection(
      (previous) =>
        previous === section
          ? ""
          : section
    );
  };

  /*
  ============================================================
  RELATED PRODUCT
  ============================================================
  */

  const openRelatedProduct = (
    relatedProductId
  ) => {
    navigate(
      `/products/${relatedProductId}`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] text-[#252321]">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#D8D3CF] border-t-[#6F4E37]" />

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#716C67]">
            Loading product details...
          </p>

        </div>

      </div>
    );
  }

  /*
  ============================================================
  ERROR
  ============================================================
  */

  if (
    error ||
    !product
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F0F7] px-6 text-[#252321]">

        <div className="max-w-md rounded-[20px] border border-transparent bg-white p-10 text-center shadow-md">

          <p className="text-2xl font-normal font-serif uppercase text-[#252321]">
            Product Not Found
          </p>

          <p className="mt-3 text-xs text-[#716C67]">
            {error ||
              "This piece is unavailable or does not exist."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="mt-6 rounded-full bg-[#6F4E37] px-8 py-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-xs transition hover:bg-[#5B3F2C]"
          >
            BACK TO CATALOG
          </button>

        </div>

      </div>
    );
  }

  /*
  ============================================================
  PAGE
  ============================================================
  */

  return (
    <div className="min-h-screen bg-[#F4F0F7] text-[#252321]">

      {toast.show && (
        <div className="fixed right-5 top-24 z-[9999] w-[360px] max-w-[calc(100vw-40px)] rounded-md border border-[#E5E4E2] bg-white shadow-2xl" role="status" aria-live="polite">
          <div className="flex items-start gap-4 p-5">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6E0F0] text-[#6F4E37] text-sm font-bold">
              <span>
                {toast.type === "success" ? "✓" : "!"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F4E37]">
                {toast.title}
              </p>

              <p className="mt-1 text-xs text-[#716C67]">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setToast((previous) => ({
                  ...previous,
                  show: false,
                }))
              }
              className="shrink-0 text-lg leading-none text-[#716C67] transition hover:text-[#252321]"
              aria-label="Close notification"
            >
              ×
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          PRODUCT
      ===================================================== */}

      <main className="mx-auto max-w-[1500px] px-5 pb-20 pt-8 md:px-10 lg:px-14">

        {/* =====================================================
            BREADCRUMBS
        ===================================================== */}

        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716C67]"
        >
          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="transition hover:text-[#6F4E37]"
          >
            HOME
          </button>

          <span className="text-[#D8D3CF]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="transition hover:text-[#6F4E37]"
          >
            SHOP
          </button>

          <span className="text-[#D8D3CF]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="max-w-[180px] truncate transition hover:text-[#6F4E37]"
            title={product.anime}
          >
            {product.anime}
          </button>

          <span className="text-[#D8D3CF]">
            /
          </span>

          <span
            className="max-w-[220px] truncate text-[#6F4E37] font-bold"
            title={product.name}
          >
            {product.name}
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] xl:gap-16">

          {/* =================================================
              LEFT IMAGE AREA
          ================================================= */}

          <section>

            <div className="grid grid-cols-[80px_1fr] gap-4 md:grid-cols-[95px_1fr] md:gap-6">

              {/* =================================================
                  THUMBNAILS
              ================================================= */}

              <div className="flex flex-col gap-3">

                {images.map(
                  (
                    image,
                    index
                  ) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`View product image ${index + 1}`}
                      onClick={() => {
                        setSelectedImage(
                          index
                        );

                        setIsImageHovered(
                          false
                        );
                      }}
                      className={`relative aspect-[0.78] overflow-hidden rounded-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] ${
                        selectedImage ===
                        index
                          ? "ring-2 ring-[#6F4E37] shadow-sm bg-white"
                          : "opacity-75 hover:opacity-100 bg-white/70"
                      }`}
                    >

                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />

                    </button>
                  )
                )}

              </div>

              {/* =================================================
                  MODERN HOVER ZOOM IMAGE
              ================================================= */}

              <div
                className="relative aspect-[0.82] max-h-[820px] cursor-crosshair overflow-hidden rounded-[24px] border border-transparent bg-white shadow-sm"
                onMouseEnter={
                  handleImageMouseEnter
                }
                onMouseMove={
                  handleImageMouseMove
                }
                onMouseLeave={
                  handleImageMouseLeave
                }
              >

                {images.length >
                0 ? (
                  <>

                    {/* NORMAL IMAGE */}

                    <img
                      src={
                        images[
                          selectedImage
                        ] ||
                        images[0]
                      }
                      alt={
                        product.name
                      }
                      fetchPriority="high"
                      decoding="async"
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
                        isImageHovered
                          ? "opacity-0"
                          : "opacity-100"
                      }`}
                      draggable="false"
                    />

                    {/* ZOOM IMAGE */}

                    <div
                      className={`absolute inset-0 bg-no-repeat transition-[opacity] duration-150 ${
                        isImageHovered
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                      style={{
                        backgroundImage: `url("${
                          images[
                            selectedImage
                          ] ||
                          images[0]
                        }")`,

                        backgroundSize:
                          "250% 250%",

                        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      }}
                    />

                    {/* ZOOM INDICATOR */}

                    {!isOutOfStock &&
                      !isImageHovered && (
                        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-[#211B18]/75 px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#E5E4E2] opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                          HOVER TO ZOOM
                        </div>
                      )}

                    {/* ZOOM LABEL */}

                    {isImageHovered &&
                      !isOutOfStock && (
                        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-[#211B18]/85 px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                          ZOOM ACTIVE
                        </div>
                      )}

                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase text-[#716C67]">
                    No Image
                  </div>
                )}

                {/* OUT OF STOCK */}

                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#211B18]/65">

                    <span className="rounded bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#252321] shadow-xs">
                      OUT OF STOCK
                    </span>

                  </div>
                )}

              </div>

            </div>

          </section>

          {/* =================================================
              RIGHT PRODUCT INFORMATION
          ================================================= */}

          <section className="lg:pt-1">

            {/* ANIME */}

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
              {product.anime}
            </p>

            {/* NAME */}

            <h1 className="mt-3 max-w-[520px] text-3xl font-normal font-serif uppercase leading-tight tracking-tight text-[#252321] md:text-5xl">
              {product.name}
            </h1>

            {/* PRODUCT CODE */}

            {product.productCode && (
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[#716C67]">

                PRODUCT REF:{" "}

                <span className="font-semibold text-[#252321]">
                  {product.productCode}
                </span>

              </p>
            )}

            {/* PRICE */}

            <div className="mt-6 flex items-center gap-3">

              <span className="text-2xl font-bold text-[#252321]">
                ₹
                {Number(
                  finalPrice
                ).toLocaleString(
                  "en-IN"
                )}
              </span>

              {hasDiscount && (
                <>

                  <span className="text-sm text-[#716C67] line-through">
                    ₹
                    {Number(
                      originalPrice
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span className="rounded-xs border border-[#CDC4DF] bg-[#E6E0F0] px-2.5 py-1 text-[9px] font-bold text-[#6F4E37]">
                    -{discountPercentage}%
                  </span>

                </>
              )}

            </div>

            {/* DESCRIPTION */}

            <p className="mt-6 max-w-[560px] text-xs leading-relaxed text-[#716C67]">
              {product.description}
            </p>

            <div className="mt-6" />

            {/* MATERIAL / FIT */}

            {(details.material ||
              details.fit) && (
              <div className="mt-6 grid grid-cols-2 gap-3">

                {details.material && (
                  <div className="rounded-[16px] border border-transparent bg-white/80 p-3.5 shadow-xs">

                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#716C67]">
                      MATERIAL
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase text-[#252321]">
                      {details.material}
                    </p>

                  </div>
                )}

                {details.fit && (
                  <div className="rounded-[16px] border border-transparent bg-white/80 p-3.5 shadow-xs">

                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#716C67]">
                      FIT
                    </p>

                    <p className="mt-1 text-xs font-semibold uppercase text-[#252321]">
                      {details.fit}
                    </p>

                  </div>
                )}

              </div>
            )}

            {/* SIZE */}

            {product.sizes?.length >
              0 && (
              <div className="mt-6">

                <div className="flex items-center justify-between">

                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#252321]">
                    SELECT SIZE
                  </p>

                  <button
                    type="button"
                    className="text-[9px] uppercase tracking-[0.1em] text-[#6F4E37] underline underline-offset-4"
                  >
                    SIZE GUIDE
                  </button>

                </div>

                <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">

                  {product.sizes.map(
                    (size) => {
                      const available =
                        isSizeAvailable(
                          size
                        );

                      return (
                        <button
                          key={size}
                          type="button"
                          aria-label={`Size ${size}${!available ? " out of stock" : ""}`}
                          aria-pressed={selectedSize === size}
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleSizeChange(
                              size
                            )
                          }
                          className={`h-10 rounded border text-[10px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] ${
                            selectedSize ===
                            size
                              ? "border-[#6F4E37] bg-[#6F4E37] text-white shadow-xs"
                              : available
                              ? "border-[#E5E4E2] bg-white text-[#252321] hover:border-[#6F4E37] hover:text-[#6F4E37]"
                              : "cursor-not-allowed border-[#E5E4E2] bg-[#FAF9F7] text-[#716C67]/40"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}

            {/* COLOR */}

            {product.colors?.length >
              0 && (
              <div className="mt-6">

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#252321]">
                  SELECT COLOR
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  {product.colors.map(
                    (color) => {
                      const available =
                        isColorAvailable(
                          color
                        );

                      return (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Color ${color}${!available ? " out of stock" : ""}`}
                          aria-pressed={selectedColor === color}
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleColorChange(
                              color
                            )
                          }
                          className={`min-w-[70px] rounded border px-3.5 py-2.5 text-[10px] font-bold uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F4E37] ${
                            selectedColor ===
                            color
                              ? "border-[#6F4E37] bg-[#6F4E37] text-white shadow-xs"
                              : available
                              ? "border-[#E5E4E2] bg-white text-[#252321] hover:border-[#6F4E37] hover:text-[#6F4E37]"
                              : "cursor-not-allowed border-[#E5E4E2] bg-[#FAF9F7] text-[#716C67]/40"
                          }`}
                        >
                          {color}
                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            )}

            {/* STOCK */}

            <div className="mt-6">

              {isOutOfStock ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-600">
                  Currently Out Of Stock
                </p>
              ) : selectedVariant ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#716C67]">

                  {availableStock <=
                  5
                    ? `Only ${availableStock} left in stock`
                    : "In Stock & Ready To Ship"}

                </p>
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6F4E37]">
                  Please select size and color
                </p>
              )}

            </div>

            {/* QUANTITY */}

            {!isOutOfStock && (
              <div className="mt-6">

                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#252321]">
                  QUANTITY
                </p>

                <div className="flex w-fit items-center rounded-full border border-transparent bg-white px-2 py-1 shadow-xs">

                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={
                      decreaseQuantity
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full text-base text-[#252321] transition hover:bg-[#F4F0F7] focus-visible:outline-none"
                  >
                    −
                  </button>

                  <span className="flex h-9 w-10 items-center justify-center text-xs font-bold text-[#252321]" aria-live="polite">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={
                      increaseQuantity
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full text-base text-[#252321] transition hover:bg-[#F4F0F7] focus-visible:outline-none"
                  >
                    +
                  </button>

                </div>

              </div>
            )}

            {/* ACTION BUTTONS */}

            <div className="mt-7 grid grid-cols-[1fr_54px] gap-3">

              <button
                type="button"
                disabled={
                  isOutOfStock ||
                  !selectedVariant
                }
                onClick={
                  addToCart
                }
                className="h-12 rounded-full bg-[#6F4E37] text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-md transition hover:bg-[#5B3F2C] disabled:cursor-not-allowed disabled:bg-[#D8D3CF] disabled:text-[#716C67]"
              >
                ADD TO CART
              </button>

              <button
                type="button"
                aria-label={
                  isWishlisted
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                disabled={
                  wishlistLoading
                }
                onClick={
                  handleWishlistToggle
                }
                className={`flex h-12 w-12 items-center justify-center rounded-full border border-transparent text-xl shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isWishlisted
                    ? "bg-[#E6E0F0] text-[#6F4E37]"
                    : "bg-white text-[#252321] hover:bg-[#E6E0F0] hover:text-[#6F4E37]"
                }`}
              >
                {isWishlisted
                  ? "♥"
                  : "♡"}
              </button>

            </div>

            {/* BUY NOW */}

            <button
              type="button"
              disabled={
                isOutOfStock ||
                !selectedVariant
              }
              onClick={
                buyNow
              }
              className="mt-3 h-12 w-full rounded-full border-2 border-[#6F4E37] bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] text-[#6F4E37] transition hover:bg-[#6F4E37] hover:text-white disabled:cursor-not-allowed disabled:border-[#D8D3CF] disabled:text-[#716C67]"
            >
              BUY IT NOW
            </button>

            {/* =================================================
                ACCORDIONS
            ================================================= */}

            <div className="mt-8 space-y-3">

              {/* PRODUCT DETAILS */}

              <div className="rounded-[16px] border border-transparent bg-white/80 p-4 transition shadow-xs hover:bg-white">

                <button
                  type="button"
                  aria-expanded={openSection === "description"}
                  aria-controls="accordion-section-description"
                  onClick={() =>
                    toggleSection(
                      "description"
                    )
                  }
                  className="flex w-full items-center justify-between text-left focus-visible:outline-none"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321]">
                    PRODUCT DETAILS
                  </span>

                  <span className="text-base text-[#716C67]">
                    {openSection ===
                    "description"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "description" && (
                  <div id="accordion-section-description" className="pt-3 text-xs leading-relaxed text-[#716C67]">
                    {details.productDetails ||
                      product.description}
                  </div>
                )}

              </div>

              {/* HIGHLIGHTS */}

              {highlights.length >
                0 && (
                <div className="rounded-[16px] border border-transparent bg-white/80 p-4 transition shadow-xs hover:bg-white">

                  <button
                    type="button"
                    onClick={() =>
                      toggleSection(
                        "highlights"
                      )
                    }
                    className="flex w-full items-center justify-between text-left focus-visible:outline-none"
                  >

                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321]">
                      HIGHLIGHTS
                    </span>

                    <span className="text-base text-[#716C67]">
                      {openSection ===
                      "highlights"
                        ? "−"
                        : "+"}
                    </span>

                  </button>

                  {openSection ===
                    "highlights" && (
                    <ul className="space-y-2.5 pt-3">

                      {highlights.map(
                        (
                          highlight,
                          index
                        ) => (
                          <li
                            key={`${highlight}-${index}`}
                            className="flex items-start gap-2.5 text-xs leading-relaxed text-[#716C67]"
                          >

                            <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#6F4E37]" />

                            <span>
                              {
                                highlight
                              }
                            </span>

                          </li>
                        )
                      )}

                    </ul>
                  )}

                </div>
              )}

              {/* SHIPPING */}

              <div className="rounded-[16px] border border-transparent bg-white/80 p-4 transition shadow-xs hover:bg-white">

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      "shipping"
                    )
                  }
                  className="flex w-full items-center justify-between text-left focus-visible:outline-none"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321]">
                    SHIPPING & RETURNS
                  </span>

                  <span className="text-base text-[#716C67]">
                    {openSection ===
                    "shipping"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "shipping" && (
                  <div className="space-y-3 pt-3">

                    {details.shippingInfo && (
                      <div>

                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#252321]">
                          SHIPPING
                        </p>

                        <p className="text-xs leading-relaxed text-[#716C67]">
                          {
                            details.shippingInfo
                          }
                        </p>

                      </div>
                    )}

                    {details.returnInfo && (
                      <div>

                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#252321]">
                          RETURNS
                        </p>

                        <p className="text-xs leading-relaxed text-[#716C67]">
                          {
                            details.returnInfo
                          }
                        </p>

                      </div>
                    )}

                    {!details.shippingInfo &&
                      !details.returnInfo && (
                        <p className="text-xs leading-relaxed text-[#716C67]">
                          Standard tracked delivery in 3–5 business days. Free returns within 7 days.
                        </p>
                      )}

                  </div>
                )}

              </div>

              {/* CARE */}

              <div className="rounded-[16px] border border-transparent bg-white/80 p-4 transition shadow-xs hover:bg-white">

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      "care"
                    )
                  }
                  className="flex w-full items-center justify-between text-left focus-visible:outline-none"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#252321]">
                    CARE INSTRUCTIONS
                  </span>

                  <span className="text-base text-[#716C67]">
                    {openSection ===
                    "care"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "care" && (
                  <div className="pt-3 text-xs leading-relaxed text-[#716C67]">

                    {details.careInstructions ||
                      "Cold delicate machine wash inside-out. Do not tumble dry. Low iron on reverse."}

                  </div>
                )}

              </div>

            </div>

          </section>

        </div>

      </main>

      {/* =====================================================
          RATINGS & REVIEWS
      ===================================================== */}

      <ReviewSection
        productId={product._id}
      />

      {/* =====================================================
          GETSUKA EXPERIENCE
      ===================================================== */}

      <section className="border-y border-[#6F4E37]/20 bg-[#211B18] text-white">

        <div className="mx-auto max-w-[1500px] px-6 py-16 md:px-10 lg:px-14">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#E6E0F0]">
                ATELIER STANDARDS
              </p>

              <h2 className="mt-2 text-2xl md:text-3xl font-normal font-serif uppercase tracking-tight text-white">
                THE GETSUKA EXPERIENCE
              </h2>

            </div>

          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">

            {[
              {
                title:
                  "CURATED ART",
                text:
                  "Original anime graphics reproduced with museum-grade screenprint inks.",
              },
              {
                title:
                  "HEAVYWEIGHT COTTON",
                text:
                  "Custom milled 260+ GSM pre-shrunk cotton for enduring drape and structure.",
              },
              {
                title:
                  "ETHICAL CRAFT",
                text:
                  "Consciously tailored with reinforced double-needle collars and side-seams.",
              },
            ].map(
              (item) => (
                <div
                  key={
                    item.title
                  }
                  className="rounded-md border border-[#6F4E37]/30 bg-[#29221F] p-7 shadow-xs"
                >

                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E6E0F0]">
                    {item.title}
                  </p>

                  <p className="mt-4 text-xs leading-relaxed text-[#E5E4E2]/80">
                    {item.text}
                  </p>

                  <p className="mt-6 text-sm text-[#6F4E37]">
                    ✦
                  </p>

                </div>
              )
            )}

          </div>

        </div>

      </section>

      {/* =====================================================
          RELATED PRODUCTS
      ===================================================== */}

      <section className="mx-auto max-w-[1500px] px-6 py-16 md:px-10 lg:px-14">

        <div className="flex items-end justify-between pb-6">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6F4E37]">
              RECOMMENDED CAPSULE
            </p>

            <h2 className="mt-2 text-2xl font-normal font-serif uppercase text-[#252321]">
              YOU MAY ALSO LIKE
            </h2>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6F4E37] transition hover:text-[#5B3F2C]"
          >
            VIEW ALL →
          </button>

        </div>

        {relatedLoading ? (
          <div className="mt-8 rounded-[20px] border border-transparent bg-white p-10 text-center shadow-xs">

            <p className="text-[10px] uppercase tracking-[0.15em] text-[#716C67]">
              Loading related products...
            </p>

          </div>
        ) : relatedProducts.length >
          0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">

            {relatedProducts.map(
              (item) => (
                <button
                  key={
                    item._id
                  }
                  type="button"
                  onClick={() =>
                    openRelatedProduct(
                      item._id
                    )
                  }
                  className="group rounded-[20px] border border-transparent bg-white p-3 text-left transition-all duration-300 hover:border-[#E5E4E2] hover:shadow-[0_16px_35px_rgba(111,78,55,0.08)] hover:-translate-y-1"
                >

                  <div className="relative aspect-[0.8] overflow-hidden rounded-[16px] bg-[#F4F0F7]">

                    {item.images?.[0] ? (
                      <img
                        src={
                          item.images[0]
                        }
                        alt={
                          item.name
                        }
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] uppercase text-[#716C67]">
                        No Image
                      </div>
                    )}

                    {item.stockStatus ===
                      "OUT_OF_STOCK" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#211B18]/60">

                        <span className="rounded bg-white px-3 py-1.5 text-[8px] font-bold uppercase text-[#252321]">
                          OUT OF STOCK
                        </span>

                      </div>
                    )}

                  </div>

                  <div className="pt-3 px-1 pb-1">

                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#6F4E37]">
                      {
                        item.anime
                      }
                    </p>

                    <h3 className="mt-1 text-xs font-semibold uppercase text-[#252321] transition group-hover:text-[#6F4E37] truncate">
                      {
                        item.name
                      }
                    </h3>

                    <p className="mt-1.5 text-xs font-bold text-[#252321]">
                      ₹
                      {Number(
                        item.salePrice ??
                          item.price ??
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </p>

                  </div>

                </button>
              )
            )}

          </div>
        ) : (
          <div className="mt-8 rounded-md border border-[#E5E4E2] bg-white p-10 text-center shadow-xs">

            <p className="text-xs text-[#716C67]">
              More archival pieces coming soon.
            </p>

          </div>
        )}

      </section>

    </div>
  );
};

export default ProductDetailsPage;