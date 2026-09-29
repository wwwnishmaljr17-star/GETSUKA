import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import wishlistApi from "../api/wishlistApi";

const WishlistPage = () => {
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [notification, setNotification] =
    useState(null);

  const [addingProductId, setAddingProductId] =
    useState(null);

  // =========================================================
  // LOAD WISHLIST
  // =========================================================

  const loadWishlist = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await wishlistApi.getWishlist();

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to load wishlist."
        );
      }

      setWishlist(
        Array.isArray(response.wishlist)
          ? response.wishlist
          : []
      );
    } catch (err) {
      console.error(
        "WISHLIST LOAD ERROR:",
        err
      );

      setWishlist([]);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load wishlist."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  // =========================================================
  // NOTIFICATION
  // =========================================================

  const showNotification = (
    title,
    message,
    type = "success"
  ) => {
    setNotification({
      title,
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // =========================================================
  // REMOVE FROM WISHLIST
  // =========================================================

  const handleRemove = async (
    productId
  ) => {
    if (!productId) {
      return;
    }

    try {
      const response =
        await wishlistApi.removeFromWishlist(
          productId
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to remove product from wishlist."
        );
      }

      setWishlist((previous) =>
        previous.filter(
          (item) =>
            item.product?._id !==
            productId
        )
      );

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );

      showNotification(
        "WISHLIST UPDATED",
        "Product removed from your wishlist."
      );
    } catch (err) {
      console.error(
        "WISHLIST REMOVE ERROR:",
        err
      );

      showNotification(
        "REMOVE FAILED",
        err?.response?.data?.message ||
          err?.message ||
          "Failed to remove product.",
        "error"
      );
    }
  };

  // =========================================================
  // PRODUCT IMAGE
  // =========================================================

  const getProductImage = (
    product
  ) => {
    if (
      Array.isArray(
        product?.images
      ) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    return "";
  };

  // =========================================================
  // PRODUCT PRICE
  // =========================================================

  const getProductPrice = (
    product
  ) => {
    return (
      product?.finalPrice ??
      product?.salePrice ??
      product?.price ??
      0
    );
  };

  // =========================================================
  // STOCK
  // =========================================================

  const isOutOfStock = (
    product
  ) => {
    return (
      product?.stockStatus ===
        "OUT_OF_STOCK" ||
      product?.isListed === false ||
      product?.isDeleted === true
    );
  };

  // =========================================================
  // GET FIRST AVAILABLE VARIANT
  // =========================================================

  const getAvailableVariant = (
    product
  ) => {
    /*
      IMPORTANT:
      Wishlist API returns the actual product variants
      inside product.variants.

      Product Details creates/uses availableVariants,
      but Wishlist does not.
    */

    if (
      !Array.isArray(
        product?.variants
      )
    ) {
      return null;
    }

    return (
      product.variants.find(
        (variant) =>
          Number(
            variant?.stock
          ) > 0
      ) || null
    );
  };

  // =========================================================
  // ADD TO CART
  // =========================================================

  const handleAddToCart = async (
    product
  ) => {
    if (
      !product?._id ||
      addingProductId
    ) {
      return;
    }

    // -------------------------------------------------------
    // STOCK CHECK
    // -------------------------------------------------------

    if (isOutOfStock(product)) {
      showNotification(
        "UNAVAILABLE",
        "This product is currently unavailable.",
        "error"
      );

      return;
    }

    // -------------------------------------------------------
    // FIND AVAILABLE VARIANT
    // -------------------------------------------------------

    const variant =
      getAvailableVariant(
        product
      );

    if (!variant) {
      showNotification(
        "OUT OF STOCK",
        "This product is currently out of stock.",
        "error"
      );

      return;
    }

    try {
      setAddingProductId(
        product._id
      );

      // -----------------------------------------------------
      // GET EXISTING CART
      // -----------------------------------------------------

      const savedCart =
        localStorage.getItem(
          "getsukaCart"
        );

      let currentCart = [];

      try {
        currentCart = savedCart
          ? JSON.parse(
              savedCart
            )
          : [];
      } catch {
        currentCart = [];
      }

      if (
        !Array.isArray(
          currentCart
        )
      ) {
        currentCart = [];
      }

      // -----------------------------------------------------
      // CHECK EXISTING PRODUCT + VARIANT
      // -----------------------------------------------------

      const existingIndex =
        currentCart.findIndex(
          (item) =>
            item.productId ===
              product._id &&
            item.variantId ===
              variant._id
        );

      if (
        existingIndex !== -1
      ) {
        const existingItem =
          currentCart[
            existingIndex
          ];

        const currentQuantity =
          Number(
            existingItem.quantity ||
              0
          );

        const stock =
          Number(
            variant.stock || 0
          );

        const newQuantity =
          currentQuantity + 1;

        // ---------------------------------------------------
        // STOCK VALIDATION
        // ---------------------------------------------------

        if (
          newQuantity >
          stock
        ) {
          showNotification(
            "STOCK LIMIT",
            `Only ${stock} item${
              stock > 1
                ? "s"
                : ""
            } available in stock.`,
            "error"
          );

          return;
        }

        currentCart[
          existingIndex
        ] = {
          ...existingItem,
          quantity:
            newQuantity,
          maxStock: stock,
        };
      } else {
        // ---------------------------------------------------
        // ADD NEW CART ITEM
        // ---------------------------------------------------

        currentCart.push({
          productId:
            product._id,

          variantId:
            variant._id,

          name:
            product.name,

          anime:
            product.anime,

          image:
            getProductImage(
              product
            ),

          price:
            getProductPrice(
              product
            ),

          quantity: 1,

          size:
            variant.size,

          color:
            variant.color,

          sku:
            variant.sku,

          maxStock:
            Number(
              variant.stock || 0
            ),
        });
      }

      // -----------------------------------------------------
      // SAVE CART
      // -----------------------------------------------------

      localStorage.setItem(
        "getsukaCart",
        JSON.stringify(
          currentCart
        )
      );

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      // -----------------------------------------------------
      // REMOVE FROM WISHLIST
      // -----------------------------------------------------

      const response =
        await wishlistApi.removeFromWishlist(
          product._id
        );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Product was added to cart but could not be removed from wishlist."
        );
      }

      // -----------------------------------------------------
      // UPDATE WISHLIST UI
      // -----------------------------------------------------

      setWishlist((previous) =>
        previous.filter(
          (item) =>
            item.product?._id !==
            product._id
        )
      );

      window.dispatchEvent(
        new Event("wishlistUpdated")
      );

      // -----------------------------------------------------
      // SUCCESS MESSAGE
      // -----------------------------------------------------

      showNotification(
        "ADDED TO CART",
        `${product.name} has been added to your cart.`
      );
    } catch (err) {
      console.error(
        "WISHLIST ADD TO CART ERROR:",
        err
      );

      showNotification(
        "ADD TO CART FAILED",
        err?.response?.data?.message ||
          err?.message ||
          "Unable to add product to cart.",
        "error"
      );
    } finally {
      setAddingProductId(null);
    }
  };

  // =========================================================
  // OPEN PRODUCT
  // =========================================================

  const openProduct = (
    productId
  ) => {
    if (!productId) {
      return;
    }

    navigate(
      `/products/${productId}`
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#333] border-t-[#e9002d]" />

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#777]">
              Loading wishlist...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          NOTIFICATION
          ===================================================== */}

      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[380px] max-w-[calc(100vw-40px)]">

          <div
            className={`border bg-black p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] ${
              notification.type ===
              "error"
                ? "border-[#e9002d]"
                : "border-[#333]"
            }`}
          >

            <div className="flex items-start gap-4">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
                  notification.type ===
                  "error"
                    ? "border-[#e9002d] text-[#e9002d]"
                    : "border-[#444] text-white"
                }`}
              >
                {notification.type ===
                "error" ? (
                  <span className="text-sm font-bold">
                    !
                  </span>
                ) : (
                  <span className="text-sm font-bold">
                    ✓
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e9002d]">
                  {
                    notification.title
                  }
                </p>

                <p className="mt-2 text-xs leading-5 text-[#bbb]">
                  {
                    notification.message
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setNotification(
                    null
                  )
                }
                className="text-lg leading-none text-[#555] transition hover:text-white"
              >
                ×
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="border-b border-[#222] bg-black">

        <div className="mx-auto max-w-[1500px] px-6 pb-14 pt-14 md:px-10 lg:px-14">

          <div className="text-center">

            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#e9002d]">
              GETSUKA
            </p>

            <h1 className="mt-5 text-5xl font-bold uppercase tracking-[-0.05em] text-white md:text-7xl">
              WISHLIST
            </h1>

            <p className="mx-auto mt-6 max-w-[600px] text-sm leading-6 text-[#999]">
              Your saved GETSUKA
              pieces. Keep the ones
              you love close.
            </p>

            <div className="mx-auto mt-8 inline-flex border border-[#333] bg-black px-6 py-3 text-[10px] font-bold tracking-[0.18em] text-white">
              {wishlist.length}{" "}
              {wishlist.length ===
              1
                ? "ITEM"
                : "ITEMS"}
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          CONTENT
          ===================================================== */}

      <main className="mx-auto max-w-[1500px] px-6 py-12 md:px-10 lg:px-14">

        {/* ERROR */}

        {error && (
          <div className="mb-8 border border-[#333] bg-black p-5">

            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#e9002d]">
              {error}
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!error &&
          wishlist.length ===
            0 && (
            <div className="flex min-h-[450px] items-center justify-center border border-[#222] bg-black">

              <div className="text-center">

                <div className="text-6xl text-[#333]">
                  ♡
                </div>

                <h2 className="mt-6 text-2xl font-bold uppercase text-white">
                  Your Wishlist
                  Is Empty
                </h2>

                <p className="mt-3 text-sm text-[#777]">
                  Save products
                  you love and
                  find them here.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/shop"
                    )
                  }
                  className="mt-8 bg-[#e9002d] px-8 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
                >
                  SHOP NOW
                </button>

              </div>

            </div>
          )}

        {/* =====================================================
            WISHLIST GRID
            ===================================================== */}

        {!error &&
          wishlist.length >
            0 && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 xl:grid-cols-4">

              {wishlist.map(
                (item) => {
                  const product =
                    item.product;

                  if (!product) {
                    return null;
                  }

                  const image =
                    getProductImage(
                      product
                    );

                  const price =
                    getProductPrice(
                      product
                    );

                  const unavailable =
                    isOutOfStock(
                      product
                    );

                  const adding =
                    addingProductId ===
                    product._id;

                  return (
                    <article
                      key={
                        item._id
                      }
                      className="group"
                    >

                      {/* =================================================
                          IMAGE
                          ================================================= */}

                      <div className="relative aspect-[0.78] overflow-hidden border border-[#222] bg-black">

                        <button
                          type="button"
                          onClick={() =>
                            openProduct(
                              product._id
                            )
                          }
                          className="absolute inset-0 z-10 cursor-pointer"
                          aria-label={`View ${product.name}`}
                        />

                        {image ? (
                          <img
                            src={image}
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-semibold uppercase text-[#555]">
                            No Image
                          </div>
                        )}

                        {/* REMOVE */}

                        <button
                          type="button"
                          aria-label="Remove from wishlist"
                          onClick={() =>
                            handleRemove(
                              product._id
                            )
                          }
                          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#e9002d] text-xl text-white shadow-sm transition hover:bg-white hover:text-black"
                        >
                          ♥
                        </button>

                      </div>

                      {/* =================================================
                          DETAILS
                          ================================================= */}

                      <div className="mt-5">

                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#e9002d]">
                          {
                            product.anime
                          }
                        </p>

                        <h3
                          onClick={() =>
                            openProduct(
                              product._id
                            )
                          }
                          className="mt-2 min-h-[44px] cursor-pointer text-[13px] font-semibold uppercase leading-5 text-white transition hover:text-[#e9002d]"
                        >
                          {
                            product.name
                          }
                        </h3>

                        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#666]">
                          {product
                            .category
                            ?.name ||
                            "T-Shirts"}
                        </p>

                        <div className="mt-3 flex items-center gap-3">

                          <span className="text-[14px] font-bold text-white">
                            ₹
                            {Number(
                              price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>

                        </div>

                        {/* =================================================
                            ADD TO CART
                            ================================================= */}

                        <button
                          type="button"
                          disabled={
                            unavailable ||
                            adding
                          }
                          onClick={() =>
                            handleAddToCart(
                              product
                            )
                          }
                          className="mt-5 flex h-11 w-full items-center justify-center bg-[#e9002d] text-[9px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:bg-[#222] disabled:text-[#555]"
                        >
                          {adding
                            ? "ADDING..."
                            : unavailable
                            ? "OUT OF STOCK"
                            : "ADD TO CART"}
                        </button>

                        {/* VIEW DETAILS */}

                        <button
                          type="button"
                          onClick={() =>
                            openProduct(
                              product._id
                            )
                          }
                          className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#555] transition hover:text-white"
                        >
                          VIEW DETAILS →
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

      </main>

    </div>
  );
};

export default WishlistPage;