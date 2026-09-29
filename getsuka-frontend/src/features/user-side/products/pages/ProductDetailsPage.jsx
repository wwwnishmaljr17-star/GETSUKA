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
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token");

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

    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token");

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

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update wishlist."
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

      await loadWishlistStatus(
        currentProduct._id
      );

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
      alert(
        "This product is no longer available."
      );

      return false;
    }

    if (!selectedSize) {
      alert(
        "Please select a size."
      );

      return false;
    }

    if (!selectedColor) {
      alert(
        "Please select a color."
      );

      return false;
    }

    if (!selectedVariant) {
      alert(
        "This size and color combination is unavailable."
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
          alert(
            `Only ${selectedVariant.stock} item${
              Number(
                selectedVariant.stock
              ) > 1
                ? "s"
                : ""
            } available in stock.`
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

      alert(
        "Added to cart."
      );

      return true;
    } catch (error) {
      console.error(
        "ADD TO CART ERROR:",
        error
      );

      alert(
        "Unable to add product to cart."
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#333] border-t-[#e9002d]" />

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-[#777]">
            Loading product...
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
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">

        <div className="max-w-md text-center">

          <p className="text-2xl font-bold uppercase">
            Product Not Found
          </p>

          <p className="mt-4 text-sm text-[#777]">
            {error ||
              "This product could not be found."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="mt-8 bg-[#e9002d] px-8 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black"
          >
            BACK TO SHOP
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
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          PRODUCT
      ===================================================== */}

      <main className="mx-auto max-w-[1500px] px-5 pb-20 pt-8 md:px-10 lg:px-14">

        {/* =====================================================
            BREADCRUMBS
        ===================================================== */}

        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#666]"
        >
          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="transition hover:text-white"
          >
            HOME
          </button>

          <span className="text-[#333]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="transition hover:text-white"
          >
            SHOP
          </button>

          <span className="text-[#333]">
            /
          </span>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="max-w-[180px] truncate transition hover:text-white"
            title={product.anime}
          >
            {product.anime}
          </button>

          <span className="text-[#333]">
            /
          </span>

          <span
            className="max-w-[220px] truncate text-[#e9002d]"
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

            <div className="grid grid-cols-[80px_1fr] gap-5 md:grid-cols-[95px_1fr]">

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
                      onClick={() => {
                        setSelectedImage(
                          index
                        );

                        setIsImageHovered(
                          false
                        );
                      }}
                      className={`relative aspect-[0.78] overflow-hidden border transition ${
                        selectedImage ===
                        index
                          ? "border-[#e9002d]"
                          : "border-[#292929] hover:border-[#777]"
                      }`}
                    >

                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
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
                className="relative aspect-[0.82] max-h-[820px] cursor-crosshair overflow-hidden bg-[#090909]"
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
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${
                        isImageHovered
                          ? "opacity-0"
                          : "opacity-100"
                      }`}
                      draggable="false"
                    />

                    {/* =================================================
                        ZOOM IMAGE

                        The image becomes 2.5x larger.
                        background-position follows
                        the exact mouse position.
                    ================================================= */}

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

                    {/* =================================================
                        SMALL ZOOM INDICATOR
                    ================================================= */}

                    {!isOutOfStock &&
                      !isImageHovered && (
                        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/75 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                          MOVE TO ZOOM
                        </div>
                      )}

                    {/* =================================================
                        ZOOM LABEL
                    ================================================= */}

                    {isImageHovered &&
                      !isOutOfStock && (
                        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/80 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                          ZOOM
                        </div>
                      )}

                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm uppercase text-[#555]">
                    No Image
                  </div>
                )}

                {/* OUT OF STOCK */}

                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">

                    <span className="bg-white px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
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

          <section className="lg:pt-2">

            {/* ANIME */}

            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#e9002d]">
              {product.anime}
            </p>

            {/* NAME */}

            <h1 className="mt-4 max-w-[520px] text-4xl font-bold uppercase leading-[0.95] tracking-[-0.04em] md:text-5xl">
              {product.name}
            </h1>

            {/* PRODUCT CODE */}

            {product.productCode && (
              <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[#666]">

                PRODUCT CODE:{" "}

                <span className="text-[#aaa]">
                  {product.productCode}
                </span>

              </p>
            )}

            {/* PRICE */}

            <div className="mt-7 flex items-center gap-4">

              <span className="text-xl font-bold">
                ₹
                {Number(
                  finalPrice
                ).toLocaleString(
                  "en-IN"
                )}
              </span>

              {hasDiscount && (
                <>

                  <span className="text-sm text-[#666] line-through">
                    ₹
                    {Number(
                      originalPrice
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>

                  <span className="bg-[#e9002d] px-2 py-1 text-[9px] font-bold text-white">
                    -{discountPercentage}%
                  </span>

                </>
              )}

            </div>

            {/* DESCRIPTION */}

            <p className="mt-7 max-w-[560px] text-sm leading-7 text-[#999]">
              {product.description}
            </p>

            <div className="mt-8 border-t border-[#292929]" />

            {/* MATERIAL / FIT */}

            {(details.material ||
              details.fit) && (
              <div className="mt-7 grid grid-cols-2 gap-4">

                {details.material && (
                  <div className="border border-[#222] bg-[#080808] p-4">

                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#666]">
                      MATERIAL
                    </p>

                    <p className="mt-2 text-[10px] uppercase text-[#ccc]">
                      {details.material}
                    </p>

                  </div>
                )}

                {details.fit && (
                  <div className="border border-[#222] bg-[#080808] p-4">

                    <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#666]">
                      FIT
                    </p>

                    <p className="mt-2 text-[10px] uppercase text-[#ccc]">
                      {details.fit}
                    </p>

                  </div>
                )}

              </div>
            )}

            {/* SIZE */}

            {product.sizes?.length >
              0 && (
              <div className="mt-7">

                <div className="flex items-center justify-between">

                  <p className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    SIZE
                  </p>

                  <button
                    type="button"
                    className="text-[9px] uppercase tracking-[0.1em] text-[#777] underline underline-offset-4"
                  >
                    SIZE GUIDE
                  </button>

                </div>

                <div className="mt-4 grid grid-cols-6 gap-2">

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
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleSizeChange(
                              size
                            )
                          }
                          className={`h-11 border text-[10px] font-bold uppercase transition ${
                            selectedSize ===
                            size
                              ? "border-[#e9002d] bg-[#e9002d] text-white"
                              : available
                              ? "border-[#333] bg-[#111] text-white hover:border-white"
                              : "cursor-not-allowed border-[#1d1d1d] bg-[#080808] text-[#444]"
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
              <div className="mt-7">

                <p className="text-[10px] font-bold uppercase tracking-[0.15em]">
                  COLOR
                </p>

                <div className="mt-4 flex flex-wrap gap-2">

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
                          disabled={
                            !available
                          }
                          onClick={() =>
                            handleColorChange(
                              color
                            )
                          }
                          className={`min-w-[75px] border px-4 py-3 text-[9px] font-bold uppercase transition ${
                            selectedColor ===
                            color
                              ? "border-[#e9002d] bg-[#e9002d] text-white"
                              : available
                              ? "border-[#333] bg-[#111] text-[#aaa] hover:border-white hover:text-white"
                              : "cursor-not-allowed border-[#1d1d1d] text-[#444]"
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

            <div className="mt-7">

              {isOutOfStock ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e9002d]">
                  Currently Out Of Stock
                </p>
              ) : selectedVariant ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#999]">

                  {availableStock <=
                  5
                    ? `Only ${availableStock} left in stock`
                    : "In Stock"}

                </p>
              ) : (
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e9002d]">
                  Select size and color
                </p>
              )}

            </div>

            {/* QUANTITY */}

            {!isOutOfStock && (
              <div className="mt-7">

                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em]">
                  QUANTITY
                </p>

                <div className="flex w-fit items-center border border-[#333]">

                  <button
                    type="button"
                    onClick={
                      decreaseQuantity
                    }
                    className="flex h-11 w-11 items-center justify-center text-lg text-[#999] transition hover:bg-white hover:text-black"
                  >
                    −
                  </button>

                  <span className="flex h-11 w-12 items-center justify-center border-x border-[#333] text-sm font-bold">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={
                      increaseQuantity
                    }
                    className="flex h-11 w-11 items-center justify-center text-lg text-[#999] transition hover:bg-white hover:text-black"
                  >
                    +
                  </button>

                </div>

              </div>
            )}

            {/* ACTION BUTTONS */}

            <div className="mt-7 grid grid-cols-[1fr_52px] gap-2">

              <button
                type="button"
                disabled={
                  isOutOfStock ||
                  !selectedVariant
                }
                onClick={
                  addToCart
                }
                className="h-14 bg-[#e9002d] text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:bg-[#222] disabled:text-[#555]"
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
                className={`flex h-14 items-center justify-center border text-2xl transition hover:border-[#e9002d] hover:text-[#e9002d] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isWishlisted
                    ? "border-[#e9002d] text-[#e9002d]"
                    : "border-[#333] text-white"
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
              className="mt-2 h-14 w-full border border-white text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
            >
              BUY IT NOW
            </button>

            {/* =================================================
                ACCORDIONS
            ================================================= */}

            <div className="mt-9 border-t border-[#292929]">

              {/* PRODUCT DETAILS */}

              <div className="border-b border-[#292929]">

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      "description"
                    )
                  }
                  className="flex w-full items-center justify-between py-5 text-left"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    PRODUCT DETAILS
                  </span>

                  <span className="text-lg text-[#777]">
                    {openSection ===
                    "description"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "description" && (
                  <div className="pb-5 text-xs leading-6 text-[#777]">
                    {details.productDetails ||
                      product.description}
                  </div>
                )}

              </div>

              {/* HIGHLIGHTS */}

              {highlights.length >
                0 && (
                <div className="border-b border-[#292929]">

                  <button
                    type="button"
                    onClick={() =>
                      toggleSection(
                        "highlights"
                      )
                    }
                    className="flex w-full items-center justify-between py-5 text-left"
                  >

                    <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                      HIGHLIGHTS
                    </span>

                    <span className="text-lg text-[#777]">
                      {openSection ===
                      "highlights"
                        ? "−"
                        : "+"}
                    </span>

                  </button>

                  {openSection ===
                    "highlights" && (
                    <ul className="space-y-3 pb-5">

                      {highlights.map(
                        (
                          highlight,
                          index
                        ) => (
                          <li
                            key={`${highlight}-${index}`}
                            className="flex items-start gap-3 text-xs leading-6 text-[#777]"
                          >

                            <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-[#e9002d]" />

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

              <div className="border-b border-[#292929]">

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      "shipping"
                    )
                  }
                  className="flex w-full items-center justify-between py-5 text-left"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    SHIPPING & RETURNS
                  </span>

                  <span className="text-lg text-[#777]">
                    {openSection ===
                    "shipping"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "shipping" && (
                  <div className="space-y-5 pb-5">

                    {details.shippingInfo && (
                      <div>

                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                          SHIPPING
                        </p>

                        <p className="text-xs leading-6 text-[#777]">
                          {
                            details.shippingInfo
                          }
                        </p>

                      </div>
                    )}

                    {details.returnInfo && (
                      <div>

                        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                          RETURNS
                        </p>

                        <p className="text-xs leading-6 text-[#777]">
                          {
                            details.returnInfo
                          }
                        </p>

                      </div>
                    )}

                    {!details.shippingInfo &&
                      !details.returnInfo && (
                        <p className="text-xs leading-6 text-[#777]">
                          Shipping and return information is currently unavailable.
                        </p>
                      )}

                  </div>
                )}

              </div>

              {/* CARE */}

              <div className="border-b border-[#292929]">

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(
                      "care"
                    )
                  }
                  className="flex w-full items-center justify-between py-5 text-left"
                >

                  <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                    CARE INSTRUCTIONS
                  </span>

                  <span className="text-lg text-[#777]">
                    {openSection ===
                    "care"
                      ? "−"
                      : "+"}
                  </span>

                </button>

                {openSection ===
                  "care" && (
                  <div className="pb-5 text-xs leading-6 text-[#777]">

                    {details.careInstructions ||
                      "Care instructions are currently unavailable."}

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

      <section className="border-y border-[#222] bg-[#080808]">

        <div className="mx-auto max-w-[1500px] px-6 py-16 md:px-10 lg:px-14">

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#e9002d]">
                WHY GETSUKA
              </p>

              <h2 className="mt-3 text-3xl font-bold uppercase tracking-[-0.03em]">
                THE GETSUKA EXPERIENCE
              </h2>

            </div>

          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">

            {[
              {
                title:
                  "PREMIUM",
                text:
                  "Premium anime-inspired fashion designed with attention to detail.",
              },
              {
                title:
                  "ORIGINAL",
                text:
                  "Unique GETSUKA designs created for modern anime culture.",
              },
              {
                title:
                  "QUALITY",
                text:
                  "Focused on quality materials, fit and everyday comfort.",
              },
            ].map(
              (item) => (
                <div
                  key={
                    item.title
                  }
                  className="border border-[#222] bg-black p-7"
                >

                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e9002d]">
                    {item.title}
                  </p>

                  <p className="mt-5 text-xs leading-6 text-[#777]">
                    {item.text}
                  </p>

                  <p className="mt-7 text-lg">
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

        <div className="flex items-end justify-between">

          <div>

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#e9002d]">
              DISCOVER MORE
            </p>

            <h2 className="mt-3 text-2xl font-bold uppercase">
              YOU MAY ALSO LIKE
            </h2>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/shop")
            }
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777] transition hover:text-white"
          >
            VIEW ALL →
          </button>

        </div>

        {relatedLoading ? (
          <div className="mt-9 border border-[#222] bg-[#080808] p-10 text-center">

            <p className="text-[10px] uppercase tracking-[0.15em] text-[#555]">
              Loading related products...
            </p>

          </div>
        ) : relatedProducts.length >
          0 ? (
          <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">

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
                  className="group text-left"
                >

                  <div className="relative aspect-[0.8] overflow-hidden bg-[#0a0a0a]">

                    {item.images?.[0] ? (
                      <img
                        src={
                          item.images[0]
                        }
                        alt={
                          item.name
                        }
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] uppercase text-[#555]">
                        No Image
                      </div>
                    )}

                    {item.stockStatus ===
                      "OUT_OF_STOCK" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">

                        <span className="bg-white px-3 py-2 text-[8px] font-bold uppercase text-black">
                          OUT OF STOCK
                        </span>

                      </div>
                    )}

                  </div>

                  <div className="pt-4">

                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#e9002d]">
                      {
                        item.anime
                      }
                    </p>

                    <h3 className="mt-2 text-[11px] font-bold uppercase text-white">
                      {
                        item.name
                      }
                    </h3>

                    <p className="mt-2 text-[11px] font-semibold">
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
          <div className="mt-9 border border-[#222] bg-[#080808] p-10 text-center">

            <p className="text-[10px] uppercase tracking-[0.15em] text-[#555]">
              More products coming soon.
            </p>

          </div>
        )}

      </section>

    </div>
  );
};

export default ProductDetailsPage;