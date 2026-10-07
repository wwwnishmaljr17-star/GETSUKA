import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import productApi from "../../products/api/productApi";

const CART_KEY = "getsukaCart";
const MAX_CART_QUANTITY = 5;

const CartPage = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [stockSyncing, setStockSyncing] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [coupon, setCoupon] = useState("");

  const [notification, setNotification] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "",
    index: null,
    itemName: "",
  });

  /* =========================================================
     LOAD CART
  ========================================================= */

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);

      const parsedCart = savedCart
        ? JSON.parse(savedCart)
        : [];

      const items = Array.isArray(parsedCart)
        ? parsedCart
        : [];

      setCartItems(items);

      if (items.length > 0) {
        syncCartStock(items);
      }
    } catch (error) {
      console.error("CART LOAD ERROR:", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     NORMALIZE VALUE
  ========================================================= */

  const normalizeValue = (value) => {
    if (
      value === undefined ||
      value === null
    ) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase();
  };

  /* =========================================================
     FIND CURRENT VARIANT
     
     Priority:
     1. Variant ID
     2. SKU
     3. Size + Color
  ========================================================= */

  const findMatchingVariant = (
    variants,
    item
  ) => {
    if (!Array.isArray(variants) || !item) {
      return null;
    }

    /* -------------------------------------------------------
       1. EXACT VARIANT ID
    ------------------------------------------------------- */

    if (item.variantId) {
      const byId = variants.find(
        (variant) =>
          String(variant?._id) ===
          String(item.variantId)
      );

      if (byId) {
        return byId;
      }
    }

    /* -------------------------------------------------------
       2. SKU
    ------------------------------------------------------- */

    if (item.sku) {
      const itemSku = normalizeValue(
        item.sku
      );

      const bySku = variants.find(
        (variant) =>
          normalizeValue(
            variant?.sku
          ) === itemSku
      );

      if (bySku) {
        return bySku;
      }
    }

    /* -------------------------------------------------------
       3. SIZE + COLOR
    ------------------------------------------------------- */

    const itemSize = normalizeValue(
      item.size
    );

    const itemColor = normalizeValue(
      item.color
    );

    if (itemSize && itemColor) {
      const bySizeAndColor =
        variants.find(
          (variant) =>
            normalizeValue(
              variant?.size
            ) === itemSize &&
            normalizeValue(
              variant?.color
            ) === itemColor
        );

      if (bySizeAndColor) {
        return bySizeAndColor;
      }
    }

    return null;
  };

  /* =========================================================
     CREATE SYNCED ITEM
  ========================================================= */

  const createSyncedItem = (
    item,
    product,
    selectedVariant
  ) => {
    const currentStock = Math.max(
      0,
      Number(
        selectedVariant?.stock || 0
      )
    );

    const currentQuantity = Math.max(
      1,
      Number(item?.quantity || 1)
    );

    const correctedQuantity =
      currentStock > 0
        ? Math.min(
            currentQuantity,
            currentStock,
            MAX_CART_QUANTITY
          )
        : currentQuantity;

    return {
      ...item,

      productId:
        item.productId ||
        product?._id,

      name:
        product?.name ??
        item.name,

      anime:
        product?.anime ??
        item.anime,

      image:
        item.image ||
        product?.images?.[0] ||
        "",

      price:
        product?.salePrice !== null &&
        product?.salePrice !==
          undefined
          ? Number(
              product.salePrice
            )
          : Number(
              product?.price ??
                item.price ??
                0
            ),

      variantId:
        selectedVariant?._id ??
        item.variantId,

      color:
        selectedVariant?.color ??
        item.color,

      size:
        selectedVariant?.size ??
        item.size,

      sku:
        selectedVariant?.sku ??
        item.sku,

      maxStock:
        currentStock,

      quantity:
        correctedQuantity,

      isAvailable:
        currentStock > 0,

      available:
        currentStock > 0,

      isOutOfStock:
        currentStock <= 0,

      stockSyncFailed:
        false,
    };
  };

  /* =========================================================
     LIVE STOCK SYNCHRONIZATION
  ========================================================= */

  const syncCartStock = async (
    items
  ) => {
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return;
    }

    setStockSyncing(true);

    try {
      const syncedItems =
        await Promise.all(
          items.map(
            async (item) => {
              try {
                if (
                  !item?.productId
                ) {
                  return {
                    ...item,
                    isAvailable:
                      false,
                    available:
                      false,
                    isOutOfStock:
                      true,
                    maxStock: 0,
                  };
                }

                const response =
                  await productApi.getProductById(
                    item.productId
                  );

                const product =
                  response?.product;

                if (!product) {
                  return {
                    ...item,
                    isAvailable:
                      false,
                    available:
                      false,
                    isOutOfStock:
                      true,
                    maxStock: 0,
                  };
                }

                const variants =
                  Array.isArray(
                    product.variants
                  )
                    ? product.variants
                    : [];

                const selectedVariant =
                  findMatchingVariant(
                    variants,
                    item
                  );

                if (
                  !selectedVariant
                ) {
                  return {
                    ...item,
                    isAvailable:
                      false,
                    available:
                      false,
                    isOutOfStock:
                      true,
                    maxStock: 0,
                    stockSyncFailed:
                      false,
                  };
                }

                return createSyncedItem(
                  item,
                  product,
                  selectedVariant
                );
              } catch (error) {
                console.error(
                  `STOCK SYNC ERROR FOR PRODUCT ${item?.productId}:`,
                  error
                );

                /*
                  Network/API failure is NOT treated as
                  genuine "out of stock".

                  Keep the existing item state but mark
                  verification as failed.
                */

                return {
                  ...item,
                  stockSyncFailed:
                    true,
                };
              }
            }
          )
        );

      setCartItems(
        syncedItems
      );

      localStorage.setItem(
        CART_KEY,
        JSON.stringify(
          syncedItems
        )
      );

      window.dispatchEvent(
        new Event("cartUpdated")
      );

      const stockChanged =
        syncedItems.some(
          (item, index) => {
            const oldItem =
              items[index];

            return (
              Number(
                oldItem?.maxStock ??
                  -1
              ) !==
                Number(
                  item?.maxStock ??
                    -1
                ) ||
              Number(
                oldItem?.quantity ??
                  0
              ) !==
                Number(
                  item?.quantity ??
                    0
                ) ||
              Boolean(
                oldItem?.isAvailable
              ) !==
                Boolean(
                  item?.isAvailable
                )
            );
          }
        );

      const nowUnavailable =
        syncedItems.some(
          (item) =>
            item?.isOutOfStock ===
              true ||
            Number(
              item?.maxStock ?? 0
            ) <= 0
        );

      if (
        stockChanged &&
        nowUnavailable
      ) {
        showNotification(
          "STOCK UPDATED",
          "One or more products in your cart are no longer available in the requested quantity.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "CART STOCK SYNC ERROR:",
        error
      );
    } finally {
      setStockSyncing(false);
    }
  };

  /* =========================================================
     NOTIFICATION
  ========================================================= */

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
    }, 3500);
  };

  /* =========================================================
     SAVE CART
  ========================================================= */

  const saveCart = (
    items
  ) => {
    setCartItems(items);

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new Event("cartUpdated")
    );
  };

  /* =========================================================
     CART COUNT
  ========================================================= */

  const totalItems = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item.quantity || 0
        ),
      0
    );
  }, [cartItems]);

  /* =========================================================
     CHECK ITEM AVAILABILITY
  ========================================================= */

  const isCartItemUnavailable =
    (item) => {
      if (!item) {
        return true;
      }

      /*
        If stock synchronization is currently
        being performed, don't permanently
        trust an old false flag.
      */

      if (
        item.stockSyncFailed ===
        true
      ) {
        return true;
      }

      if (
        item.isAvailable ===
          false ||
        item.available ===
          false ||
        item.isOutOfStock ===
          true
      ) {
        return true;
      }

      const maxStock =
        item.maxStock !==
          undefined &&
        item.maxStock !==
          null
          ? Number(
              item.maxStock
            )
          : 0;

      if (
        maxStock <= 0
      ) {
        return true;
      }

      if (
        Number(
          item.quantity || 0
        ) >
        maxStock
      ) {
        return true;
      }

      return false;
    };

  /* =========================================================
     UNAVAILABLE ITEMS
  ========================================================= */

  const unavailableCartItems =
    useMemo(() => {
      return cartItems.filter(
        (item) =>
          isCartItemUnavailable(
            item
          )
      );
    }, [cartItems]);

  /* =========================================================
     CHECKOUT AVAILABILITY
  ========================================================= */

  const canProceedToCheckout =
    cartItems.length > 0 &&
    !stockSyncing &&
    unavailableCartItems.length ===
      0;

  /* =========================================================
     SUBTOTAL
  ========================================================= */

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item.price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );
  }, [cartItems]);

  /* =========================================================
     SHIPPING
  ========================================================= */

  const shipping = 0;

  /* =========================================================
     TOTAL
  ========================================================= */

  const total =
    subtotal + shipping;

  /* =========================================================
     FORMAT PRICE
  ========================================================= */

  const formatPrice = (
    price
  ) => {
    return `₹${Number(
      price || 0
    ).toLocaleString(
      "en-IN"
    )}`;
  };

  /* =========================================================
     INCREASE QUANTITY
     LIVE STOCK CHECK
  ========================================================= */

  const increaseQuantity =
    async (index) => {
      const item =
        cartItems[index];

      if (!item) {
        return;
      }

      try {
        if (
          !item.productId
        ) {
          showNotification(
            "PRODUCT UNAVAILABLE",
            "This product could not be verified.",
            "error"
          );

          return;
        }

        const response =
          await productApi.getProductById(
            item.productId
          );

        const product =
          response?.product;

        const variants =
          Array.isArray(
            product?.variants
          )
            ? product.variants
            : [];

        const selectedVariant =
          findMatchingVariant(
            variants,
            item
          );

        if (
          !selectedVariant
        ) {
          const updatedCart =
            [...cartItems];

          updatedCart[index] = {
            ...item,
            maxStock: 0,
            isAvailable:
              false,
            available:
              false,
            isOutOfStock:
              true,
          };

          saveCart(
            updatedCart
          );

          showNotification(
            "OUT OF STOCK",
            "This selected variant is no longer available.",
            "error"
          );

          return;
        }

        const currentStock =
          Math.max(
            0,
            Number(
              selectedVariant.stock ||
                0
            )
          );

        const currentQuantity =
          Number(
            item.quantity || 1
          );

        const updatedItem =
          createSyncedItem(
            item,
            product,
            selectedVariant
          );

        if (
          currentStock <= 0
        ) {
          const updatedCart =
            [...cartItems];

          updatedCart[index] = {
            ...updatedItem,
            quantity:
              currentQuantity,
          };

          saveCart(
            updatedCart
          );

          showNotification(
            "OUT OF STOCK",
            "This selected variant is currently out of stock.",
            "error"
          );

          return;
        }

        if (
          currentQuantity >=
          MAX_CART_QUANTITY
        ) {
          const updatedCart =
            [...cartItems];

          updatedCart[index] = {
            ...updatedItem,
            quantity:
              MAX_CART_QUANTITY,
          };

          saveCart(
            updatedCart
          );

          showNotification(
            "MAXIMUM QUANTITY REACHED",
            `You can add a maximum of ${MAX_CART_QUANTITY} items of the same variant to your cart.`,
            "error"
          );

          return;
        }

        if (
          currentQuantity >=
          currentStock
        ) {
          const updatedCart =
            [...cartItems];

          updatedCart[index] = {
            ...updatedItem,
            quantity:
              currentStock,
          };

          saveCart(
            updatedCart
          );

          showNotification(
            "STOCK LIMIT REACHED",
            `Only ${currentStock} item${
              currentStock > 1
                ? "s"
                : ""
            } available for this variant.`,
            "error"
          );

          return;
        }

        const updatedCart =
          [...cartItems];

        updatedCart[index] = {
          ...updatedItem,
          quantity:
            currentQuantity +
            1,
        };

        saveCart(
          updatedCart
        );
      } catch (error) {
        console.error(
          "INCREASE QUANTITY STOCK CHECK ERROR:",
          error
        );

        showNotification(
          "STOCK CHECK FAILED",
          "Unable to verify the latest stock. Please try again.",
          "error"
        );
      }
    };

  /* =========================================================
     DECREASE QUANTITY
  ========================================================= */

  const decreaseQuantity =
    (index) => {
      const updatedCart =
        [...cartItems];

      const item =
        updatedCart[index];

      if (!item) {
        return;
      }

      const currentQuantity =
        Number(
          item.quantity || 1
        );

      if (
        currentQuantity <=
        1
      ) {
        return;
      }

      updatedCart[index] = {
        ...item,
        quantity:
          currentQuantity -
          1,
      };

      saveCart(
        updatedCart
      );
    };

  /* =========================================================
     REMOVE MODAL
  ========================================================= */

  const openRemoveModal =
    (index) => {
      const item =
        cartItems[index];

      setConfirmModal({
        open: true,
        type: "remove",
        index,
        itemName:
          item?.name ||
          "this product",
      });
    };

  /* =========================================================
     CLEAR CART MODAL
  ========================================================= */

  const openClearCartModal =
    () => {
      if (
        cartItems.length ===
        0
      ) {
        return;
      }

      setConfirmModal({
        open: true,
        type: "clear",
        index: null,
        itemName: "",
      });
    };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeConfirmModal =
    () => {
      setConfirmModal({
        open: false,
        type: "",
        index: null,
        itemName: "",
      });
    };

  /* =========================================================
     CONFIRM ACTION
  ========================================================= */

  const confirmAction =
    () => {
      if (
        confirmModal.type ===
        "remove"
      ) {
        const index =
          confirmModal.index;

        const item =
          cartItems[index];

        const updatedCart =
          cartItems.filter(
            (_, itemIndex) =>
              itemIndex !==
              index
          );

        saveCart(
          updatedCart
        );

        showNotification(
          "REMOVED FROM CART",
          `${
            item?.name ||
            "Item"
          } has been removed from your cart.`,
          "success"
        );
      }

      if (
        confirmModal.type ===
        "clear"
      ) {
        saveCart([]);

        showNotification(
          "CART CLEARED",
          "All products have been removed from your cart.",
          "success"
        );
      }

      closeConfirmModal();
    };

  /* =========================================================
     COUPON
  ========================================================= */

  const applyCoupon =
    () => {
      if (
        !coupon.trim()
      ) {
        showNotification(
          "COUPON CODE REQUIRED",
          "Enter a coupon code before applying.",
          "error"
        );

        return;
      }

      showNotification(
        "COUPONS ARE AVAILABLE AT CHECKOUT",
        "Apply your GETSUKA coupon during checkout.",
        "info"
      );
    };

  /* =========================================================
     CHECKOUT
     FINAL LIVE STOCK VALIDATION
  ========================================================= */

  const handleCheckout =
    async () => {
      if (
        cartItems.length ===
        0
      ) {
        return;
      }

      setStockSyncing(true);

      try {
        const latestItems =
          await Promise.all(
            cartItems.map(
              async (item) => {
                try {
                  const response =
                    await productApi.getProductById(
                      item.productId
                    );

                  const product =
                    response?.product;

                  if (!product) {
                    return {
                      ...item,
                      maxStock: 0,
                      isAvailable:
                        false,
                      available:
                        false,
                      isOutOfStock:
                        true,
                    };
                  }

                  const variants =
                    Array.isArray(
                      product.variants
                    )
                      ? product.variants
                      : [];

                  const variant =
                    findMatchingVariant(
                      variants,
                      item
                    );

                  if (!variant) {
                    return {
                      ...item,
                      maxStock: 0,
                      isAvailable:
                        false,
                      available:
                        false,
                      isOutOfStock:
                        true,
                    };
                  }

                  return createSyncedItem(
                    item,
                    product,
                    variant
                  );
                } catch (error) {
                  console.error(
                    "FINAL STOCK CHECK ERROR:",
                    error
                  );

                  return {
                    ...item,
                    stockSyncFailed:
                      true,
                  };
                }
              }
            )
          );

        setCartItems(
          latestItems
        );

        localStorage.setItem(
          CART_KEY,
          JSON.stringify(
            latestItems
          )
        );

        window.dispatchEvent(
          new Event(
            "cartUpdated"
          )
        );

        const invalidItems =
          latestItems.filter(
            (item) =>
              item?.stockSyncFailed ===
                true ||
              Number(
                item?.maxStock ||
                  0
              ) <= 0 ||
              Number(
                item?.quantity ||
                  0
              ) >
                Number(
                  item?.maxStock ||
                    0
                ) ||
              item?.isAvailable ===
                false ||
              item?.isOutOfStock ===
                true
          );

        if (
          invalidItems.length >
          0
        ) {
          showNotification(
            "CHECKOUT UNAVAILABLE",
            "Stock changed for one or more products. Please review your cart before continuing.",
            "error"
          );

          return;
        }

        navigate(
          "/checkout"
        );
      } catch (error) {
        console.error(
          "CHECKOUT STOCK VALIDATION ERROR:",
          error
        );

        showNotification(
          "CHECKOUT UNAVAILABLE",
          "Unable to verify product availability. Please try again.",
          "error"
        );
      } finally {
        setStockSyncing(
          false
        );
      }
    };

  /* =========================================================
     LOAD RELATED PRODUCTS
  ========================================================= */

  useEffect(() => {
    const loadRelatedProducts =
      async () => {
        try {
          setRelatedLoading(
            true
          );

          const response =
            await productApi.getProducts(
              {
                page: 1,
                limit: 8,
                sort: "newest",
              }
            );

          const products =
            Array.isArray(
              response?.products
            )
              ? response.products
              : [];

          const cartProductIds =
            cartItems.map(
              (item) =>
                item.productId
            );

          const filtered =
            products
              .filter(
                (product) =>
                  !cartProductIds.includes(
                    product._id
                  )
              )
              .slice(0, 4);

          setRelatedProducts(
            filtered
          );
        } catch (error) {
          console.error(
            "RELATED PRODUCTS ERROR:",
            error
          );

          setRelatedProducts(
            []
          );
        } finally {
          setRelatedLoading(
            false
          );
        }
      };

    loadRelatedProducts();
  }, [cartItems]);

  /* =========================================================
     OPEN PRODUCT
  ========================================================= */

  const openProduct =
    (productId) => {
      navigate(
        `/products/${productId}`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[2px] border-[#333] border-t-[#e9002d]" />

          <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.25em] text-[#777]">
            Loading your cart
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     EMPTY CART
  ========================================================= */

  if (
    cartItems.length ===
    0
  ) {
    return (
      <div className="min-h-screen bg-black text-white">
        <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 md:px-10 lg:px-14 lg:pt-16">
          <div className="flex items-end justify-between border-b border-[#222] pb-7">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#777]">
                GETSUKA / SHOPPING
              </p>

              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] md:text-6xl">
                YOUR CART
              </h1>
            </div>

            <p className="pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#777]">
              00 ITEMS
            </p>
          </div>

          <div className="relative flex min-h-[560px] flex-col items-center justify-center overflow-hidden text-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="select-none text-[180px] font-black tracking-[-0.12em] text-white/[0.025] md:text-[280px]">
                00
              </span>
            </div>

            <div className="relative z-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#333]">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 7h12l1 13H5L6 7Z" />
                  <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>
              </div>

              <p className="mt-8 text-[9px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                NOTHING HERE YET
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] md:text-3xl">
                YOUR CART IS EMPTY
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#777]">
                Your next anime fit is
                waiting. Explore the
                GETSUKA collection and
                find something worthy of
                your wardrobe.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/shop"
                  )
                }
                className="group mt-9 inline-flex items-center gap-5 bg-[#e9002d] px-8 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black"
              >
                CONTINUE SHOPPING

                <span className="transition-transform group-hover:translate-x-2">
                  →
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================================
     MAIN CART
  ========================================================= */

  return (
    <div className="min-h-screen bg-black text-white">

      {/* =====================================================
          NOTIFICATION
      ===================================================== */}

      {notification && (
        <div className="fixed right-5 top-5 z-[100] w-[380px] max-w-[calc(100vw-40px)]">
          <div
            className={`border bg-[#080808] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
              notification.type ===
              "error"
                ? "border-[#e9002d]"
                : notification.type ===
                  "info"
                ? "border-[#444]"
                : "border-[#333]"
            }`}
          >
            <div className="flex gap-4">
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
                  <span className="text-sm">
                    ✓
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#e9002d]">
                  {notification.title}
                </p>

                <p className="mt-2 text-xs leading-5 text-[#aaa]">
                  {notification.message}
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
          CONFIRM MODAL
      ===================================================== */}

      {confirmModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[430px] border border-[#333] bg-[#0b0b0b] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.6)] md:p-9">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                  GETSUKA
                </p>

                <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em]">
                  {confirmModal.type ===
                  "clear"
                    ? "CLEAR CART?"
                    : "REMOVE ITEM?"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeConfirmModal
                }
                className="text-2xl leading-none text-[#666] transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-7 border-l-2 border-[#e9002d] bg-[#111] px-4 py-4">
              <p className="text-xs leading-6 text-[#aaa]">
                {confirmModal.type ===
                "clear"
                  ? "This will remove every product currently in your cart."
                  : `Remove "${confirmModal.itemName}" from your cart?`}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={
                  closeConfirmModal
                }
                className="h-12 border border-[#333] text-[9px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={
                  confirmAction
                }
                className="h-12 bg-[#e9002d] text-[9px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black"
              >
                {confirmModal.type ===
                "clear"
                  ? "CLEAR CART"
                  : "REMOVE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 md:px-10 lg:px-14 lg:pt-14">

        {/* HEADER */}

        <header className="border-b border-[#222] pb-7">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-[#777]">
                GETSUKA / SHOPPING BAG
              </p>

              <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.06em] md:text-6xl">
                YOUR CART
              </h1>
            </div>

            <div className="pb-1 text-right">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777]">
                CART
              </p>

              <p className="mt-1 text-sm font-black uppercase">
                {String(
                  totalItems
                ).padStart(
                  2,
                  "0"
                )}{" "}
                {totalItems ===
                1
                  ? "ITEM"
                  : "ITEMS"}
              </p>
            </div>
          </div>
        </header>

        {/* UNAVAILABLE WARNING */}

        {!canProceedToCheckout &&
          !stockSyncing && (
            <div className="mt-7 border border-[#e9002d] bg-[#100305] px-5 py-5 md:px-7">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#e9002d] text-sm font-black text-white">
                  !
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#e9002d]">
                    CHECKOUT UNAVAILABLE
                  </p>

                  <p className="mt-2 text-xs leading-6 text-[#888]">
                    One or more products
                    in your cart are
                    currently out of
                    stock or unavailable.
                    Please remove the
                    unavailable item or
                    wait until it becomes
                    available before
                    proceeding to checkout.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* CART GRID */}

        <div className="mt-9 grid grid-cols-1 gap-10 xl:grid-cols-[1fr_380px]">

          {/* LEFT */}

          <section>

            {/* COLUMN LABELS */}

            <div className="hidden grid-cols-[1fr_130px_100px_110px] gap-5 border-b border-[#222] pb-4 text-[8px] font-bold uppercase tracking-[0.2em] text-[#777] md:grid">
              <span>
                PRODUCT
              </span>

              <span>
                QUANTITY
              </span>

              <span>
                PRICE
              </span>

              <span className="text-right">
                TOTAL
              </span>
            </div>

            {/* CART ITEMS */}

            <div>
              {cartItems.map(
                (
                  item,
                  index
                ) => {
                  const quantity =
                    Number(
                      item.quantity ||
                        1
                    );

                  const price =
                    Number(
                      item.price ||
                        0
                    );

                  const itemTotal =
                    price *
                    quantity;

                  const maxStock =
                    Number(
                      item.maxStock ??
                        0
                    );

                  const itemUnavailable =
                    isCartItemUnavailable(
                      item
                    );

                  const canIncrease =
                    !itemUnavailable &&
                    !stockSyncing &&
                    maxStock >
                      0 &&
                    quantity <
                      maxStock &&
                    quantity <
                      MAX_CART_QUANTITY;

                  return (
                    <article
                      key={`${item.productId}-${item.variantId}-${index}`}
                      className={`group relative border-b border-[#222] py-7 ${
                        itemUnavailable
                          ? "bg-[#050505]"
                          : ""
                      }`}
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_130px_100px_110px] md:items-center md:gap-5">

                        {/* PRODUCT */}

                        <div className="flex min-w-0 gap-5">

                          {/* IMAGE */}

                          <button
                            type="button"
                            onClick={() =>
                              openProduct(
                                item.productId
                              )
                            }
                            className="relative h-40 w-28 shrink-0 overflow-hidden bg-[#111] md:h-44 md:w-32"
                          >
                            {item.image ? (
                              <img
                                src={
                                  item.image
                                }
                                alt={
                                  item.name
                                }
                                className={`h-full w-full object-cover transition duration-700 ${
                                  itemUnavailable
                                    ? "opacity-40 grayscale"
                                    : "group-hover:scale-105"
                                }`}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[8px] font-bold uppercase text-[#666]">
                                NO IMAGE
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 bg-black/90 px-3 py-2 text-left opacity-0 transition group-hover:opacity-100">
                              <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-white">
                                VIEW PRODUCT →
                              </span>
                            </div>

                            {itemUnavailable && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                <span className="bg-[#e9002d] px-3 py-2 text-[7px] font-black uppercase tracking-[0.15em] text-white">
                                  OUT OF STOCK
                                </span>
                              </div>
                            )}
                          </button>

                          {/* INFO */}

                          <div className="min-w-0 pt-1">

                            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#e9002d]">
                              {
                                item.anime
                              }
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                openProduct(
                                  item.productId
                                )
                              }
                              className="mt-2 block max-w-[300px] text-left text-base font-black uppercase leading-5 tracking-[-0.02em] transition hover:text-[#e9002d]"
                            >
                              {
                                item.name
                              }
                            </button>

                            <div className="mt-4 space-y-1.5">

                              <p className="text-[9px] uppercase tracking-[0.08em] text-[#666]">
                                SIZE

                                <span className="ml-2 font-bold text-white">
                                  {
                                    item.size
                                  }
                                </span>
                              </p>

                              <p className="text-[9px] uppercase tracking-[0.08em] text-[#666]">
                                COLOR

                                <span className="ml-2 font-bold text-white">
                                  {
                                    item.color
                                  }
                                </span>
                              </p>

                              {item.sku && (
                                <p className="text-[9px] uppercase tracking-[0.08em] text-[#666]">
                                  SKU

                                  <span className="ml-2 font-bold text-white">
                                    {
                                      item.sku
                                    }
                                  </span>
                                </p>
                              )}

                            </div>

                            {itemUnavailable && (
                              <p className="mt-4 text-[8px] font-black uppercase tracking-[0.15em] text-[#e9002d]">
                                CURRENTLY UNAVAILABLE
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openRemoveModal(
                                  index
                                )
                              }
                              className="mt-5 text-[8px] font-bold uppercase tracking-[0.18em] text-[#e9002d] transition hover:text-white"
                            >
                              REMOVE ITEM
                            </button>

                          </div>
                        </div>

                        {/* QUANTITY */}

                        <div>
                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#666] md:hidden">
                            QUANTITY
                          </p>

                          <div className="flex w-fit items-center border border-[#333]">

                            <button
                              type="button"
                              disabled={
                                quantity <=
                                1
                              }
                              onClick={() =>
                                decreaseQuantity(
                                  index
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center text-lg transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:text-[#333]"
                            >
                              −
                            </button>

                            <span className="flex h-10 w-11 items-center justify-center border-x border-[#333] text-xs font-bold">
                              {
                                quantity
                              }
                            </span>

                            <button
                              type="button"
                              disabled={
                                !canIncrease
                              }
                              onClick={() =>
                                increaseQuantity(
                                  index
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center text-lg transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:text-[#333]"
                            >
                              +
                            </button>

                          </div>

                          {maxStock >
                            0 &&
                            !itemUnavailable && (
                              <p className="mt-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#666]">
                                {
                                  maxStock
                                }{" "}
                                available
                              </p>
                            )}

                          {maxStock <=
                            0 && (
                            <p className="mt-2 text-[8px] font-black uppercase tracking-[0.08em] text-[#e9002d]">
                              OUT OF STOCK
                            </p>
                          )}

                          {itemUnavailable &&
                            maxStock >
                              0 && (
                              <p className="mt-2 text-[8px] font-black uppercase tracking-[0.08em] text-[#e9002d]">
                                CHECK AVAILABILITY
                              </p>
                            )}
                        </div>

                        {/* PRICE */}

                        <div>
                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#666] md:hidden">
                            PRICE
                          </p>

                          <p
                            className={`text-sm font-semibold ${
                              itemUnavailable
                                ? "text-[#555]"
                                : ""
                            }`}
                          >
                            {formatPrice(
                              price
                            )}
                          </p>
                        </div>

                        {/* TOTAL */}

                        <div className="md:text-right">
                          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.18em] text-[#666] md:hidden">
                            TOTAL
                          </p>

                          <p
                            className={`text-sm font-black ${
                              itemUnavailable
                                ? "text-[#555]"
                                : ""
                            }`}
                          >
                            {formatPrice(
                              itemTotal
                            )}
                          </p>
                        </div>

                      </div>
                    </article>
                  );
                }
              )}
            </div>

            {/* CART ACTIONS */}

            <div className="flex flex-col justify-between gap-5 border-b border-[#222] py-6 sm:flex-row sm:items-center">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/shop"
                  )
                }
                className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#777] transition hover:text-white"
              >
                <span className="transition-transform group-hover:-translate-x-1">
                  ←
                </span>

                CONTINUE SHOPPING
              </button>

              <button
                type="button"
                onClick={
                  openClearCartModal
                }
                className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#e9002d] transition hover:text-white"
              >
                CLEAR CART
              </button>

            </div>
          </section>

          {/* SUMMARY */}

          <aside className="h-fit xl:sticky xl:top-8">
            <div className="border border-[#222] bg-[#050505]">

              {/* SUMMARY HEADER */}

              <div className="flex items-center justify-between border-b border-[#222] px-7 py-6">

                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#777]">
                    GETSUKA
                  </p>

                  <h2 className="mt-2 text-xl font-black uppercase tracking-[-0.03em]">
                    ORDER SUMMARY
                  </h2>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                  {
                    totalItems
                  }
                </span>

              </div>

              <div className="px-7 py-7">

                {/* SUBTOTAL */}

                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777]">
                    SUBTOTAL
                  </span>

                  <span className="text-sm font-bold">
                    {formatPrice(
                      subtotal
                    )}
                  </span>
                </div>

                {/* SHIPPING */}

                <div className="mt-5 flex items-start justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#777]">
                    SHIPPING
                  </span>

                  <span className="max-w-[140px] text-right text-[8px] font-semibold uppercase leading-4 text-[#777]">
                    Calculated at checkout
                  </span>
                </div>

                <div className="my-7 border-t border-[#222]" />

                {/* TOTAL */}

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#777]">
                      TOTAL
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.08em] text-[#555]">
                      Taxes calculated at checkout
                    </p>
                  </div>

                  <span className="text-2xl font-black tracking-[-0.04em]">
                    {formatPrice(
                      total
                    )}
                  </span>
                </div>

                {/* CHECKOUT */}

                <button
                  type="button"
                  onClick={
                    handleCheckout
                  }
                  disabled={
                    !canProceedToCheckout
                  }
                  className={`group mt-7 flex h-14 w-full items-center justify-between px-5 text-[9px] font-bold uppercase tracking-[0.18em] text-white transition ${
                    canProceedToCheckout
                      ? "bg-[#e9002d] hover:bg-white hover:text-black"
                      : "cursor-not-allowed bg-[#222] text-[#555]"
                  }`}
                >
                  <span>
                    {stockSyncing
                      ? "VERIFYING STOCK"
                      : canProceedToCheckout
                      ? "PROCEED TO CHECKOUT"
                      : "CHECKOUT UNAVAILABLE"}
                  </span>

                  <span
                    className={
                      canProceedToCheckout
                        ? "text-base transition-transform group-hover:translate-x-1"
                        : "text-base"
                    }
                  >
                    →
                  </span>
                </button>

                {!canProceedToCheckout &&
                  !stockSyncing && (
                    <p className="mt-3 text-center text-[8px] font-bold uppercase leading-4 tracking-[0.08em] text-[#e9002d]">
                      REMOVE UNAVAILABLE
                      ITEMS TO CONTINUE
                    </p>
                  )}

                {/* COUPON */}

                <div className="mt-8">
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#555]">
                    HAVE A PROMO CODE?
                  </p>

                  <div className="mt-3 flex">

                    <input
                      type="text"
                      value={
                        coupon
                      }
                      onChange={(
                        event
                      ) =>
                        setCoupon(
                          event.target.value
                        )
                      }
                      placeholder="ENTER CODE"
                      className="min-w-0 flex-1 border border-[#333] bg-black px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-white outline-none placeholder:text-[#444] focus:border-white"
                    />

                    <button
                      type="button"
                      onClick={
                        applyCoupon
                      }
                      className="border border-l-0 border-[#333] bg-black px-5 text-[8px] font-bold uppercase tracking-[0.12em] transition hover:bg-white hover:text-black"
                    >
                      APPLY
                    </button>

                  </div>
                </div>

                {/* SECURITY */}

                <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#222] pt-5">

                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="1"
                    />

                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>

                  <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#555]">
                    SECURE CHECKOUT
                  </span>

                </div>

              </div>
            </div>
          </aside>
        </div>

        {/* DISCOVER MORE */}

        <section className="mt-20 border-t border-[#222] pt-12">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-[#e9002d]">
                KEEP EXPLORING
              </p>

              <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em] md:text-3xl">
                ITEMS YOU MAY HAVE MISSED
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/shop"
                )
              }
              className="group flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.18em] text-[#777] transition hover:text-white"
            >
              VIEW ALL

              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>

          </div>

          {/* RELATED LOADING */}

          {relatedLoading ? (
            <div className="mt-9 flex h-64 items-center justify-center border border-[#222]">
              <div className="text-center">

                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#333] border-t-[#e9002d]" />

                <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.2em] text-[#666]">
                  Loading collection
                </p>

              </div>
            </div>
          ) : relatedProducts.length >
            0 ? (
            <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">

              {relatedProducts.map(
                (item) => {
                  const finalPrice =
                    item.salePrice ??
                    item.price;

                  const hasSale =
                    item.salePrice &&
                    Number(
                      item.salePrice
                    ) <
                      Number(
                        item.price
                      );

                  return (
                    <button
                      key={
                        item._id
                      }
                      type="button"
                      onClick={() =>
                        openProduct(
                          item._id
                        )
                      }
                      className="group text-left"
                    >

                      {/* IMAGE */}

                      <div className="relative aspect-[0.8] overflow-hidden bg-[#111]">

                        {item
                          .images?.[0] ? (
                          <img
                            src={
                              item.images[0]
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] font-bold uppercase text-[#555]">
                            NO IMAGE
                          </div>
                        )}

                        {hasSale && (
                          <span className="absolute left-3 top-3 bg-[#e9002d] px-3 py-2 text-[7px] font-bold uppercase tracking-[0.12em] text-white">
                            SALE
                          </span>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 translate-y-full bg-black px-4 py-3 transition-transform duration-300 group-hover:translate-y-0">
                          <p className="text-center text-[8px] font-bold uppercase tracking-[0.15em] text-white">
                            VIEW PRODUCT →
                          </p>
                        </div>

                      </div>

                      {/* INFO */}

                      <div className="pt-4">

                        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#e9002d]">
                          {
                            item.anime
                          }
                        </p>

                        <h3 className="mt-2 truncate text-[11px] font-black uppercase tracking-[-0.01em]">
                          {
                            item.name
                          }
                        </h3>

                        <div className="mt-2 flex items-center gap-2">

                          <span className="text-[11px] font-bold">
                            {formatPrice(
                              finalPrice
                            )}
                          </span>

                          {hasSale && (
                            <span className="text-[9px] text-[#666] line-through">
                              {formatPrice(
                                item.price
                              )}
                            </span>
                          )}

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          ) : (
            <div className="mt-9 border border-[#222] p-14 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#555]">
                MORE PRODUCTS COMING SOON
              </p>
            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default CartPage;